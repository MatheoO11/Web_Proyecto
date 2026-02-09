# backend/analytics/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import AtencionSesion
from courses.models import Recurso

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_atencion(request):
    data = request.data
    try:
        recurso_id = data.get('recurso')
        recurso = Recurso.objects.get(id=recurso_id)

        sesion = AtencionSesion.objects.create(
            user=request.user,
            recurso=recurso,
            duracion_total=data.get('duracion_total', 0),
            segundos_distraido=data.get('segundos_distraido', 0),
            porcentaje_atencion=data.get('porcentaje_atencion', 0),
            detalle_cronologico=data.get('detalle_cronologico', [])
        )
        return Response({"status": "success", "id": sesion.id}, status=status.HTTP_201_CREATED)
    except Exception as e:
        print("Error guardando atención:", e)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
