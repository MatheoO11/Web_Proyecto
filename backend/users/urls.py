from django.urls import path, include
from rest_framework.routers import DefaultRouter
# ❌ Quitamos 'login_api' y agregamos 'CustomAuthToken'
from .views import CustomAuthToken, UserViewSet, UserMeView

# ✅ Creamos el router para las vistas basadas en ViewSet (UserViewSet)
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # Rutas del router (ej: /api/users/)
    path('', include(router.urls)),

    # ✅ Ruta Login CORREGIDA: Usamos la clase personalizada que acepta Email
    path('login/', CustomAuthToken.as_view(), name='login'),

    # ✅ Ruta para recuperar usuario (Fix pantalla blanca)
    path('me/', UserMeView.as_view(), name='user_me'),
]
