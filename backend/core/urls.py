from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rutas principales (api_router tiene: users, cursos, modulos, recursos, resultados-d2r, atencion)
    path('api/', include('core.api_router')),

    # Rutas de autenticación (login, me)
    path('api/', include('users.urls')),

    # ✅ CORRECCIÓN: Rutas de courses (generar-evaluacion, recomendaciones, etc.)
    # Ahora responden a /api/generar-evaluacion/ directamente (sin /courses/)
    path('api/', include('courses.urls')),

    # Rutas de evaluaciones y analytics adicionales
    path('api/evaluaciones/', include('evaluaciones.urls')),
    path('api/analytics/', include('analytics.urls')),
]
