from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db.models import Avg, Count
import traceback
import json

from .models import ResultadoD2R, SesionAtencion, DetalleAtencion
from .serializers import ResultadoD2RSerializer, SesionAtencionSerializer


# ======================================================
# GOOGLE GEMINI (API OFICIAL)
# ======================================================
try:
    from google import genai
    api_key = getattr(settings, "GEMINI_API_KEY", None) or getattr(settings, "GOOGLE_API_KEY", None)
    client = genai.Client(api_key=api_key) if api_key else None
    GEMINI_DISPONIBLE = bool(client)
    if GEMINI_DISPONIBLE:
        print(f"[OK] Gemini disponible (evaluaciones/views)")
    else:
        print("[WARNING] No API key found for Gemini (evaluaciones/views)")
except Exception:
    GEMINI_DISPONIBLE = False
    client = None
    print("⚠️ WARNING: google-genai no está disponible")


# ======================================================
# RESULTADO D2R
# ======================================================

class ResultadoD2RViewSet(viewsets.ModelViewSet):
    queryset = ResultadoD2R.objects.all()
    serializer_class = ResultadoD2RSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "rol", "") in ["admin", "docente"] or user.is_staff:
            return ResultadoD2R.objects.all()
        return ResultadoD2R.objects.filter(estudiante=user)

    @action(detail=True, methods=["post"])
    def recomendacion(self, request, pk=None):
        if not GEMINI_DISPONIBLE:
            return Response(
                {"error": "Gemini AI no está disponible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        resultado = self.get_object()

        datos_analisis = {
            "tr_total": resultado.tr_total,
            "ta_total": resultado.ta_total,
            "errores": (resultado.eo_total + resultado.ec_total),
            "con": resultado.con,
            "var": resultado.var,
            "tot": getattr(resultado, "tot", None),
        }

        prompt = f"""
Eres un tutor experto.
Analiza el test D2-R del estudiante:

DATOS:
{datos_analisis}

Devuelve JSON válido:
{{
  "diagnostico": "1 frase",
  "recomendaciones": ["rec1", "rec2", "rec3"]
}}
""".strip()

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return Response({
                "ok": True,
                "raw": response.text,
                "input": datos_analisis
            })
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


# ======================================================
# SESIÓN DE ATENCIÓN
# ======================================================

class SesionAtencionViewSet(viewsets.ModelViewSet):
    queryset = SesionAtencion.objects.all()
    serializer_class = SesionAtencionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "rol", "") in ["admin", "docente"] or user.is_staff:
            return SesionAtencion.objects.all()
        return SesionAtencion.objects.filter(estudiante=user)

    @action(detail=False, methods=["post"])
    def ia(self, request):
        if not GEMINI_DISPONIBLE:
            return Response(
                {"error": "Gemini AI no está disponible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        metrics = request.data.get("metrics", {}) or {}
        context = request.data.get("context", {}) or {}

        prompt = f"""
Eres un analista de atención.

MÉTRICAS:
- yaw: {metrics.get("yaw")}
- pitch: {metrics.get("pitch")}
- gaze: {metrics.get("gaze")}
- ear: {metrics.get("ear")}

CONTEXTO:
- recurso: {context.get("recurso")}
- duracion: {context.get("duracion")}
- porcentaje_atencion: {context.get("porcentaje_atencion")}

Devuelve JSON:
{{
  "diagnostico": "texto",
  "recomendaciones": ["r1","r2","r3"]
}}
""".strip()

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return Response({"ok": True, "raw": response.text})
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=False, methods=["post"])
    def recomendacion_global(self, request):
        if not GEMINI_DISPONIBLE:
            return Response(
                {"error": "Gemini AI no está disponible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        user = request.user
        recurso_id = request.data.get("recurso_id")

        if not recurso_id:
            return Response(
                {"error": "recurso_id es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        sesion = SesionAtencion.objects.filter(
            estudiante=user,
            recurso_id=recurso_id
        ).order_by("-fecha").first()

        if not sesion:
            return Response(
                {"error": "No hay sesión de atención registrada"},
                status=status.HTTP_404_NOT_FOUND
            )

        d2r = ResultadoD2R.objects.filter(estudiante=user).order_by("-fecha").first()

        qs_det = DetalleAtencion.objects.filter(sesion=sesion)
        total_det = qs_det.count()
        distraido_det = qs_det.filter(es_distraido=True).count()
        pct_det_distraido = round((distraido_det / total_det) * 100, 2) if total_det else 0

        datos = {
            "atencion": {
                "recurso_id": int(recurso_id),
                "duracion_total": sesion.duracion_total,
                "segundos_distraido": sesion.segundos_distraido,
                "porcentaje_atencion": sesion.porcentaje_atencion,
                "nivel": sesion.nivel,
                "pct_det_distraido": pct_det_distraido,
            },
            "d2r": None
        }

        if d2r:
            datos["d2r"] = {
                "tr_total": d2r.tr_total,
                "ta_total": d2r.ta_total,
                "eo_total": d2r.eo_total,
                "ec_total": d2r.ec_total,
                "tot": getattr(d2r, "tot", None),
                "con": d2r.con,
                "var": d2r.var,
            }

        prompt = f"""
Eres un tutor experto en aprendizaje y atención.

DATOS:
{datos}

INSTRUCCIONES:
- 1 diagnóstico corto
- 5 recomendaciones accionables
- Si pct_det_distraido > 20%, incluir recomendación específica
- Si no hay D2R, usar solo atención visual

Devuelve JSON:
{{
  "diagnostico": "texto",
  "recomendaciones": ["r1","r2","r3","r4","r5"]
}}
""".strip()

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return Response({
                "ok": True,
                "data": response.text,
                "input": datos
            })
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
