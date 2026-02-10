# backend/analytics/urls.py
# ✅ URLs actualizadas con endpoints adicionales

from django.urls import path
from .views import (
    registrar_atencion,
    obtener_mis_sesiones,
    obtener_detalle_sesion
)

urlpatterns = [
    # POST - Guardar sesión de atención (llamar UNA VEZ al finalizar video)
    path('', registrar_atencion, name='registrar_atencion'),

    # GET - Obtener todas las sesiones del usuario
    path('mis-sesiones/', obtener_mis_sesiones, name='mis_sesiones'),

    # GET - Obtener detalles de una sesión específica
    path('sesion/<int:sesion_id>/', obtener_detalle_sesion, name='detalle_sesion'),
]
