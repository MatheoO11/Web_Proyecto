from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'rol', 'is_staff']

    fieldsets = UserAdmin.fieldsets + (
        ('Información Extra', {'fields': ('rol',)}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'rol',)}),
    )

admin.site.register(CustomUser, CustomUserAdmin)
