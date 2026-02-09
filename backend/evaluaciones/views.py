from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db.models import Avg, Count

from .models import ResultadoD2R, SesionAtencion, DetalleAtencion
from .serializers import ResultadoD2RSerializer, SesionAtencionSerializer

import google.generativeai as genai

# Configuración de Gemini
try:
    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if api_key:
        genai.configure(api_key=api_key)
except Exception as e:
    print(f"⚠️ ADVERTENCIA: Error configurando Gemini: {e}")

class ResultadoD2RViewSet(viewsets.ModelViewSet):
    queryset = ResultadoD2R.objects.all()
    serializer_class = ResultadoD2RSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin y Docentes ven todo, estudiantes solo lo suyo
        if getattr(user, 'rol', '') in ['admin', 'docente'] or user.is_staff:
            return ResultadoD2R.objects.all()
        return ResultadoD2R.objects.filter(estudiante=user)

    @action(detail=True, methods=['post'])
    def recomendacion(self, request, pk=None):
        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if not api_key:
            return Response({"error": "GOOGLE_API_KEY no configurada."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
        Eres un tutor experto. Analiza el test D2-R del estudiante:
        DATOS: {datos_analisis}

        Devuelve:
        - diagnostico (1 frase)
        - 3 recomendaciones accionables

        Responde en JSON con claves: diagnostico, recomendaciones (lista).
        """.strip()

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            r = model.generate_content(prompt)
            return Response({"ok": True, "raw": r.text, "input": datos_analisis})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class SesionAtencionViewSet(viewsets.ModelViewSet):
    queryset = SesionAtencion.objects.all()
    serializer_class = SesionAtencionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'rol', '') in ['admin', 'docente'] or user.is_staff:
            return SesionAtencion.objects.all()
        return SesionAtencion.objects.filter(estudiante=user)

    @action(detail=False, methods=['post'])
    def ia(self, request):
        """Endpoint genérico para análisis simple de métricas"""
        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if not api_key:
            return Response({"error": "GOOGLE_API_KEY no configurada."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        metrics = request.data.get("metrics", {}) or {}
        context = request.data.get("context", {}) or {}

        prompt = f"""
        Eres un analista de atención. Con base en estas métricas:
        - yaw: {metrics.get("yaw")}
        - pitch: {metrics.get("pitch")}
        - gaze: {metrics.get("gaze")}
        - ear: {metrics.get("ear")}

        Contexto:
        - recurso: {context.get("recurso")}
        - duracion: {context.get("duracion")}
        - porcentaje_atencion: {context.get("porcentaje_atencion")}

        Devuelve JSON:
        diagnostico (string),
        recomendaciones (lista de strings).
        """.strip()

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            r = model.generate_content(prompt)
            return Response({"ok": True, "raw": r.text})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    @action(detail=False, methods=['post'])
    def recomendacion_global(self, request):
        """
        POST /api/evaluaciones/atencion/recomendacion_global/
        """
        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if not api_key:
            return Response({"error": "GOOGLE_API_KEY no configurada."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user = request.user
        recurso_id = request.data.get("recurso_id")

        if not recurso_id:
            return Response({"error": "recurso_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # 1) Última sesión de atención: Corregido order_by('fecha')
        sesion = SesionAtencion.objects.filter(estudiante=user, recurso_id=recurso_id).order_by("-fecha").first()

        if not sesion:
            return Response({"error": "No hay sesión de atención registrada para este recurso"}, status=status.HTTP_404_NOT_FOUND)

        # 2) Último test D2R: Corregido order_by('fecha')
        d2r = ResultadoD2R.objects.filter(estudiante=user).order_by("-fecha").first()

        # 3) % distraído: Corregido campo 'es_distraido'
        qs_det = DetalleAtencion.objects.filter(sesion=sesion)
        total_det = qs_det.count()

        # ✅ AQUÍ ESTABA EL ERROR: Cambiado de es_distraccion a es_distraido
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
        Genera recomendaciones personalizadas para el estudiante con estos DATOS:
        {datos}

        INSTRUCCIONES:
        - Entrega 1 diagnostico corto.
        - Entrega 5 recomendaciones accionables (bullet points).
        - Incluye 1 recomendación específica si pct_det_distraido es alto (>20%).
        - Si no hay D2R, basa tu análisis solo en la atención visual.

        Responde estrictamente en JSON válido con estas claves:
        diagnostico (string),
        recomendaciones (lista de strings).
        """.strip()

        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            r = model.generate_content(prompt)
            return Response({"ok": True, "data": r.text, "input": datos})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
