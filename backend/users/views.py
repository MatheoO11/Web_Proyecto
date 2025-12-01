from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import CustomUser

@api_view(['POST'])
def login_api(request):
    email = request.data.get('email')
    password = request.data.get('password')

    # Django verifica las credenciales automágicamente
    user = authenticate(request, username=email, password=password)

    if user is not None:
        # Generar o obtener token
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'nombre': user.first_name,
                'rol': user.rol  # Aquí enviamos el rol al Frontend
            }
        })
    else:
        return Response({'error': 'Credenciales inválidas'}, status=400)
