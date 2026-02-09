from django.urls import path
from .views import registrar_atencion

urlpatterns = [
    path('', registrar_atencion, name='registrar_atencion'),
]
