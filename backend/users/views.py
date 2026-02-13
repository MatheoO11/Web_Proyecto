from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model, authenticate
from .serializers import UserSerializer

User = get_user_model()

# ✅ 1. VISTA DE LOGIN CORREGIDA PARA 'USERNAME_FIELD = email'
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        # El frontend envía el email dentro del campo 'username'
        email_recibido = request.data.get('username')
        password_recibido = request.data.get('password')

        print(f"📩 Intentando login con Email: {email_recibido}")

        # Como en models.py tienes USERNAME_FIELD = 'email',
        # la función authenticate espera que el argumento 'username' SEA EL EMAIL.
        user = authenticate(username=email_recibido, password=password_recibido)

        if not user:
            print("❌ Falló authenticate(). Verifica contraseña.")
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Usuario inactivo'}, status=status.HTTP_401_UNAUTHORIZED)

        # Si llegamos aquí, todo está bien
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username, # Devuelve el username interno por si acaso
            'rol': getattr(user, 'rol', 'estudiante')
        })

# ✅ 2. VIEWSET DE USUARIOS (Sin cambios)
from django.db.models import Q

# ✅ 2. VIEWSET DE USUARIOS (Sin cambios)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all()

        # Si es Admin, ve todo
        if user.is_staff or getattr(user, 'rol', '') == 'admin':
            pass
            
        # Si es Docente, ve a sí mismo Y a los estudiantes
        elif getattr(user, 'rol', '') == 'docente':
            queryset = queryset.filter(Q(id=user.id) | Q(rol='estudiante'))
            
        # Si es Estudiante, solo se ve a sí mismo
        else:
            queryset = queryset.filter(id=user.id)

        # Filtro por rol (opcional)
        rol_param = self.request.query_params.get('rol')
        if rol_param:
            queryset = queryset.filter(rol=rol_param)

        return queryset

# ✅ 3. VISTA "ME" (Sin cambios)
class UserMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        data['rol'] = getattr(request.user, 'rol', 'estudiante')
        return Response(data)
