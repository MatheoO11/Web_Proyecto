# backend/courses/views.py
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Avg, Count, Q
from django.conf import settings
import json

# Importamos modelos locales
from .models import Curso, Modulo, Recurso
from .serializers import CursoSerializer, ModuloSerializer, RecursoSerializer

# Importamos Google Gemini
# Importar Google Gemini (API oficial)
try:
    from google import genai
    GEMINI_DISPONIBLE = True
except ImportError:
    GEMINI_DISPONIBLE = False
    print("[INFO] library google-genai not found (using fallback)")

class CursoViewSet(viewsets.ModelViewSet):
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        print(f"🔍 API CURSOS: Usuario solicitando: {user.email}")
        print(f"   Rol detectado: {getattr(user, 'rol', 'Sin rol')}")

        # 1. Si es Admin
        if user.is_staff or getattr(user, 'rol', '') == 'admin':
            return Curso.objects.all()

        # 2. Si es Docente
        if getattr(user, 'rol', '') == 'docente':
            return Curso.objects.filter(profesor=user)

        # 3. Si es Estudiante
        return Curso.objects.filter(estudiantes=user)

class ModuloViewSet(viewsets.ModelViewSet):
    queryset = Modulo.objects.all()
    serializer_class = ModuloSerializer
    permission_classes = [IsAuthenticated]

class RecursoViewSet(viewsets.ModelViewSet):
    queryset = Recurso.objects.all()
    serializer_class = RecursoSerializer
    permission_classes = [IsAuthenticated]

# ---------------------------------------------------------------------
# SISTEMA DE RECOMENDACIONES INTELIGENTE CON IA
# ---------------------------------------------------------------------

def obtener_ultimo_d2r(user):
    """Obtiene el último test D2R realizado por el estudiante"""
    try:
        from evaluaciones.models import ResultadoD2R
        ultimo_d2r = ResultadoD2R.objects.filter(estudiante=user).latest('fecha')
        return {
            'existe': True,
            'con': ultimo_d2r.con,
            'tot': ultimo_d2r.tot,
            'var': ultimo_d2r.var,
            'tr_total': ultimo_d2r.tr_total,
            'ta_total': ultimo_d2r.ta_total,
            'eo_total': ultimo_d2r.eo_total,
            'ec_total': ultimo_d2r.ec_total,
            'fecha': ultimo_d2r.fecha.strftime('%Y-%m-%d %H:%M'),
            'interpretacion': ultimo_d2r.interpretacion or 'Sin interpretación'
        }
    except Exception:
        # Si no existe la app o no hay datos
        return {'existe': False}

def obtener_sesiones_atencion(user, limit=10):
    """Obtiene las últimas sesiones de atención del estudiante (desde evaluaciones)."""
    from evaluaciones.models import SesionAtencion

    sesiones = (
        SesionAtencion.objects.filter(estudiante=user)
        .select_related('recurso', 'recurso__modulo', 'recurso__modulo__curso')
        .order_by('-fecha')[:limit]
    )

    resultado = []
    for sesion in sesiones:
        if sesion.recurso and sesion.recurso.modulo and sesion.recurso.modulo.curso:
            resultado.append({
                'id': sesion.id,
                'recurso_titulo': sesion.recurso.titulo,
                'recurso_id': sesion.recurso.id,
                'modulo': sesion.recurso.modulo.nombre,
                'curso': sesion.recurso.modulo.curso.nombre,
                'porcentaje_atencion': float(sesion.porcentaje_atencion),
                'segundos_distraido': int(sesion.segundos_distraido),
                'duracion_total': int(sesion.duracion_total),
                'fecha': sesion.fecha.strftime('%Y-%m-%d %H:%M')
            })

    return resultado


def obtener_estadisticas_atencion(sesiones):
    """Calcula estadísticas agregadas de las sesiones"""
    if not sesiones:
        return {
            'promedio_atencion': 0,
            'sesiones_bajas': 0,
            'total_sesiones': 0
        }

    total = len(sesiones)
    promedio = sum(s['porcentaje_atencion'] for s in sesiones) / total
    bajas = len([s for s in sesiones if s['porcentaje_atencion'] < 70])

    return {
        'promedio_atencion': round(promedio, 2),
        'sesiones_bajas': bajas,
        'total_sesiones': total
    }

def detectar_patron_estudiante(d2r_data, sesiones, estadisticas):
    """
    Detecta el patrón de comportamiento del estudiante basado en D2R y atención.

    PATRONES:
    - A: D2R Bajo + Atención Baja → Dificultades de concentración base
    - B: D2R Alto + Atención Baja → Contenido complejo o poco interesante
    - C: D2R Bajo + Atención Alta → Estudiante comprometido que necesita apoyo
    - D: D2R Alto + Atención Alta → Estudiante óptimo
    - E: Sin datos suficientes
    """

    # Si no tiene D2R, no podemos hacer análisis completo
    if not d2r_data['existe']:
        return {
            'patron': 'SIN_D2R',
            'descripcion': 'No hay test D2R registrado',
            'prioridad': 'alta',
            'sugerencia': 'Realizar el test D2R para obtener recomendaciones personalizadas'
        }

    # Si no tiene sesiones, tampoco podemos comparar
    if not sesiones:
        return {
            'patron': 'SIN_SESIONES',
            'descripcion': 'No hay sesiones de video registradas',
            'prioridad': 'media',
            'sugerencia': 'Ver al menos 3 videos para obtener análisis de atención'
        }

    # Clasificamos D2R (CON = índice de concentración)
    con = d2r_data['con']
    d2r_alto = con >= 100  # Según estándares del test D2R

    # Clasificamos atención promedio
    prom_atencion = estadisticas['promedio_atencion']
    atencion_alta = prom_atencion >= 75

    # Detectamos patrón
    if not d2r_alto and not atencion_alta:
        # PATRÓN A: Dificultades generales
        return {
            'patron': 'PATRON_A',
            'descripcion': 'Dificultades de concentración base detectadas',
            'prioridad': 'alta',
            'sugerencia': 'Requiere estrategias de mejora de atención y recursos simplificados'
        }

    elif d2r_alto and not atencion_alta:
        # PATRÓN B: Contenido problemático
        return {
            'patron': 'PATRON_B',
            'descripcion': 'Buena capacidad base pero baja atención en videos',
            'prioridad': 'media',
            'sugerencia': 'El contenido puede ser muy complejo o poco atractivo. Probar formatos alternativos.'
        }

    elif not d2r_alto and atencion_alta:
        # PATRÓN C: Comprometido pero necesita apoyo
        return {
            'patron': 'PATRON_C',
            'descripcion': 'Alto compromiso pero capacidad de concentración limitada',
            'prioridad': 'media',
            'sugerencia': 'Estudiante motivado que se beneficiaría de técnicas de estudio y refuerzo'
        }

    else:
        # PATRÓN D: Óptimo
        return {
            'patron': 'PATRON_D',
            'descripcion': 'Excelente desempeño general',
            'prioridad': 'baja',
            'sugerencia': 'Estudiante listo para contenido avanzado y retos adicionales'
        }

def generar_recomendaciones_ia(user, d2r_data, sesiones, estadisticas, patron):
    """
    Usa Google Gemini AI para generar recomendaciones personalizadas
    """

    # Verificar si Gemini está disponible
    if not GEMINI_DISPONIBLE:
        print("[INFO] Fallback: Gemini no disponible en views.py")
        return generar_recomendaciones_fallback(sesiones, patron)

    # Configurar Gemini client
    api_key = getattr(settings, "GEMINI_API_KEY", None) or getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        print("[INFO] Fallback: API Key vacía")
        return generar_recomendaciones_fallback(sesiones, patron)

    try:
        # Usar cliente instanciado globalmente o crear uno nuevo
        client = genai.Client(api_key=api_key)

        # Preparar datos para el prompt
        videos_problema = [
            s for s in sesiones
            if s['porcentaje_atencion'] < 70
        ][:3]  # Top 3 con peor atención

        # Construir prompt estructurado
        prompt = f"""
Eres un asistente pedagógico experto. Analiza el perfil del siguiente estudiante y genera recomendaciones CONCRETAS y PERSONALIZADAS.

📊 PERFIL DEL ESTUDIANTE:

Test D2R (Concentración Base):
- Índice de Concentración (CON): {d2r_data.get('con', 'N/A')}
- Rendimiento Total (TOT): {d2r_data.get('tot', 'N/A')}
- Total Aciertos: {d2r_data.get('ta_total', 'N/A')}
- Errores de Omisión: {d2r_data.get('eo_total', 'N/A')}
- Errores de Comisión: {d2r_data.get('ec_total', 'N/A')}

Sesiones de Video (Atención en Tiempo Real):
- Promedio de atención: {estadisticas['promedio_atencion']}%
- Sesiones con baja atención (<70%): {estadisticas['sesiones_bajas']} de {estadisticas['total_sesiones']}

Videos con BAJA atención:
{json.dumps([{'titulo': v['recurso_titulo'], 'atencion': v['porcentaje_atencion'], 'modulo': v['modulo']} for v in videos_problema], indent=2, ensure_ascii=False)}

🎯 PATRÓN DETECTADO:
- Tipo: {patron['patron']}
- Descripción: {patron['descripcion']}
- Sugerencia inicial: {patron['sugerencia']}

📝 GENERA EXACTAMENTE 4-5 RECOMENDACIONES en formato JSON:

Cada recomendación debe tener:
1. "tipo": uno de ["repasar_video", "recurso_alternativo", "estrategia_estudio", "ejercicio_atencion", "contenido_avanzado"]
2. "titulo": Título corto y motivador (máx 60 caracteres)
3. "descripcion": Explicación detallada de POR QUÉ y CÓMO ayudará (100-150 palabras)
4. "recurso_id": ID del recurso específico si aplica (número o null)
5. "prioridad": "alta", "media" o "baja"
6. "icono": emoji apropiado

IMPORTANTE:
- SÉ ESPECÍFICO: menciona los videos/módulos exactos por nombre
- SÉ PRÁCTICO: da pasos concretos, no generalidades
- SÉ MOTIVADOR: usa un tono positivo y empoderador
- Si recomiendas repasar un video, usa el recurso_id exacto

Responde SOLO con el JSON, sin markdown, sin explicaciones adicionales:

{{
  "analisis_general": "Resumen en 2-3 oraciones del estado actual del estudiante",
  "recomendaciones": [
    {{
      "tipo": "...",
      "titulo": "...",
      "descripcion": "...",
      "recurso_id": null,
      "prioridad": "alta",
      "icono": "🎯"
    }}
  ]
}}
"""

        # Llamar a Gemini (Nueva sintaxis)
        print("🤖 Llamando a Gemini AI (views.py)...")
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        texto_respuesta = response.text.strip()

        # Limpiar posibles markdown
        if texto_respuesta.startswith('```json'):
            texto_respuesta = texto_respuesta.replace('```json', '').replace('```', '').strip()
        elif texto_respuesta.startswith('```'):
            texto_respuesta = texto_respuesta.replace('```', '').strip()

        # Parsear JSON
        resultado = json.loads(texto_respuesta)
        print(f"✅ Gemini generó recomendaciones correctamente")

        return resultado

    except json.JSONDecodeError as e:
        print(f"[ERROR] Gemini no retornó JSON válido - {str(e)}")
        return generar_recomendaciones_fallback(sesiones, patron)
    except Exception as e:
        print(f"[ERROR] Error en Gemini AI: {str(e)}")
        return generar_recomendaciones_fallback(sesiones, patron)

def generar_recomendaciones_fallback(sesiones, patron):
    """
    Sistema de recomendaciones básico sin IA (fallback)
    """
    print("⚙️ Usando sistema de recomendaciones fallback (sin IA)")
    recomendaciones = []

    # 1. Videos con baja atención
    videos_problema = [s for s in sesiones if s['porcentaje_atencion'] < 70][:3]

    for video in videos_problema:
        recomendaciones.append({
            'tipo': 'repasar_video',
            'titulo': f"Repasa: {video['recurso_titulo']}",
            'descripcion': f"Detectamos {100 - video['porcentaje_atencion']:.0f}% de distracción en este video del módulo '{video['modulo']}'. Te sugerimos verlo nuevamente con técnica Pomodoro (25 min concentrado + 5 min descanso).",
            'recurso_id': video['recurso_id'],
            'prioridad': 'alta',
            'icono': '🔄'
        })

    # 2. Estrategia según patrón
    if patron['patron'] == 'PATRON_A':
        recomendaciones.append({
            'tipo': 'ejercicio_atencion',
            'titulo': 'Ejercicios de concentración diarios',
            'descripcion': 'Tu perfil indica necesidad de fortalecer la atención base. Practica 10 minutos diarios de meditación o juegos de concentración antes de estudiar.',
            'recurso_id': None,
            'prioridad': 'alta',
            'icono': '🧠'
        })

    elif patron['patron'] == 'PATRON_B':
        recomendaciones.append({
            'tipo': 'recurso_alternativo',
            'titulo': 'Prueba formatos alternativos',
            'descripcion': 'Tienes buena capacidad de concentración pero los videos no te están enganchando. Intenta leer documentación o hacer ejercicios prácticos del mismo tema.',
            'recurso_id': None,
            'prioridad': 'media',
            'icono': '📚'
        })

    elif patron['patron'] == 'PATRON_D':
        recomendaciones.append({
            'tipo': 'contenido_avanzado',
            'titulo': '¡Estás listo para más desafíos!',
            'descripcion': 'Tu desempeño es excelente. Considera tomar módulos avanzados, participar en proyectos reales o ayudar a compañeros como tutor.',
            'recurso_id': None,
            'prioridad': 'baja',
            'icono': '🚀'
        })

    # 3. Mensaje general
    if not recomendaciones:
        recomendaciones.append({
            'tipo': 'felicitacion',
            'titulo': '¡Muy buen trabajo!',
            'descripcion': 'Tu nivel de atención es óptimo en todas tus sesiones recientes. Sigue así y completa los módulos restantes.',
            'recurso_id': None,
            'prioridad': 'baja',
            'icono': '🌟'
        })

    return {
        'analisis_general': patron['descripcion'],
        'recomendaciones': recomendaciones
    }

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recomendaciones_ia(request):
    """
    Endpoint principal del sistema de recomendaciones inteligente.

    Analiza:
    1. Test D2R del estudiante
    2. Historial de sesiones de atención
    3. Patrones de comportamiento

    Retorna:
    - Análisis general del perfil
    - 4-5 recomendaciones personalizadas generadas por IA
    """

    user = request.user

    print(f"🤖 Generando recomendaciones IA para: {user.email}")

    # 1. Obtener datos del estudiante
    d2r_data = obtener_ultimo_d2r(user)
    sesiones = obtener_sesiones_atencion(user, limit=10)
    estadisticas = obtener_estadisticas_atencion(sesiones)

    # 2. Detectar patrón de comportamiento
    patron = detectar_patron_estudiante(d2r_data, sesiones, estadisticas)

    # 3. Generar recomendaciones con IA
    resultado = generar_recomendaciones_ia(user, d2r_data, sesiones, estadisticas, patron)

    # 4. Enriquecer respuesta con contexto
    respuesta = {
        'perfil': {
            'd2r': d2r_data,
            'estadisticas_atencion': estadisticas,
            'patron': patron
        },
        'analisis_general': resultado.get('analisis_general', patron['descripcion']),
        'recomendaciones': resultado.get('recomendaciones', [])
    }

    print(f"✅ Recomendaciones generadas: {len(respuesta['recomendaciones'])} items")

    return Response(respuesta)
