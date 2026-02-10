from rest_framework.routers import DefaultRouter

from users.views import UserViewSet
from courses.views import CursoViewSet, ModuloViewSet, RecursoViewSet
from evaluaciones.views import ResultadoD2RViewSet, SesionAtencionViewSet

router = DefaultRouter()

router.register(r'users', UserViewSet, basename='users')
router.register(r'cursos', CursoViewSet, basename='cursos')
router.register(r'modulos', ModuloViewSet, basename='modulos')
router.register(r'recursos', RecursoViewSet, basename='recursos')
router.register(r'resultados-d2r', ResultadoD2RViewSet, basename='resultados-d2r')
router.register(r'atencion', SesionAtencionViewSet, basename='atencion')  

urlpatterns = router.urls
