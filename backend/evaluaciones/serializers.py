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
        read_only_fields = ('fecha', 'estudiante')  # El estudiante se asigna automáticamente

    def create(self, validated_data):
        """
        OPCIÓN A (Recomendada):
        - El Frontend puede calcular y enviar totales/índices,
          pero el Backend SIEMPRE recalcula desde 'filas' y sobrescribe.
        - Esto evita manipulación de resultados y deja todo consistente.
        """

        # 1) Separamos los datos de las filas
        filas_data = validated_data.pop('filas', [])

        # 2) Asignamos el usuario logueado
        user = self.context['request'].user
        validated_data['estudiante'] = user

        # --- Recalcular totales desde filas (fuente de verdad) ---
        def _to_int(v):
            try:
                return int(v)
            except Exception:
                return 0

        tr_total_calc = sum(_to_int(f.get('tr', 0)) for f in filas_data)
        ta_total_calc = sum(_to_int(f.get('ta', 0)) for f in filas_data)
        eo_total_calc = sum(_to_int(f.get('eo', 0)) for f in filas_data)
        ec_total_calc = sum(_to_int(f.get('ec', 0)) for f in filas_data)

        # Fórmulas actuales según tu frontend:
        # TOT = TR total
        tot_calc = tr_total_calc

        # CON = TA - EC
        con_calc = ta_total_calc - ec_total_calc

        # VAR = (max(TR fila) - min(TR fila))
        tr_por_fila = [_to_int(f.get('tr', 0)) for f in filas_data]
        var_calc = (max(tr_por_fila) - min(tr_por_fila)) if tr_por_fila else 0.0

        # 3) Sobrescribimos siempre con cálculo del backend (seguro)
        validated_data['tr_total'] = tr_total_calc
        validated_data['ta_total'] = ta_total_calc
        validated_data['eo_total'] = eo_total_calc
        validated_data['ec_total'] = ec_total_calc
        validated_data['tot'] = tot_calc
        validated_data['con'] = float(con_calc)
        validated_data['var'] = float(var_calc)

        # 4) Creamos el resultado general (Cabecera)
        # Nota: interpretacion puede venir del frontend y se guarda tal cual
        resultado = ResultadoD2R.objects.create(**validated_data)

        # 5) Creamos el detalle fila por fila
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
