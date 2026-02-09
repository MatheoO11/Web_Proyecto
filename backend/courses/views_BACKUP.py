from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Importamos modelos locales
from .models import Curso, Modulo, Recurso
from .serializers import CursoSerializer, ModuloSerializer, RecursoSerializer

# ⚠️ NOTA: Ya NO importamos 'analytics' aquí arriba para evitar el error circular.
# La importación se hace abajo, dentro de la función de recomendaciones.

class CursoViewSet(viewsets.ModelViewSet):
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # --- DEBUG LOG (Opcional, para ver en la terminal) ---
        print(f"🔍 API CURSOS: Usuario solicitando: {user.email}")
        print(f"   Rol detectado: {getattr(user, 'rol', 'Sin rol')}")
        # ---------------------------------------------------------

        # 1. Si es Admin (Staff o Rol admin)
        if user.is_staff or getattr(user, 'rol', '') == 'admin':
            return Curso.objects.all()

        # 2. Si es Docente
        if getattr(user, 'rol', '') == 'docente':
            return Curso.objects.filter(profesor=user)

        # 3. Si es Estudiante (Cualquier otro caso)
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
# LÓGICA DE INTELIGENCIA ARTIFICIAL Y RECOMENDACIONES
# ---------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recomendaciones_ia(request):
    """
    Analiza el historial de atención del estudiante y genera tarjetas de recomendación.
    Si el estudiante se distrajo mucho en un video, le sugiere repasar ese módulo específico.
    """

    # ✅ CORRECCIÓN CRÍTICA: Importamos el modelo AQUÍ DENTRO.
    # Esto rompe el ciclo de importación y evita el error al arrancar el servidor.
    from analytics.models import AtencionSesion

    user = request.user
    recomendaciones = []

    # 1. BUSCAR SESIONES CON BAJA ATENCIÓN (< 70%)
    # Traemos las últimas 5 sesiones donde el alumno se distrajo
    sesiones_baja_atencion = AtencionSesion.objects.filter(
        user=user,
        porcentaje_atencion__lt=70
    ).select_related('recurso', 'recurso__modulo', 'recurso__modulo__curso').order_by('-fecha_creacion')[:5]

    for sesion in sesiones_baja_atencion:
        recurso = sesion.recurso

        # Validación de seguridad por si se borró el recurso/modulo
        if not recurso or not recurso.modulo or not recurso.modulo.curso:
            continue

        modulo = recurso.modulo
        curso = modulo.curso

        recomendaciones.append({
            "id": f"att-{sesion.id}",
            "tipo": "atencion",
            "titulo": "Refuerza este tema",
            "mensaje": f"Detectamos baja concentración ({sesion.porcentaje_atencion}%) en este video.",
            "curso": curso.nombre,
            "modulo": modulo.nombre,      # ✅ Aquí especificamos el módulo
            "recurso_titulo": recurso.titulo,
            "recurso_id": recurso.id,
            "icon": "⚠️"
        })

    # 2. SI NO HAY PROBLEMAS (Todo > 70%)
    if not recomendaciones:
        recomendaciones.append({
            "id": "ok-1",
            "tipo": "felicitacion",
            "titulo": "¡Excelente desempeño!",
            "mensaje": "Tu nivel de atención es óptimo en todas tus últimas sesiones.",
            "curso": "General",
            "modulo": "N/A",
            "recurso_titulo": "Ninguno",
            "recurso_id": None,
            "icon": "🌟"
        })

    return Response(recomendaciones)
