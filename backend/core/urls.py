from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # API
    path('api/', include('core.api_router')),
    path('api/courses/', include('courses.urls')),  # ← AGREGA ESTA LÍNEA
    path('api/evaluaciones/', include('evaluaciones.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/auth/', include('users.urls')),
]
