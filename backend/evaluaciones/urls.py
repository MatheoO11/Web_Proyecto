from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResultadoD2RViewSet, SesionAtencionViewSet

router = DefaultRouter()

# Ruta: /api/evaluaciones/resultados-d2r/
router.register(r'resultados-d2r', ResultadoD2RViewSet)

# Ruta: /api/evaluaciones/atencion/
# (Antes era sesion-atencion, ahora es mas corto)
router.register(r'atencion', SesionAtencionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
