# backend/courses/views_evaluaciones.py
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings
from django.db.models import Max
import json
import traceback
import random

from .models import (
    Recurso,
    EvaluacionAdaptativa,
    ResultadoEvaluacion,
    RecursoRecomendado,
    EvolucionEstudiante,
)

# Importar Google Gemini (lib vieja; si falla, usamos fallback)
try:
    import google.generativeai as genai
    GEMINI_DISPONIBLE = True
except ImportError:
    GEMINI_DISPONIBLE = False
    print("⚠️ WARNING: google.generativeai no está instalado")


# ====================================================================
# UTILIDADES
# ====================================================================

def calcular_nivel_atencion(user):
    from evaluaciones.models import SesionAtencion

    sesiones = SesionAtencion.objects.filter(estudiante=user).order_by("-fecha")[:5]

    if not sesiones:
        return "media", 50.0

    promedio = sum(float(s.porcentaje_atencion) for s in sesiones) / len(sesiones)

    if promedio >= 75:
        nivel = "alta"
    elif promedio >= 50:
        nivel = "media"
    else:
        nivel = "baja"

    return nivel, round(float(promedio), 2)



def obtener_contexto_d2r(user):
    contexto_d2r = {}
    try:
        from evaluaciones.models import ResultadoD2R
        ultimo = ResultadoD2R.objects.filter(estudiante=user).order_by("-fecha").first()
        if ultimo:
            contexto_d2r = {
                "con": ultimo.con,
                "tot": ultimo.tot,
                "var": ultimo.var,
                "tr_total": ultimo.tr_total,
                "ta_total": ultimo.ta_total,
                "eo_total": ultimo.eo_total,
                "ec_total": ultimo.ec_total,
                "fecha": ultimo.fecha.isoformat(),
            }
    except Exception:
        contexto_d2r = {}

    return contexto_d2r


def _strip_code_fences(texto: str) -> str:
    if not texto:
        return ""
    t = texto.strip()
    if t.startswith("```"):
        t = t.replace("```json", "").replace("```JSON", "").replace("```", "").strip()
    return t


def _extraer_json_de_texto(texto: str) -> str | None:
    if not texto:
        return None

    t = _strip_code_fences(texto).strip()

    if t.startswith("{") and t.endswith("}"):
        return t

    i = t.find("{")
    j = t.rfind("}")
    if i != -1 and j != -1 and j > i:
        return t[i:j + 1]

    return None


def normalizar_respuesta_correcta(valor):
    if valor is None:
        return None

    v = str(valor).strip()

    if v.isdigit():
        idx = int(v)
        if 0 <= idx <= 3:
            return chr(65 + idx)
        return None

    v = v.upper()
    if v in ["A", "B", "C", "D"]:
        return v

    if len(v) >= 1 and v[0] in ["A", "B", "C", "D"]:
        return v[0]

    return None


def _normalizar_opciones(opciones):
    """
    Acepta opciones con prefijo "A) ..." y devuelve solo el texto.
    """
    if not isinstance(opciones, list):
        return []

    out = []
    for opt in opciones:
        s = str(opt).strip()
        if len(s) >= 3 and s[0] in "ABCD" and s[1] in [")", "."] and s[2] == " ":
            s = s[3:].strip()
        out.append(s)
    return out


def generar_preguntas_fallback(recurso, dificultad, num_preguntas):
    """
    Fallback mejorado: genera preguntas distintas y opciones coherentes.
    """
    tema = recurso.titulo

    plantillas = [
        f"¿Cuál afirmación describe mejor {tema}?",
        f"¿Qué opción es correcta sobre {tema}?",
        f"¿Cuál es un ejemplo típico de {tema}?",
        f"¿Qué concepto se relaciona directamente con {tema}?",
        f"Si aplicas {tema}, ¿qué resultado esperas?",
        f"¿Qué error es común al trabajar con {tema}?",
        f"¿Qué ventaja principal tiene {tema}?",
        f"¿Qué paso es recomendable en {tema}?",
    ]

    banco_por_dificultad = {
        "Fácil": [
            "Definición básica correcta",
            "Concepto relacionado pero incorrecto",
            "Ejemplo fuera de contexto",
            "Afirmación demasiado general",
        ],
        "Medio": [
            "Explicación correcta con detalle",
            "Confusión común (casi correcta)",
            "Opción correcta pero incompleta",
            "Opción que mezcla dos conceptos",
        ],
        "Difícil": [
            "Respuesta correcta con precisión",
            "Trampa técnica frecuente",
            "Opción plausible pero incorrecta",
            "Opción que aplica a otro caso",
        ],
    }

    base = banco_por_dificultad.get(dificultad, banco_por_dificultad["Fácil"])

    preguntas = []
    usados = set()

    for i in range(int(num_preguntas)):
        plantilla = plantillas[i % len(plantillas)]
        texto_pregunta = f"{plantilla} (#{i+1})"
        while texto_pregunta in usados:
            texto_pregunta = f"{plantilla} ({random.randint(10, 999)})"
        usados.add(texto_pregunta)

        correcta_texto = base[0]
        distractores = base[1:]

        # seguro: si algún día cambia el banco y hay menos distractores
        while len(distractores) < 3:
            distractores.append(f"Distractor adicional {random.randint(100,999)}")

        opciones = [correcta_texto] + random.sample(distractores, 3)
        random.shuffle(opciones)

        idx_correcta = opciones.index(correcta_texto)
        letra_correcta = chr(65 + idx_correcta)

        preguntas.append({
            "pregunta": texto_pregunta,
            "opciones": opciones,   # sin "A) " para que el frontend no duplique letras
            "correcta": letra_correcta,
        })

    return preguntas, "Evaluación generada automáticamente (modo sin IA)."


def generar_preguntas_ia(recurso, dificultad, num_preguntas):
    """
    Genera preguntas usando Gemini (modelo disponible en tu cuenta).
    Reintenta 2 veces antes de fallback.
    """
    if not GEMINI_DISPONIBLE:
        return generar_preguntas_fallback(recurso, dificultad, num_preguntas)

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        print("⚠️ GOOGLE_API_KEY vacía: usando fallback")
        return generar_preguntas_fallback(recurso, dificultad, num_preguntas)

    genai.configure(api_key=api_key)

    # ✅ MODELO CORRECTO segun tu list_models()
    model = genai.GenerativeModel("models/gemini-2.5-flash")

    prompt = f"""
Eres un profesor experto.

Genera EXACTAMENTE {num_preguntas} preguntas DIFERENTES (no repitas).
Tema: {recurso.titulo}
Dificultad: {dificultad}

REGLAS:
- Cada pregunta debe ser única.
- 4 opciones por pregunta.
- "correcta" SOLO una letra: "A", "B", "C" o "D".
- En "opciones" NO pongas "A) ..." ni "B) ...". Solo el texto.

Devuelve SOLO JSON válido, sin markdown, sin texto adicional:
{{
  "mensaje": "Mensaje motivador breve",
  "preguntas": [
    {{
      "pregunta": "Texto de pregunta",
      "opciones": ["op1", "op2", "op3", "op4"],
      "correcta": "A"
    }}
  ]
}}
"""

    for intento in range(1, 3):
        try:
            response = model.generate_content(prompt)

            texto_raw = (getattr(response, "text", "") or "").strip()
            json_txt = _extraer_json_de_texto(texto_raw)

            if not json_txt:
                print(f"❌ Gemini intento {intento}: no devolvió JSON. Preview:", texto_raw[:180])
                continue

            data = json.loads(json_txt)
            preguntas = data.get("preguntas", [])
            mensaje = (data.get("mensaje", "") or "").strip()

            if not isinstance(preguntas, list) or len(preguntas) != int(num_preguntas):
                print(f"❌ Gemini intento {intento}: cantidad incorrecta de preguntas.")
                continue

            letras_validas = {"A", "B", "C", "D"}
            preguntas_ok = []
            textos = []

            for p in preguntas:
                if not isinstance(p, dict):
                    continue

                pregunta = str(p.get("pregunta", "")).strip()
                opciones = _normalizar_opciones(p.get("opciones", []))
                correcta = normalizar_respuesta_correcta(p.get("correcta", "A"))

                if not pregunta or len(pregunta) < 8:
                    continue
                if not isinstance(opciones, list) or len(opciones) != 4:
                    continue
                if any((not o) for o in opciones):
                    continue
                if correcta not in letras_validas:
                    continue

                preguntas_ok.append({
                    "pregunta": pregunta,
                    "opciones": opciones,
                    "correcta": correcta,
                })
                textos.append(pregunta)

            if len(preguntas_ok) != int(num_preguntas):
                print(f"❌ Gemini intento {intento}: estructura inválida.")
                continue

            if len(set(textos)) != len(textos):
                print(f"❌ Gemini intento {intento}: preguntas repetidas.")
                continue

            # ✅ listo
            return preguntas_ok, (mensaje or "Evaluación generada por IA.")

        except Exception as e:
            print(f"❌ ERROR Gemini intento {intento}: {str(e)}")
            traceback.print_exc()

    return generar_preguntas_fallback(recurso, dificultad, num_preguntas)


def _intento_siguiente(user, evaluacion) -> int:
    max_intento = (
        ResultadoEvaluacion.objects.filter(estudiante=user, evaluacion=evaluacion)
        .aggregate(m=Max("intento_numero"))
        .get("m")
    )
    return int(max_intento or 0) + 1


def generar_recursos_recomendados_bd(estudiante, recurso, nivel_atencion):
    if nivel_atencion == "baja":
        cantidad = 8
    elif nivel_atencion == "media":
        cantidad = 5
    else:
        cantidad = 3

    lista_front = []
    for i in range(cantidad):
        rec_bd = RecursoRecomendado.objects.create(
            estudiante=estudiante,
            titulo=f"Refuerzo: {recurso.titulo} - Parte {i+1}",
            descripcion="Material de apoyo generado por tu resultado en la evaluación.",
            tipo="video",
            prioridad="alta" if i < 3 else "media",
            recurso_original=recurso,
            url="https://youtube.com",
        )

        lista_front.append({
            "id": rec_bd.id,
            "titulo": rec_bd.titulo,
            "tipo": rec_bd.tipo,
            "descripcion": rec_bd.descripcion,
            "prioridad": rec_bd.prioridad,
            "url": getattr(rec_bd, "url", None),
        })

    return lista_front


# ====================================================================
# ENDPOINT 1: GENERAR EVALUACIÓN ADAPTATIVA
# ====================================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generar_evaluacion_adaptativa(request):
    user = request.user
    recurso_id = request.data.get("recurso_id")

    try:
        if recurso_id:
            recurso = Recurso.objects.get(id=recurso_id)
        else:
            from evaluaciones.models import SesionAtencion
            ultima = SesionAtencion.objects.filter(estudiante=user).order_by("-fecha").first()

            if ultima and ultima.recurso:
                recurso = ultima.recurso
            else:
                recurso = Recurso.objects.first()

        if not recurso:
            return Response({"error": "No hay recursos disponibles"}, status=status.HTTP_404_NOT_FOUND)

        nivel_atencion, promedio_atencion = calcular_nivel_atencion(user)

        if nivel_atencion == "baja":
            dificultad = "Difícil"
            num_preguntas = 15
        elif nivel_atencion == "media":
            dificultad = "Medio"
            num_preguntas = 10
        else:
            dificultad = "Fácil"
            num_preguntas = 5

        preguntas_json, mensaje_ia = generar_preguntas_ia(recurso, dificultad, num_preguntas)

        if not preguntas_json:
            return Response({"error": "No se pudieron generar preguntas"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        contexto_d2r = obtener_contexto_d2r(user)
        contexto_atencion = {
            "nivel": nivel_atencion,
            "promedio": promedio_atencion,
            "mensaje": mensaje_ia,
        }

        evaluacion = EvaluacionAdaptativa.objects.create(
            recurso=recurso,
            nivel=dificultad,
            preguntas_json=preguntas_json,
            generada_para=user,
            contexto_d2r=contexto_d2r,
            contexto_atencion=contexto_atencion,
        )

        return Response({
            "success": True,
            "evaluacion": {
                "id": evaluacion.id,
                "nivel": evaluacion.nivel,
                "total_preguntas": len(evaluacion.preguntas_json or []),
                "preguntas": evaluacion.preguntas_json,
                "contexto_atencion": evaluacion.contexto_atencion,
                "recurso": {"id": recurso.id, "titulo": recurso.titulo, "tipo": recurso.tipo},
            },
        })

    except Recurso.DoesNotExist:
        return Response({"error": "Recurso no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ====================================================================
# ENDPOINT 2: ENVIAR RESPUESTAS
# ====================================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enviar_respuestas_evaluacion(request):
    user = request.user
    evaluacion_id = request.data.get("evaluacion_id")
    respuestas = request.data.get("respuestas", [])
    tiempo_invertido = request.data.get("tiempo_invertido", 0)

    try:
        if not evaluacion_id:
            return Response({"error": "evaluacion_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        evaluacion = EvaluacionAdaptativa.objects.get(id=evaluacion_id, generada_para=user)

        preguntas = evaluacion.preguntas_json or []
        total = len(preguntas)

        aciertos = 0
        for i, resp in enumerate(respuestas):
            if i >= total:
                break
            correcta = normalizar_respuesta_correcta(preguntas[i].get("correcta", "A"))
            enviada = normalizar_respuesta_correcta(resp)
            if correcta and enviada and correcta == enviada:
                aciertos += 1

        porcentaje = round((aciertos / total) * 100, 2) if total > 0 else 0.0
        aprobado = porcentaje >= 70

        intento = _intento_siguiente(user, evaluacion)

        ResultadoEvaluacion.objects.create(
            evaluacion=evaluacion,
            estudiante=user,
            respuestas_json=respuestas,
            puntaje=aciertos,
            tiempo_invertido=tiempo_invertido,
            analisis_ia=f"Puntaje: {aciertos}/{total} ({porcentaje}%). Aprobado: {aprobado}.",
            intento_numero=intento,
        )

        nivel_atencion = (evaluacion.contexto_atencion or {}).get("nivel", "media")

        recursos_rec = []
        if not aprobado:
            recursos_rec = generar_recursos_recomendados_bd(user, evaluacion.recurso, nivel_atencion)

        return Response({
            "success": True,
            "aprobado": aprobado,
            "aciertos": aciertos,
            "total": total,
            "porcentaje": porcentaje,
            "nivel_atencion": nivel_atencion,
            "intento_numero": intento,
            "recursos_recomendados": recursos_rec,
            "mensaje_ia": f"Obtuviste {porcentaje}%.",
        })

    except EvaluacionAdaptativa.DoesNotExist:
        return Response({"error": "Evaluación no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ====================================================================
# ENDPOINTS ADICIONALES
# ====================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_evaluaciones(request):
    user = request.user

    resultados = (
        ResultadoEvaluacion.objects.filter(estudiante=user)
        .select_related("evaluacion", "evaluacion__recurso")
        .order_by("fecha_realizacion")
    )

    evaluaciones = []
    for res in resultados:
        preguntas = (res.evaluacion.preguntas_json or []) if res.evaluacion else []
        total = len(preguntas)
        puntaje = int(res.puntaje or 0)
        porcentaje = round((puntaje / total) * 100, 2) if total > 0 else 0.0
        aprobado = porcentaje >= 70

        evaluaciones.append({
            "id": res.id,
            "fecha": res.fecha_realizacion.isoformat(),
            "puntaje": puntaje,
            "total": total,
            "porcentaje": porcentaje,
            "aprobado": aprobado,
            "tiempo_invertido": res.tiempo_invertido,
            "intento_numero": res.intento_numero,
            "evaluacion_id": res.evaluacion.id if res.evaluacion else None,
            "nivel": getattr(res.evaluacion, "nivel", None),
            "recurso": {
                "id": res.evaluacion.recurso.id if (res.evaluacion and res.evaluacion.recurso) else None,
                "titulo": res.evaluacion.recurso.titulo if (res.evaluacion and res.evaluacion.recurso) else None,
                "tipo": res.evaluacion.recurso.tipo if (res.evaluacion and res.evaluacion.recurso) else None,
            },
        })

    return Response({"success": True, "evaluaciones": evaluaciones})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recursos_recomendados(request):
    user = request.user

    recursos = (
        RecursoRecomendado.objects.filter(estudiante=user, visto=False)
        .order_by("-prioridad", "-fecha_recomendacion")[:10]
    )

    recursos_lista = []
    for rec in recursos:
        recursos_lista.append({
            "id": rec.id,
            "titulo": rec.titulo,
            "descripcion": rec.descripcion,
            "tipo": rec.tipo,
            "prioridad": rec.prioridad,
            "visto": rec.visto,
            "url": getattr(rec, "url", None),
            "tema": getattr(rec, "tema", None),
            "razon_recomendacion": getattr(rec, "razon_recomendacion", None),
        })

    nivel_atencion, promedio = calcular_nivel_atencion(user)

    return Response({
        "success": True,
        "nivel_atencion": nivel_atencion,
        "promedio_atencion": promedio,
        "recursos": recursos_lista,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def marcar_recurso_visto(request):
    user = request.user
    recurso_id = request.data.get("recurso_id")

    if not recurso_id:
        return Response({"error": "recurso_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rec = RecursoRecomendado.objects.get(id=recurso_id, estudiante=user)
        rec.visto = True
        rec.save()
        return Response({"success": True})
    except RecursoRecomendado.DoesNotExist:
        return Response({"error": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
