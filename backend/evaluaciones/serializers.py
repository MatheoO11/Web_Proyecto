from rest_framework import serializers
from .models import ResultadoD2R, DetalleFilaD2R, SesionAtencion, DetalleAtencion

# --- SERIALIZADORES D2R (Test de Atención) ---

class DetalleFilaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleFilaD2R
        fields = ['numero_fila', 'tr', 'ta', 'eo', 'ec']

class ResultadoD2RSerializer(serializers.ModelSerializer):
    # Aceptamos el array de filas anidado para guardarlo en una sola petición
    filas = DetalleFilaSerializer(many=True)

    class Meta:
        model = ResultadoD2R
        fields = '__all__'
        read_only_fields = ('fecha', 'estudiante') # El estudiante se asigna automáticamente

    def create(self, validated_data):
        # 1. Separamos los datos de las filas
        filas_data = validated_data.pop('filas')

        # 2. Asignamos el usuario logueado
        user = self.context['request'].user
        validated_data['estudiante'] = user

        # 3. Creamos el resultado general (Cabecera)
        # Nota: Como usamos fields='__all__', aceptará 'tot', 'con', 'var' automáticamente
        resultado = ResultadoD2R.objects.create(**validated_data)

        # 4. Creamos el detalle fila por fila
        for fila_data in filas_data:
            DetalleFilaD2R.objects.create(test=resultado, **fila_data)

        return resultado

# --- SERIALIZADORES ATENCIÓN (Cámara/IA) ---

class DetalleAtencionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleAtencion
        fields = ['segundo', 'es_distraido']

class SesionAtencionSerializer(serializers.ModelSerializer):
    # Campo de escritura: Recibe la lista gigante de segundos
    detalle_cronologico = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    # Campo de lectura: Muestra los detalles si consultamos la API
    detalles = DetalleAtencionSerializer(many=True, read_only=True)

    class Meta:
        model = SesionAtencion
        fields = '__all__'
        read_only_fields = ('fecha', 'estudiante', 'nivel')

    def create(self, validated_data):
        # 1. Extraemos el historial de segundos (no es campo del modelo)
        detalles_data = validated_data.pop('detalle_cronologico', [])

        # 2. Asignamos usuario ANTES de crear (evita NOT NULL estudiante_id)
        user = self.context['request'].user
        validated_data['estudiante'] = user

        # 3. Lógica de Nivel (calculada antes de guardar)
        pct = validated_data.get('porcentaje_atencion', 0)
        if pct >= 85:
            validated_data['nivel'] = 'ALTA'
        elif pct >= 60:
            validated_data['nivel'] = 'MEDIA'
        else:
            validated_data['nivel'] = 'BAJA'

        # 4. Creamos la Sesión Padre (una sola vez)
        sesion = super().create(validated_data)

        # 5. Guardamos el detalle segundo a segundo
        if detalles_data:
            lista_detalles = []
            for item in detalles_data:
                lista_detalles.append(DetalleAtencion(
                    sesion=sesion,
                    segundo=item.get('segundo', 0),
                    es_distraido=item.get('distraido', False)
                ))
            DetalleAtencion.objects.bulk_create(lista_detalles)

        return sesion
