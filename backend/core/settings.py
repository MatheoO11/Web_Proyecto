"""
Django settings for core project.
"""

from pathlib import Path
import os

# ✅ NUEVO: para Postgres en Railway (DATABASE_URL)
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Intentar cargar variables de entorno si existe un archivo .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# SECURITY WARNING: keep the secret key used in production secret!
# ✅ CAMBIO: usa env si existe (Railway), si no, usa la tuya local (no rompe local)
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-ejfm5l40fce2pfb8*r#wj%$!e8kmy7sfg$2cx_o38(p0s^l+im"
)

# SECURITY WARNING: don't run with debug turned on in production!
# ✅ CAMBIO: en Railway pon DEBUG=0; en local seguirá True si no defines nada
DEBUG = os.getenv("DEBUG", "1") == "1"

# ✅ CAMBIO: hosts para Railway + local
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]
_extra_hosts = os.getenv("ALLOWED_HOSTS", "")
if _extra_hosts:
    ALLOWED_HOSTS += [h.strip() for h in _extra_hosts.split(",") if h.strip()]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Librerías de terceros
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',

    # Extensiones
    'django_extensions',

    # TUS APLICACIONES
    'users',
    'courses',
    'evaluaciones',
    'analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ✅ Debe ir primero
    'django.middleware.security.SecurityMiddleware',

    # ✅ NUEVO: WhiteNoise para estáticos del admin en producción
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# ✅ CAMBIO IMPORTANTE: SQLite en local, Postgres en Railway si existe DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
# ✅ No toco tu lógica, pero para Ecuador puedes cambiar si quieres
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# ✅ NUEVO: requerido para WhiteNoise en Railway
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- CONFIGURACIÓN PROPIA Y CORS (SOLUCIÓN PANTALLA BLANCA) ---

AUTH_USER_MODEL = 'users.CustomUser'

# ✅ CORS: mantengo lo tuyo y agrego opción para Vercel por env
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if FRONTEND_URL and FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(FRONTEND_URL)

# 2. CREDENTIALS (Importante para sesiones persistentes)
CORS_ALLOW_CREDENTIALS = True

# 3. HEADERS PERMITIDOS (¡ESTO ES LO QUE TE FALTABA!)
from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'content-type',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Útil para ver la API en navegador
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # Por defecto todo privado
    ],
}

# API KEY DE GOOGLE (bien por env)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
