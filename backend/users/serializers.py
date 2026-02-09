from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    # Nombre completo para mostrar en tablas
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'rol', 'password', 'nombre_completo']
        # La contraseña solo se usa para crear, no se devuelve al leer por seguridad
        extra_kwargs = {'password': {'write_only': True}}

    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def create(self, validated_data):
        # Usamos create_user para que encripte la contraseña correctamente
        user = CustomUser.objects.create_user(**validated_data)
        return user
