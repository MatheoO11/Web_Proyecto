from django.contrib import admin
from .models import ResultadoD2R, DetalleFilaD2R, SesionAtencion, DetalleAtencion

# --- CONFIGURACIÓN TEST D2-R ---

class FilaInline(admin.TabularInline):
    model = DetalleFilaD2R
    extra = 0
    readonly_fields = ('numero_fila', 'tr', 'ta', 'eo', 'ec')
    can_delete = False

class ResultadoD2RAdmin(admin.ModelAdmin):
    # ✅ CORREGIDO: Usamos 'con' y 'tot' (sin _total) para evitar el error E108
    list_display = ('estudiante', 'curso', 'fecha', 'con', 'tot', 'interpretacion')
    list_filter = ('curso', 'fecha')
    search_fields = ('estudiante__email',)
    # ✅ CORREGIDO: Usamos 'con', 'tot', 'var' para evitar el error E035
    readonly_fields = ('fecha', 'tr_total', 'ta_total', 'eo_total', 'ec_total', 'tot', 'con', 'var')

    inlines = [FilaInline]

# --- CONFIGURACIÓN ATENCIÓN (CÁMARA) ---

class DetalleAtencionInline(admin.TabularInline):
    model = DetalleAtencion
    extra = 0
    readonly_fields = ('segundo', 'es_distraido')
    can_delete = False
    classes = ['collapse'] # Colapsado por defecto porque son muchas filas

class SesionAtencionAdmin(admin.ModelAdmin):
    list_display = ('estudiante', 'recurso', 'nivel', 'porcentaje_atencion', 'fecha')
    list_filter = ('nivel', 'fecha')
    readonly_fields = ('fecha', 'duracion_total', 'segundos_distraido', 'porcentaje_atencion', 'nivel')
    inlines = [DetalleAtencionInline]

admin.site.register(ResultadoD2R, ResultadoD2RAdmin)
admin.site.register(SesionAtencion, SesionAtencionAdmin)
@admin.register(DetalleAtencion)
class DetalleAtencionAdmin(admin.ModelAdmin):
    list_display = ("sesion", "segundo", "es_distraido")
    list_filter = ("es_distraido",)
    search_fields = ("sesion__estudiante__email",)

