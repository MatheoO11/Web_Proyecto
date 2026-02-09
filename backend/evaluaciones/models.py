from django.db import models
from django.conf import settings
# ✅ Importamos los modelos de OTRA app, eso está bien
from courses.models import Curso, Recurso

# ❌ BORRADA LA LÍNEA ERRÓNEA: "from .models import ResultadoD2R..."

class ResultadoD2R(models.Model):
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, null=True, blank=True)
    recurso = models.ForeignKey(Recurso, on_delete=models.SET_NULL, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    # Variables Psicométricas
    tr_total = models.IntegerField(verbose_name="Total Revisado (TR)")
    ta_total = models.IntegerField(verbose_name="Total Aciertos (TA)")
    eo_total = models.IntegerField(verbose_name="Errores de Omisión (EO)")
    ec_total = models.IntegerField(verbose_name="Errores de Comisión (EC)")

    # Índices Calculados
    tot = models.IntegerField(verbose_name="Rendimiento Total (TOT)")
    con = models.FloatField(verbose_name="Concentración (CON)")
    var = models.FloatField(verbose_name="Variabilidad (VAR)", default=0.0)

    interpretacion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"D2R | {self.estudiante.email} | CON: {self.con}"

    class Meta:
        verbose_name = "Resultado Test D2-R"
        verbose_name_plural = "Resultados Tests D2-R"

class DetalleFilaD2R(models.Model):
    test = models.ForeignKey(ResultadoD2R, related_name='filas', on_delete=models.CASCADE)
    numero_fila = models.PositiveIntegerField()
    tr = models.IntegerField()
    ta = models.IntegerField()
    eo = models.IntegerField()
    ec = models.IntegerField()

    def __str__(self):
        return f"Fila {self.numero_fila}"

class SesionAtencion(models.Model):
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)

    duracion_total = models.IntegerField()
    segundos_distraido = models.IntegerField()
    porcentaje_atencion = models.FloatField()

    NIVEL_CHOICES = [('ALTA', 'Alta'), ('MEDIA', 'Media'), ('BAJA', 'Baja')]
    nivel = models.CharField(max_length=10, choices=NIVEL_CHOICES)

    def __str__(self):
        return f"{self.estudiante} - {self.nivel}"

class DetalleAtencion(models.Model):
    sesion = models.ForeignKey(SesionAtencion, related_name='detalles', on_delete=models.CASCADE)
    segundo = models.IntegerField()
    es_distraido = models.BooleanField(default=False)
