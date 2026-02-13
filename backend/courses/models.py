from django.db import models
from django.conf import settings

# --- MODELOS BASE DEL CURSO ---

class Curso(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    icon = models.CharField(max_length=10, default='📚', help_text="Emoji del curso")

    profesor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cursos_impartidos',
        limit_choices_to={'rol': 'docente'}
    )

    estudiantes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='cursos_inscritos',
        blank=True,
        limit_choices_to={'rol': 'estudiante'}
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class Modulo(models.Model):
    curso = models.ForeignKey(Curso, related_name='modulos', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=200)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden']

    def __str__(self):
        return f"{self.curso.nombre} - {self.nombre}"

class Recurso(models.Model):
    TIPO_CHOICES = (
        ('video', 'Video'),
        ('lectura', 'Lectura'),
        ('quiz', 'Quiz (Test D2R)'),
    )

    modulo = models.ForeignKey(Modulo, related_name='recursos', on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    url_contenido = models.URLField(help_text="Link de YouTube o PDF", blank=True, null=True)
    contenido_texto = models.TextField(help_text="Para lecturas", blank=True, null=True)
    duracion_estimada = models.CharField(max_length=20, default="10 min")
    es_obligatorio = models.BooleanField(default=False)

    def __str__(self):
        return f"[{self.tipo}] {self.titulo}"

# --- INTERACCIÓN Y PREGUNTAS EN VIDEO ---

class PreguntaVideo(models.Model):
    recurso = models.ForeignKey(Recurso, related_name='preguntas', on_delete=models.CASCADE)
    segundo = models.PositiveIntegerField(help_text="Segundo exacto donde se pausa el video (ej: 90)")
    texto_pregunta = models.CharField(max_length=500)

    # Opciones de respuesta
    opcion_a = models.CharField(max_length=200)
    opcion_b = models.CharField(max_length=200)
    opcion_c = models.CharField(max_length=200, blank=True, null=True)
    opcion_d = models.CharField(max_length=200, blank=True, null=True)

    RESPUESTAS = [('A', 'Opción A'), ('B', 'Opción B'), ('C', 'Opción C'), ('D', 'Opción D')]
    respuesta_correcta = models.CharField(max_length=1, choices=RESPUESTAS, default='A')

    class Meta:
        ordering = ['segundo']

    def __str__(self):
        return f"{self.segundo}s: {self.texto_pregunta}"

# --- MODELOS DE INTELIGENCIA ARTIFICIAL Y EVALUACIÓN ADAPTATIVA ---

class EvaluacionAdaptativa(models.Model):
    """
    Evaluación generada dinámicamente por la IA según el nivel del estudiante
    """
    NIVEL_CHOICES = [
        ('facil', 'Fácil - 5 preguntas'),
        ('medio', 'Medio - 10 preguntas'),
        ('dificil', 'Difícil - 15 preguntas'),
    ]

    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, related_name='evaluaciones_adaptativas')
    nivel = models.CharField(max_length=10, choices=NIVEL_CHOICES)

    # Datos JSON con las preguntas generadas por Gemini
    preguntas_json = models.JSONField(help_text="Preguntas generadas por la IA")

    generada_para = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='evaluaciones_generadas')
    fecha_generacion = models.DateTimeField(auto_now_add=True)

    # Contexto usado para generar (para debugging)
    contexto_d2r = models.JSONField(null=True, blank=True)
    contexto_atencion = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_generacion']
        verbose_name = 'Evaluación Adaptativa'
        verbose_name_plural = 'Evaluaciones Adaptativas'

    def __str__(self):
        return f"Eval {self.nivel} - {self.recurso.titulo} ({self.generada_para.email})"


class ResultadoEvaluacion(models.Model):
    """
    Resultado de una evaluación adaptativa realizada por el estudiante
    """
    evaluacion = models.ForeignKey(EvaluacionAdaptativa, on_delete=models.CASCADE, related_name='resultados')
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resultados_evaluaciones')

    respuestas_json = models.JSONField(help_text="Respuestas del estudiante")

    puntaje = models.FloatField(help_text="Porcentaje de aciertos (0-100)")
    tiempo_invertido = models.IntegerField(help_text="Tiempo en segundos", null=True, blank=True)

    # Análisis de la IA sobre el resultado
    analisis_ia = models.TextField(blank=True, help_text="Comentario generado por Gemini sobre el desempeño")

    fecha_realizacion = models.DateTimeField(auto_now_add=True)
    intento_numero = models.IntegerField(default=1, help_text="Número de intento para este recurso")

    class Meta:
        ordering = ['-fecha_realizacion']
        verbose_name = 'Resultado de Evaluación'
        verbose_name_plural = 'Resultados de Evaluaciones'

    def __str__(self):
        return f"{self.estudiante.email} - {self.puntaje}% ({self.fecha_realizacion.strftime('%Y-%m-%d')})"


class RecursoRecomendado(models.Model):
    """
    Recursos adicionales recomendados por la IA
    """
    TIPO_CHOICES = [
        ('video_youtube', 'Video de YouTube'),
        ('pdf', 'Documento PDF'),
        ('articulo', 'Artículo web'),
        ('ejercicio', 'Ejercicio práctico'),
    ]

    PRIORIDAD_CHOICES = [
        ('alta', 'Alta - Ver antes de la evaluación'),
        ('media', 'Media - Refuerzo recomendado'),
        ('baja', 'Baja - Contenido complementario'),
    ]

    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recursos_recomendados')
    recurso_original = models.ForeignKey(Recurso, on_delete=models.CASCADE, related_name='recomendaciones_generadas')

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default='media')

    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    url = models.URLField(max_length=500, blank=True)

    archivo = models.FileField(upload_to='recursos_ia/', blank=True, null=True)

    generado_por_ia = models.BooleanField(default=True)
    fecha_recomendacion = models.DateTimeField(auto_now_add=True)
    visto = models.BooleanField(default=False, help_text="Estudiante marcó como visto")
    razon_recomendacion = models.TextField(blank=True, null=True, help_text="Explicación de por qué se recomendó")

    class Meta:
        ordering = ['-prioridad', '-fecha_recommendacion'] if hasattr(models, 'fecha_recommendacion') else ['-prioridad'] # Pequeño fix por si acaso
        ordering = ['-prioridad', '-fecha_recomendacion']
        verbose_name = 'Recurso Recomendado por IA'
        verbose_name_plural = 'Recursos Recomendados por IA'

    def __str__(self):
        return f"{self.tipo} - {self.titulo} (Prioridad: {self.prioridad})"


class EvolucionEstudiante(models.Model):
    """
    Registro de evolución del estudiante para gráficos de progreso
    """
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='evoluciones')
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, related_name='evoluciones')

    puntaje_evaluacion = models.FloatField()
    nivel_atencion = models.FloatField(help_text="Promedio de atención en ese recurso")
    indice_d2r = models.IntegerField(null=True, blank=True)

    fecha_registro = models.DateTimeField(auto_now_add=True)

    mejora_respecto_anterior = models.FloatField(null=True, blank=True, help_text="Diferencia en porcentaje")

    class Meta:
        ordering = ['estudiante', 'recurso', 'fecha_registro']
        verbose_name = 'Evolución del Estudiante'
        verbose_name_plural = 'Evoluciones de Estudiantes'

    def __str__(self):
        return f"{self.estudiante.email} - {self.recurso.titulo} ({self.puntaje_evaluacion}%)"
