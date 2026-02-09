from django.contrib import admin
from .models import Curso, Modulo, Recurso, PreguntaVideo

# Configuración para editar Preguntas DENTRO de la pantalla del Recurso (Video)
class PreguntaVideoInline(admin.TabularInline):
    model = PreguntaVideo
    extra = 1 # Muestra una fila vacía lista para agregar
    fields = ('segundo', 'texto_pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'respuesta_correcta')

# Configuración del Admin de Recursos para incluir las preguntas
class RecursoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'modulo', 'duracion_estimada')
    list_filter = ('tipo', 'modulo__curso')
    search_fields = ('titulo',)

    # Aquí conectamos las preguntas al recurso
    # Solo se mostrarán si el recurso es guardado (no al crear uno nuevo desde cero en línea)
    inlines = [PreguntaVideoInline]

# Configuración para editar Recursos DENTRO de la pantalla de Módulo
class RecursoInline(admin.StackedInline):
    model = Recurso
    extra = 1
    show_change_link = True # Botón para ir a editar el recurso en detalle (y agregar preguntas)

# Configuración para editar Módulos DENTRO de la pantalla de Curso
class ModuloInline(admin.TabularInline):
    model = Modulo
    extra = 1
    show_change_link = True

class CursoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'profesor', 'count_estudiantes', 'activo')
    list_filter = ('profesor', 'activo')
    search_fields = ('nombre', 'profesor__email')
    filter_horizontal = ('estudiantes',) # Selector múltiple para alumnos
    inlines = [ModuloInline]

    def count_estudiantes(self, obj):
        return obj.estudiantes.count()
    count_estudiantes.short_description = 'Estudiantes'

class ModuloAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'curso', 'orden')
    list_filter = ('curso',)
    inlines = [RecursoInline]

# Registramos los modelos
admin.site.register(Curso, CursoAdmin)
admin.site.register(Modulo, ModuloAdmin)
admin.site.register(Recurso, RecursoAdmin) # ✅ Usamos el RecursoAdmin personalizado
# Opcional: Registrar PreguntaVideo por separado si quieres ver todas las preguntas juntas
admin.site.register(PreguntaVideo)
