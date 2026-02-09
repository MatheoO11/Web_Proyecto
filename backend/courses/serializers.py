from rest_framework import serializers
from .models import Curso, Modulo, Recurso, PreguntaVideo

class PreguntaVideoSerializer(serializers.ModelSerializer):
    # Creamos un campo calculado para devolver las opciones como una lista limpia
    opciones = serializers.SerializerMethodField()

    class Meta:
        model = PreguntaVideo
        fields = ['id', 'segundo', 'texto_pregunta', 'opciones', 'respuesta_correcta']

    def get_opciones(self, obj):
        # Convertimos los campos individuales (a,b,c,d) en un array para el Frontend
        opts = [obj.opcion_a, obj.opcion_b]
        if obj.opcion_c:
            opts.append(obj.opcion_c)
        if obj.opcion_d:
            opts.append(obj.opcion_d)
        return opts

class RecursoSerializer(serializers.ModelSerializer):
    # Incrustamos las preguntas dentro del recurso automáticamente
    # Esto es clave para que el SmartVideo funcione sin hacer peticiones extra
    preguntas = PreguntaVideoSerializer(many=True, read_only=True)

    class Meta:
        model = Recurso
        fields = '__all__'

class ModuloSerializer(serializers.ModelSerializer):
    # Incrusta la lista de recursos dentro de cada módulo
    recursos = RecursoSerializer(many=True, read_only=True)

    class Meta:
        model = Modulo
        fields = ['id', 'nombre', 'orden', 'recursos', 'curso']

class CursoSerializer(serializers.ModelSerializer):
    # Campo calculado para obtener el nombre del profesor de forma segura
    nombre_profesor = serializers.SerializerMethodField()

    # Incrusta la lista de módulos completos dentro del curso
    modulos = ModuloSerializer(many=True, read_only=True)

    class Meta:
        model = Curso
        fields = ['id', 'nombre', 'descripcion', 'icon', 'profesor', 'nombre_profesor', 'estudiantes', 'modulos', 'activo', 'creado_en']

    def get_nombre_profesor(self, obj):
        if obj.profesor:
            # Intenta obtener nombre completo, si no hay, usa el email
            full_name = obj.profesor.get_full_name()
            return full_name if full_name else obj.profesor.email
        return "Sin asignar"
