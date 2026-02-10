# backend/evaluaciones/admin.py
# ✅ Admin completo para EVALUACIONES con todos los modelos

from django.contrib import admin
from .models import (
    ResultadoD2R,
    DetalleFilaD2R,
    SesionAtencion,
    DetalleAtencion
)


# ========================================
# SESIÓN DE ATENCIÓN (Resumen por video)
# ========================================

@admin.register(SesionAtencion)
class SesionAtencionAdmin(admin.ModelAdmin):
    """
    Admin para ver sesiones de atención (resumen general por video).
    Cada registro representa UNA visualización completa de un video.
    """

    list_display = [
        'id',
        'estudiante',
        'recurso',
        'nivel',
        'porcentaje_atencion',
        'duracion_total',
        'segundos_distraido',
        'total_detalles',
        'fecha'
    ]

    list_filter = [
        'nivel',
        'fecha',
        'estudiante',
        'recurso'
    ]

    search_fields = [
        'estudiante__email',
        'estudiante__username',
        'recurso__titulo'
    ]

    readonly_fields = ['fecha']

    fieldsets = (
        ('👤 Estudiante y Recurso', {
            'fields': ('estudiante', 'recurso')
        }),
        ('📊 Métricas de Atención', {
            'fields': (
                'nivel',
                'porcentaje_atencion',
                'duracion_total',
                'segundos_distraido'
            )
        }),
        ('📅 Información Temporal', {
            'fields': ('fecha',)
        })
    )

    def total_detalles(self, obj):
        """Muestra cuántos detalles (segundos) tiene esta sesión"""
        return obj.detalles.count()
    total_detalles.short_description = 'Detalles (segundos)'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('estudiante', 'recurso').prefetch_related('detalles')

    def has_add_permission(self, request):
        # No permitir crear manualmente - solo desde el frontend
        return False


# ========================================
# DETALLE DE ATENCIÓN (Segundo a segundo)
# ========================================

@admin.register(DetalleAtencion)
class DetalleAtencionAdmin(admin.ModelAdmin):
    """
    Admin para ver detalles segundo a segundo de cada sesión.
    Cada registro representa UN segundo de visualización.
    """

    list_display = [
        'id',
        'get_estudiante',
        'get_recurso',
        'segundo',
        'es_distraido',
        'get_nivel_sesion'
    ]

    list_filter = [
        'es_distraido',
        'sesion__nivel',
        'sesion__fecha'
    ]

    search_fields = [
        'sesion__estudiante__email',
        'sesion__recurso__titulo'
    ]

    readonly_fields = ['sesion', 'segundo', 'es_distraido']

    def get_estudiante(self, obj):
        return obj.sesion.estudiante.email
    get_estudiante.short_description = 'Estudiante'
    get_estudiante.admin_order_field = 'sesion__estudiante'

    def get_recurso(self, obj):
        return obj.sesion.recurso.titulo
    get_recurso.short_description = 'Recurso'
    get_recurso.admin_order_field = 'sesion__recurso'

    def get_nivel_sesion(self, obj):
        return obj.sesion.nivel
    get_nivel_sesion.short_description = 'Nivel Sesión'
    get_nivel_sesion.admin_order_field = 'sesion__nivel'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('sesion__estudiante', 'sesion__recurso')

    def has_add_permission(self, request):
        # No permitir crear manualmente
        return False

    def has_delete_permission(self, request, obj=None):
        # Solo superadmins pueden borrar
        return request.user.is_superuser


# ========================================
# TEST D2-R (Resultados)
# ========================================

class DetalleFilaD2RInline(admin.TabularInline):
    """Inline para ver las filas del test D2-R dentro del resultado"""
    model = DetalleFilaD2R
    extra = 0
    readonly_fields = ['numero_fila', 'tr', 'ta', 'eo', 'ec']
    can_delete = False


@admin.register(ResultadoD2R)
class ResultadoD2RAdmin(admin.ModelAdmin):
    """
    Admin para ver resultados del test D2-R de atención y concentración.
    """

    list_display = [
        'id',
        'estudiante',
        'curso',
        'con',
        'var',
        'tot',
        'fecha'
    ]

    list_filter = [
        'fecha',
        'curso',
        'estudiante'
    ]

    search_fields = [
        'estudiante__email',
        'curso__titulo'
    ]

    readonly_fields = ['fecha']

    fieldsets = (
        ('👤 Información General', {
            'fields': ('estudiante', 'curso', 'recurso', 'fecha')
        }),
        ('📊 Variables Psicométricas', {
            'fields': (
                'tr_total',
                'ta_total',
                'eo_total',
                'ec_total'
            )
        }),
        ('📈 Índices Calculados', {
            'fields': (
                'tot',
                'con',
                'var'
            )
        }),
        ('📝 Interpretación', {
            'fields': ('interpretacion',),
            'classes': ('collapse',)
        })
    )

    inlines = [DetalleFilaD2RInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('estudiante', 'curso', 'recurso')


# Configuración del sitio admin
admin.site.site_header = "Administración del Sistema de Atención"
admin.site.site_title = "Admin Atención"
admin.site.index_title = "Panel de Control"
