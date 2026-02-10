# backend/analytics/views.py
# ✅ VERSIÓN CORREGIDA - Guarda en evaluaciones.SesionAtencion (NO en analytics)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from courses.models import Recurso

# ✅ Usamos los modelos correctos de evaluaciones
from evaluaciones.models import SesionAtencion, DetalleAtencion


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_atencion(request):
    """
    Guarda UNA sesión de atención cuando el estudiante TERMINA de ver el video.

    ⚠️ IMPORTANTE: Este endpoint se debe llamar UNA SOLA VEZ al finalizar el video,
    NO cada vez que se pausa/reproduce.

    Body esperado:
    {
        "recurso": 1,
        "duracion_total": 120,  // Segundos totales del video visto
        "segundos_distraido": 30,  // Segundos que estuvo distraído
        "porcentaje_atencion": 75.0,  // Porcentaje de atención
        "detalle_cronologico": [  // Array con datos segundo a segundo
            {"segundo": 0, "distraido": false},
            {"segundo": 1, "distraido": false},
            {"segundo": 10, "distraido": true},
            ...
        ]
    }

    Returns:
    {
        "status": "success",
        "id": 123,
        "nivel": "ALTA",
        "porcentaje_atencion": 75.0,
        "detalles_guardados": 120
    }
    """
    data = request.data

    try:
        # 1. Validar que el recurso existe
        recurso_id = data.get('recurso')
        if not recurso_id:
            return Response(
                {"error": "El campo 'recurso' es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recurso = Recurso.objects.get(id=recurso_id)
        except Recurso.DoesNotExist:
            return Response(
                {"error": f"Recurso con id {recurso_id} no existe"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Calcular nivel basado en porcentaje de atención
        porcentaje = float(data.get('porcentaje_atencion', 0))
        if porcentaje >= 80:
            nivel = 'ALTA'
        elif porcentaje >= 50:
            nivel = 'MEDIA'
        else:
            nivel = 'BAJA'

        # 3. Crear sesión principal (UNA SOLA)
        sesion = SesionAtencion.objects.create(
            estudiante=request.user,
            recurso=recurso,
            duracion_total=int(data.get('duracion_total', 0)),
            segundos_distraido=int(data.get('segundos_distraido', 0)),
            porcentaje_atencion=porcentaje,
            nivel=nivel
        )

        # 4. Guardar detalles cronológicos (segundo a segundo)
        detalle_cronologico = data.get('detalle_cronologico', [])
        detalles_guardados = 0

        if detalle_cronologico and isinstance(detalle_cronologico, list):
            detalles_bulk = []

            for item in detalle_cronologico:
                if isinstance(item, dict):
                    detalles_bulk.append(
                        DetalleAtencion(
                            sesion=sesion,
                            segundo=item.get('segundo', 0),
                            es_distraido=item.get('distraido', False)
                        )
                    )

            # Guardar todos los detalles de una vez (bulk_create es más eficiente)
            if detalles_bulk:
                DetalleAtencion.objects.bulk_create(detalles_bulk)
                detalles_guardados = len(detalles_bulk)

        print(f"✅ Sesión guardada: ID={sesion.id}, Nivel={nivel}, Detalles={detalles_guardados}")

        return Response({
            "status": "success",
            "id": sesion.id,
            "nivel": nivel,
            "porcentaje_atencion": porcentaje,
            "detalles_guardados": detalles_guardados
        }, status=status.HTTP_201_CREATED)

    except ValueError as e:
        print(f"❌ Error de validación: {e}")
        return Response(
            {"error": f"Error en formato de datos: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        print(f"❌ Error guardando atención: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_mis_sesiones(request):
    """
    Obtiene todas las sesiones de atención del usuario actual.
    Útil para mostrar historial en el frontend.
    """
    sesiones = SesionAtencion.objects.filter(
        estudiante=request.user
    ).select_related('recurso').order_by('-fecha')

    data = []
    for sesion in sesiones:
        data.append({
            'id': sesion.id,
            'recurso': {
                'id': sesion.recurso.id,
                'titulo': sesion.recurso.titulo
            },
            'fecha': sesion.fecha,
            'duracion_total': sesion.duracion_total,
            'segundos_distraido': sesion.segundos_distraido,
            'porcentaje_atencion': sesion.porcentaje_atencion,
            'nivel': sesion.nivel,
            'total_detalles': sesion.detalles.count()
        })

    return Response({
        'total': len(data),
        'sesiones': data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_detalle_sesion(request, sesion_id):
    """
    Obtiene los detalles segundo a segundo de una sesión específica.
    """
    try:
        sesion = SesionAtencion.objects.get(
            id=sesion_id,
            estudiante=request.user
        )
    except SesionAtencion.DoesNotExist:
        return Response(
            {"error": "Sesión no encontrada"},
            status=status.HTTP_404_NOT_FOUND
        )

    detalles = sesion.detalles.all().order_by('segundo')

    return Response({
        'sesion': {
            'id': sesion.id,
            'recurso': sesion.recurso.titulo,
            'nivel': sesion.nivel,
            'porcentaje_atencion': sesion.porcentaje_atencion
        },
        'detalles': [
            {
                'segundo': d.segundo,
                'es_distraido': d.es_distraido
            }
            for d in detalles
        ]
    })
