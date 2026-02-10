from django.contrib import admin
from .models import AtencionSesion

@admin.register(AtencionSesion)
class AtencionSesionAdmin(admin.ModelAdmin):
    """
    Admin para ver los datos de atención que SÍ se están guardando.
    Estos datos vienen del frontend cuando el estudiante ve videos/usa cámara.
    """

    list_display = [
        'id',
        'user',
        'recurso',
        'porcentaje_atencion',
        'duracion_total',
        'segundos_distraido',
        'fecha_creacion'
    ]

    list_filter = [
        'fecha_creacion',
        'user',
        'recurso'
    ]

    search_fields = [
        'user__email',
        'user__username',
        'recurso__titulo'
    ]

    readonly_fields = [
        'fecha_creacion',
        'detalle_cronologico_formateado'
    ]

    fieldsets = (
        ('👤 Usuario y Recurso', {
            'fields': ('user', 'recurso')
        }),
        ('📊 Métricas de Atención', {
            'fields': (
                'duracion_total',
                'segundos_distraido',
                'porcentaje_atencion'
            )
        }),
        ('🕒 Detalles Cronológicos', {
            'fields': ('detalle_cronologico_formateado',),
            'classes': ('collapse',)
        }),
        ('📅 Fecha', {
            'fields': ('fecha_creacion',)
        })
    )

    def detalle_cronologico_formateado(self, obj):
        """Muestra el JSON de forma más legible"""
        if not obj.detalle_cronologico:
            return "Sin detalles"

        import json
        try:
            return json.dumps(obj.detalle_cronologico, indent=2)
        except:
            return str(obj.detalle_cronologico)

    detalle_cronologico_formateado.short_description = "Detalle Cronológico"

    def has_add_permission(self, request):
        # No permitir crear manualmente desde el admin
        # Solo se crean desde el frontend
        return False

    def has_delete_permission(self, request, obj=None):
        # Solo admins pueden borrar
        return request.user.is_superuser
