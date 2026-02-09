# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # ✅ USUARIOS - Login, Me, CRUD usuarios
    # Esto habilita: /api/login/ y /api/me/
    path('api/', include('users.urls')),

    # ✅ EVALUACIONES - D2R y otros tests
    # Esto habilita: /api/evaluaciones/...
    path('api/evaluaciones/', include('evaluaciones.urls')),

    # ✅ CURSOS - ViewSets + recomendaciones
    # Esto habilita: /api/cursos/, /api/modulos/, /api/recursos/, /api/recomendaciones/
    path('api/', include('courses.urls')),

    # ✅ ANALYTICS - Registro de atención
    # Esto habilita: /api/atencion/
    path('api/atencion/', include('analytics.urls')),
]

# Configuración para servir archivos media (imágenes, videos) en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
