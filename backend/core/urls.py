from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Rutas principales (api_router tiene: users, cursos, modulos, recursos, resultados-d2r, atencion)
    path('api/', include('core.api_router')),

    # Rutas de autenticación (login, me)
    path('api/', include('users.urls')),

    # Rutas de courses (generar-evaluacion, enviar-respuestas, etc.)
    path('api/courses/', include('courses.urls')),

    # Rutas de evaluaciones
    path('api/evaluaciones/', include('evaluaciones.urls')),

    # Rutas de analytics
    path('api/analytics/', include('analytics.urls')),
]
