from django.db import models
from django.contrib.auth import get_user_model

# ⚠️ OJO: NO importes 'courses.models' aquí arriba.
# Eso es lo que causa el error gigante.

User = get_user_model()

class AtencionSesion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # ✅ SOLUCIÓN: Usamos 'courses.Recurso' entre comillas.
    # Esto le dice a Django: "Busca este modelo después", rompiendo el círculo.
    recurso = models.ForeignKey('courses.Recurso', on_delete=models.CASCADE)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    duracion_total = models.IntegerField(help_text="Duración en segundos")
    segundos_distraido = models.IntegerField()
    porcentaje_atencion = models.IntegerField()

    # Para guardar detalles (ej: en qué segundo exacto se distrajo)
    detalle_cronologico = models.JSONField(default=list)

    def __str__(self):
        return f"{self.user.username} - Sesión {self.id} ({self.porcentaje_atencion}%)"
