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
import threading
import time

from .models import (
    Recurso,
    EvaluacionAdaptativa,
    ResultadoEvaluacion,
    RecursoRecomendado,
    EvolucionEstudiante,
)

# Importar Google Gemini (API oficial nueva)
try:
    from google import genai
    api_key = getattr(settings, "GEMINI_API_KEY", None) or getattr(settings, "GOOGLE_API_KEY", None)
    client = genai.Client(api_key=api_key) if api_key else None
    GEMINI_DISPONIBLE = bool(client)
    if GEMINI_DISPONIBLE:
        print(f"[OK] Gemini disponible (views_evaluaciones)")
    else:
        print("[WARNING] No API key found for Gemini (views_evaluaciones)")
except Exception:
    GEMINI_DISPONIBLE = False
    client = None
    print("[WARNING]: google-genai no está disponible")


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

    # Intenta parsear directamente
    try:
        json.loads(t)
        return t
    except ValueError:
        pass

    # Buscar [...]
    i_list = t.find("[")
    j_list = t.rfind("]")

    if i_list != -1 and j_list != -1 and j_list > i_list:
        candidate = t[i_list:j_list + 1]
        try:
            json.loads(candidate)
            return candidate
        except ValueError:
            pass

    # Buscar {...}
    i_obj = t.find("{")
    j_obj = t.rfind("}")

    if i_obj != -1 and j_obj != -1 and j_obj > i_obj:
        candidate = t[i_obj:j_obj + 1]
        try:
            json.loads(candidate)
            return candidate
        except ValueError:
            pass

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
            "opciones": opciones,
            "correcta": letra_correcta,
        })

    return preguntas, "Evaluación generada automáticamente (modo sin IA)."


def generar_preguntas_ia(recurso, dificultad, num_preguntas, contexto_atencion=None, contexto_d2r=None):
    print(f"[GEMINI] generar_preguntas_ia CALLED. Disponible: {GEMINI_DISPONIBLE}")
    if not GEMINI_DISPONIBLE or not client:
        print("[GEMINI] No disponible en este entorno, usando fallback")
        return generar_preguntas_fallback(recurso, dificultad, num_preguntas)

    # Preparar contexto del estudiante para el prompt
    contexto_atencion = contexto_atencion or {}
    contexto_d2r = contexto_d2r or {}

    nivel_atencion = contexto_atencion.get("nivel", "desconocido")
    promedio_atencion = float(contexto_atencion.get("promedio", 0))

    con_d2r = contexto_d2r.get("con", "N/A")
    var_d2r = contexto_d2r.get("var", "N/A")

    # Construir contexto textual
    contexto_estudiante = f"""
PERFIL DEL ESTUDIANTE:
- Nivel de Atención en Videos: {nivel_atencion} ({promedio_atencion}% promedio)
- Capacidad de Concentración (Test D2R): {con_d2r}
- Variabilidad de Concentración: {var_d2r}
"""

    # Instrucciones adaptativas según el perfil
    instrucciones_adaptativas = ""
    if nivel_atencion == "baja" or promedio_atencion < 50:
        instrucciones_adaptativas = """
ADAPTACIÓN PARA BAJA ATENCIÓN:
- Usa preguntas claras, cortas y directas
- Evita enunciados largos o complejos
- Conceptos fundamentales, no detalles rebuscados
"""
    elif nivel_atencion == "alta" and promedio_atencion >= 75:
        instrucciones_adaptativas = """
ADAPTACIÓN PARA ALTA ATENCIÓN:
- Puedes incluir preguntas de análisis más profundo
- Casos prácticos o aplicación de conceptos
- Combinación de ideas, no solo definiciones
"""
    else:
        instrucciones_adaptativas = """
ADAPTACIÓN PARA ATENCIÓN MEDIA:
- Balance entre claridad y profundidad
- Mezcla de conceptos teóricos y aplicación práctica
"""

    prompt = f"""
Eres un profesor experto que personaliza evaluaciones según el rendimiento del estudiante.

TEMA: {recurso.titulo}
DIFICULTAD: {dificultad}
CANTIDAD: Genera EXACTAMENTE {num_preguntas} preguntas DIFERENTES (no repitas).

{contexto_estudiante}

{instrucciones_adaptativas}

REGLAS GENERALES:
- Cada pregunta debe ser única y relevante al tema
- 4 opciones por pregunta
- "correcta" SOLO una letra: "A", "B", "C" o "D"
- En "opciones" NO pongas "A) ..." ni "B) ...". Solo el texto
- Adapta el lenguaje y complejidad según el perfil del estudiante

Devuelve SOLO JSON válido, sin markdown, sin texto adicional:
{{
  "mensaje": "Mensaje motivador personalizado basado en el contexto del estudiante",
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
            print(f"[GEMINI] Intento {intento}: Iniciando llamada a Gemini...")
            inicio = time.time()

            try:
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
            except Exception as ex:
                print(f"[GEMINI] Error directo en la llamada de la API: {str(ex)}")
                raise ex

            duracion = round(time.time() - inicio, 2)
            print(f"[GEMINI] Respuesta recibida de Gemini ({duracion}s)")

            texto_raw = (response.text or "").strip()
            print(f"[GEMINI] Contenido respuesta: {texto_raw[:200]}")

            json_txt = _extraer_json_de_texto(texto_raw)

            if not json_txt:
                print(f"[GEMINI] Intento {intento}: no devolvio JSON valido. Preview: {texto_raw[:180]}")
                continue

            try:
                data = json.loads(json_txt)
            except json.JSONDecodeError as je:
                print(f"[GEMINI] Intento {intento}: ERROR parsing JSON: {je}")
                print(f"[GEMINI] JSON texto: {json_txt[:300]}")
                continue

            preguntas = data.get("preguntas", [])
            mensaje = (data.get("mensaje", "") or "").strip()

            if not isinstance(preguntas, list) or len(preguntas) != int(num_preguntas):
                print(f"[GEMINI] Intento {intento}: cantidad incorrecta ({len(preguntas) if isinstance(preguntas, list) else 'N/A'} vs {num_preguntas} esperadas)")
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
                print(f"[GEMINI] Intento {intento}: estructura invalida ({len(preguntas_ok)} validas de {num_preguntas})")
                continue

            if len(set(textos)) != len(textos):
                print(f"[GEMINI] Intento {intento}: preguntas repetidas")
                continue

            # Éxito
            mensaje_final = mensaje or "Evaluacion generada."
            if "(Sin IA)" not in mensaje_final and "(sin IA)" not in mensaje_final:
                mensaje_final = f"{mensaje_final} (Generada con IA - Gemini)"
            print(f"[GEMINI] EXITO: {len(preguntas_ok)} preguntas generadas en {duracion}s")
            return preguntas_ok, mensaje_final

        except Exception as e:
            print(f"[GEMINI] ERROR intento {intento}: {str(e)}")
            traceback.print_exc()

    print("[GEMINI] Todos los intentos fallaron, usando fallback")
    return generar_preguntas_fallback(recurso, dificultad, num_preguntas)


def _intento_siguiente(user, evaluacion) -> int:
    max_intento = (
        ResultadoEvaluacion.objects.filter(estudiante=user, evaluacion=evaluacion)
        .aggregate(m=Max("intento_numero"))
        .get("m")
    )
    return int(max_intento or 0) + 1


def generar_recursos_recomendados_fallback(estudiante, recurso, nivel_atencion):
    """
    Fallback: genera enlaces de búsqueda específicos en YouTube y Google.
    """
    if nivel_atencion == "baja":
        cantidad = 5
    elif nivel_atencion == "media":
        cantidad = 3
    else:
        cantidad = 2

    lista_front = []
    tema = recurso.titulo

    # Recursos con tipo y búsqueda diferenciada
    busquedas = [
        {"texto": f"Tutorial {tema}", "tipo": "video"},
        {"texto": f"Ejemplos practicos {tema}", "tipo": "video"},
        {"texto": f"Guia completa {tema}", "tipo": "articulo"},
        {"texto": f"Errores comunes en {tema}", "tipo": "video"},
        {"texto": f"Conceptos clave {tema}", "tipo": "articulo"},
    ]

    for i in range(cantidad):
        item = busquedas[i % len(busquedas)]
        query = item["texto"].replace(' ', '+')

        if item["tipo"] == "video":
            url_busqueda = f"https://www.youtube.com/results?search_query={query}"
        else:
            url_busqueda = f"https://www.google.com/search?q={query}"

        rec_bd = RecursoRecomendado.objects.create(
            estudiante=estudiante,
            titulo=f"Investigar: {item['texto']}",
            descripcion=f"Recurso de refuerzo sugerido sobre '{tema}'.",
            tipo=item["tipo"],
            prioridad="alta" if i < 2 else "media",
            recurso_original=recurso,
            url=url_busqueda,
            razon_recomendacion="Recomendacion automatica por sistema de respaldo."
        )

        lista_front.append({
            "id": rec_bd.id,
            "titulo": rec_bd.titulo,
            "tipo": rec_bd.tipo,
            "descripcion": rec_bd.descripcion,
            "prioridad": rec_bd.prioridad,
            "url": getattr(rec_bd, "url", None),
            "razon": rec_bd.razon_recomendacion
        })

    return lista_front


def generar_recursos_recomendados_ia(estudiante, recurso, nivel_atencion, puntaje_eval=0):
    """
    Genera recomendaciones reales usando Gemini con JSON estricto.
    """
    if not GEMINI_DISPONIBLE or not client:
        return generar_recursos_recomendados_fallback(estudiante, recurso, nivel_atencion)

    tema = recurso.titulo
    prompt = f"""
Eres un tutor experto. El estudiante acaba de finalizar una evaluación sobre: "{tema}".

CONTEXTO:
- Nivel de atención detectado: {nivel_atencion}
- Puntaje en evaluación: {puntaje_eval}%

TAREA:
Genera una lista de 5 recursos recomendados para reforzar el tema "{tema}".

REGLAS PARA URLs:
- Para videos: usa URLs de búsqueda en YouTube con el formato EXACTO:
  https://www.youtube.com/results?search_query=PALABRA+CLAVE+DEL+TEMA
  Ejemplo: https://www.youtube.com/results?search_query=introduccion+SQL+bases+datos
- Para artículos: usa URLs de búsqueda en Google:
  https://www.google.com/search?q=PALABRA+CLAVE+DEL+TEMA
- NUNCA uses "https://youtube.com" ni "https://www.youtube.com" sin parámetros
- Reemplaza espacios por + en los parámetros de búsqueda

FORMATO DE RESPUESTA - SOLO JSON válido, sin markdown:
[
  {{
    "titulo": "Titulo descriptivo del recurso",
    "descripcion": "Breve explicacion de por que ayuda",
    "tipo": "video",
    "prioridad": "alta",
    "url": "https://www.youtube.com/results?search_query=tema+especifico",
    "razon": "Explicacion pedagogica"
  }}
]

Genera al menos 3 videos de YouTube y 2 articulos. Responde SOLO con el JSON.
""".strip()

    for intento in range(1, 3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            texto = (response.text or "").strip()
            json_txt = _extraer_json_de_texto(texto)

            if not json_txt:
                print(f"[WARNING] Gemini recomendaciones intento {intento}: No JSON")
                continue

            data = json.loads(json_txt)

            if not isinstance(data, list) or len(data) == 0:
                print(f"[WARNING] Gemini recomendaciones intento {intento}: Lista vacía o formato incorrecto")
                continue

            lista_front = []
            for item in data[:8]:
                titulo = item.get("titulo", "Recurso recomendado")[:199]
                url = item.get("url", "")

                url_limpia = url.strip().replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")
                es_home_youtube = url_limpia in ("youtube.com", "youtube.com/", "")
                es_home_google = url_limpia in ("google.com", "google.com/", "")

                if not url or es_home_youtube or es_home_google:
                    tipo_item = item.get("tipo", "articulo")
                    query = titulo.replace(' ', '+')
                    if tipo_item == "video":
                        url = f"https://www.youtube.com/results?search_query={query}"
                    else:
                        url = f"https://www.google.com/search?q={query}"

                rec_bd = RecursoRecomendado.objects.create(
                    estudiante=estudiante,
                    titulo=titulo,
                    descripcion=item.get("descripcion", "")[:500],
                    tipo=item.get("tipo", "articulo")[:20],
                    prioridad=item.get("prioridad", "media")[:10],
                    recurso_original=recurso,
                    url=url,
                    razon_recomendacion=item.get("razon", "")[:500]
                )

                lista_front.append({
                    "id": rec_bd.id,
                    "titulo": rec_bd.titulo,
                    "tipo": rec_bd.tipo,
                    "descripcion": rec_bd.descripcion,
                    "prioridad": rec_bd.prioridad,
                    "url": rec_bd.url,
                    "razon": rec_bd.razon_recomendacion
                })

            return lista_front

        except Exception as e:
            print(f"[ERROR] Error Gemini recomendaciones intento {intento}: {str(e)}")
            traceback.print_exc()

    return generar_recursos_recomendados_fallback(estudiante, recurso, nivel_atencion)


# ====================================================================
# ENDPOINT 1: GENERAR EVALUACIÓN ADAPTATIVA
# ====================================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generar_evaluacion_adaptativa(request):
    print("=" * 60)
    print(">>> ENDPOINT generar_evaluacion_adaptativa LLAMADO <<<")
    print("=" * 60)
    user = request.user
    recurso_id = request.data.get("recurso_id")
    print(f">>> Usuario: {user}, recurso_id: {recurso_id}")

    try:
        if recurso_id:
            recurso = Recurso.objects.get(id=recurso_id)
            print(f">>> Recurso encontrado por ID: {recurso.titulo}")
        else:
            from evaluaciones.models import SesionAtencion
            ultima = SesionAtencion.objects.filter(estudiante=user).order_by("-fecha").first()

            if ultima and ultima.recurso:
                recurso = ultima.recurso
                print(f">>> Recurso encontrado por sesion: {recurso.titulo}")
            else:
                recurso = Recurso.objects.first()
                print(f">>> Recurso por defecto: {recurso}")

        if not recurso:
            print(">>> ERROR: No hay recursos disponibles")
            return Response({"error": "No hay recursos disponibles"}, status=status.HTTP_404_NOT_FOUND)

        print(f">>> Calculando nivel de atencion...")
        nivel_atencion, promedio_atencion = calcular_nivel_atencion(user)
        print(f">>> Nivel: {nivel_atencion}, promedio: {promedio_atencion}")

        if nivel_atencion == "baja":
            dificultad = "Difícil"
            num_preguntas = 15
        elif nivel_atencion == "media":
            dificultad = "Medio"
            num_preguntas = 10
        else:
            dificultad = "Fácil"
            num_preguntas = 5

        print(f">>> Dificultad: {dificultad}, num_preguntas: {num_preguntas}")

        print(">>> Obteniendo contexto D2R...")
        contexto_d2r = obtener_contexto_d2r(user)
        print(f">>> Contexto D2R: {contexto_d2r}")

        print(">>> A PUNTO DE LLAMAR A GENERAR_PREGUNTAS_IA <<<")
        preguntas_json, mensaje_ia = generar_preguntas_ia(
            recurso,
            dificultad,
            num_preguntas,
            contexto_atencion={"nivel": nivel_atencion, "promedio": promedio_atencion},
            contexto_d2r=contexto_d2r
        )
        print(f">>> generar_preguntas_ia RETORNO: {len(preguntas_json) if preguntas_json else 0} preguntas")
        print(f">>> Mensaje IA: {mensaje_ia}")

        if not preguntas_json:
            return Response({"error": "No se pudieron generar preguntas"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        contexto_atencion_db = {
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
            contexto_atencion=contexto_atencion_db,
        )

        modo_ia = "(Sin IA)" not in mensaje_ia and "(sin IA)" not in mensaje_ia
        print(f">>> EVALUACION CREADA: id={evaluacion.id}, modo_ia={modo_ia}")

        return Response({
            "success": True,
            "evaluacion": {
                "id": evaluacion.id,
                "nivel": evaluacion.nivel,
                "total_preguntas": len(evaluacion.preguntas_json or []),
                "preguntas": evaluacion.preguntas_json,
                "contexto_atencion": evaluacion.contexto_atencion,
                "modo_ia": modo_ia,
                "recurso": {"id": recurso.id, "titulo": recurso.titulo, "tipo": recurso.tipo},
            },
        })

    except Recurso.DoesNotExist:
        print(">>> EXCEPTION: Recurso no encontrado")
        return Response({"error": "Recurso no encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f">>> EXCEPTION GENERAL: {str(e)}")
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
            recursos_rec = generar_recursos_recomendados_ia(user, evaluacion.recurso, nivel_atencion, porcentaje)

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
