from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Definimos los roles posibles
    ROLE_CHOICES = (
        ('admin', 'Administrador'),
        ('docente', 'Docente'),
        ('estudiante', 'Estudiante'),
    )

    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='estudiante')
    email = models.EmailField(unique=True)

    # Configuración para usar email en vez de username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'rol']

    def __str__(self):
        return self.email
