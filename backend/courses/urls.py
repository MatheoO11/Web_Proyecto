# backend/courses/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from . import views_evaluaciones  # ✅ evaluaciones adaptativas

router = DefaultRouter()
router.register(r'cursos', views.CursoViewSet, basename='curso')
router.register(r'modulos', views.ModuloViewSet, basename='modulo')
router.register(r'recursos', views.RecursoViewSet, basename='recurso')

print(">>> [DEBUG] Loading courses/urls.py...")

urlpatterns = [
    # ✅ Evaluaciones adaptativas IA (MOVIDO ARRIBA)
    path('generar-evaluacion/', views_evaluaciones.generar_evaluacion_adaptativa, name='generar-evaluacion'),
    path('enviar-respuestas/', views_evaluaciones.enviar_respuestas_evaluacion, name='enviar-respuestas'),
    path('historial-evaluaciones/', views_evaluaciones.historial_evaluaciones, name='historial-evaluaciones'),
    path('recursos-recomendados/', views_evaluaciones.recursos_recomendados, name='recursos-recomendados'),
    path('marcar-recurso-visto/', views_evaluaciones.marcar_recurso_visto, name='marcar-recurso-visto'),

    # Recomendaciones IA
    path('recomendaciones/', views.recomendaciones_ia, name='recomendaciones-ia'),

    # ViewSets (al final para evitar shadowing)
    path('', include(router.urls)),
]
