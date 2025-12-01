from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Configuramos cómo se verá el usuario en el panel
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # Columnas que se verán en la lista de usuarios
    list_display = ['email', 'username', 'rol', 'is_staff']

    # Agregamos el campo 'rol' al formulario de edición
    fieldsets = UserAdmin.fieldsets + (
        ('Información Extra', {'fields': ('rol',)}),
    )

    # Agregamos el campo 'rol' al formulario de creación
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'rol',)}),
    )

# Registramos el modelo
admin.site.register(CustomUser, CustomUserAdmin)
