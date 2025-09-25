"""
Django settings for esg_backend project.
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    # If python-dotenv is not installed, manually load .env file
    env_path = BASE_DIR / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ.setdefault(key, value)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-esg-backend-secret-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# Allowed hosts for production
ALLOWED_HOSTS = [
    'localhost', 
    '127.0.0.1', 
    '0.0.0.0',
    '.onrender.com',  # Allow all Render subdomains
    '.render.com',    # Alternative Render domain
    '.ngrok-free.app',  # ngrok free tier
    '.ngrok.io',        # ngrok legacy domain
    '.ngrok.app',       # ngrok new domain
    '.ngrok.dev',       # ngrok dev domain
    '.vercel.app',      # Vercel deployment domains
    '.vercel.com',      # Vercel custom domains
    'esg-portal-v2-0-v5jv-qy71s8853-aaassems-projects.vercel.app',  # Your specific Vercel URL
]

# Add your specific Render app URL if known
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ.get('RENDER_EXTERNAL_HOSTNAME'))

# Add Vercel deployment URL if known
if os.environ.get('VERCEL_URL'):
    ALLOWED_HOSTS.append(os.environ.get('VERCEL_URL'))

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add whitenoise for static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Add CSRF middleware only in production
if not DEBUG:
    MIDDLEWARE.insert(4, 'django.middleware.csrf.CsrfViewMiddleware')

ROOT_URLCONF = 'esg_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR.parent / 'frontend' / 'build',  # Add React build directory
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'esg_backend.wsgi.application'

# Database
# Use PostgreSQL in production (Render), SQLite in development
try:
    import dj_database_url
except ImportError:
    print("⚠️ dj_database_url not installed - using default database configuration")
    dj_database_url = None

if os.environ.get('DATABASE_URL') and dj_database_url:
    # Production database (Render PostgreSQL)
    try:
        DATABASES = {
            'default': dj_database_url.config(
                default=os.environ.get('DATABASE_URL'),
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
        print("✅ Using production PostgreSQL database")
    except Exception as db_error:
        print(f"❌ Error configuring production database: {db_error}")
        # Fallback to SQLite if database config fails
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
        print("⚠️ Falling back to SQLite database")
else:
    # Development database (SQLite)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("✅ Using development SQLite database")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Dubai'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / "static",
    BASE_DIR.parent / 'frontend' / 'build-good' / 'static',  # React build static files
]
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise configuration for serving static files in production
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage' if not DEBUG else 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Email Configuration
# Use environment variable to control email backend
USE_REAL_EMAIL = os.environ.get('USE_REAL_EMAIL', 'False').lower() == 'true'
EMAIL_SERVICE = os.environ.get('EMAIL_SERVICE', 'console')  # console, smtp, sendgrid

if USE_REAL_EMAIL:
    if EMAIL_SERVICE == 'sendgrid':
        # SendGrid API email sending (recommended)
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        EMAIL_HOST = 'smtp.sendgrid.net'
        EMAIL_PORT = 587
        EMAIL_USE_TLS = True
        EMAIL_HOST_USER = 'apikey'  # This is literally 'apikey' for SendGrid
        EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY')
    else:
        # SMTP email sending (Gmail, etc.)
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
        EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
        EMAIL_USE_TLS = True
        EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
        EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
else:
    # Development: Print emails to console
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Debug email configuration
import sys
print(f"🔍 EMAIL CONFIGURATION DEBUG:", file=sys.stderr)
print(f"   Raw USE_REAL_EMAIL: '{os.environ.get('USE_REAL_EMAIL', 'not set')}'", file=sys.stderr)
print(f"   Parsed USE_REAL_EMAIL: {USE_REAL_EMAIL}", file=sys.stderr)
print(f"   EMAIL_SERVICE: '{EMAIL_SERVICE}'", file=sys.stderr)
print(f"   EMAIL_BACKEND: {EMAIL_BACKEND}", file=sys.stderr)
print(f"   SendGrid Key exists: {bool(os.environ.get('SENDGRID_API_KEY'))}", file=sys.stderr)
print(f"   SendGrid Key first 10 chars: {os.environ.get('SENDGRID_API_KEY', '')[:10]}...", file=sys.stderr)

# Email settings
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@esgportal.com')
EMAIL_SUBJECT_PREFIX = '[ESG Portal] '

# Email verification settings
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24

# Frontend URL for email links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://esg-portal.onrender.com' if not DEBUG else 'http://localhost:3001')

# Backend URL for magic links (API endpoint, not frontend)
# On Render, both frontend and backend are served from same domain but backend handles /api/ routes
BACKEND_URL = os.environ.get('BACKEND_URL', 'https://esg-portal.onrender.com' if not DEBUG else 'http://localhost:8080')

# SimpleLogin settings for email privacy
SIMPLELOGIN_API_KEY = os.environ.get('SIMPLELOGIN_API_KEY', 'kgijojjqlgkqxfulqakbaenrheratgmrwpiviivigetoqabomfhaxtkvmndv')
SIMPLELOGIN_BASE_URL = os.environ.get('SIMPLELOGIN_BASE_URL', 'https://app.simplelogin.io')
SIMPLELOGIN_ALIAS_SUFFIX = os.environ.get('SIMPLELOGIN_ALIAS_SUFFIX', '@simplelogin.io')
SIMPLELOGIN_ENABLED = os.environ.get('SIMPLELOGIN_ENABLED', 'False').lower() == 'true'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # For development
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,  # Increased to handle comprehensive ESG framework (80 elements)
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# CSRF Configuration
# Different settings for development vs production
if DEBUG:
    # Development: Relaxed CSRF settings
    CSRF_USE_SESSIONS = False
    CSRF_COOKIE_SECURE = False  
    CSRF_COOKIE_HTTPONLY = False
    CSRF_COOKIE_SAMESITE = 'Lax'
else:
    # Production: CSRF settings for HTTPS/SPA
    CSRF_USE_SESSIONS = False  # Don't tie to sessions for API
    CSRF_COOKIE_SECURE = True  # HTTPS only
    CSRF_COOKIE_HTTPONLY = False  # Allow JS access for SPA
    CSRF_COOKIE_SAMESITE = 'Lax'  # Changed from 'None' - works better with same-origin
    CSRF_COOKIE_NAME = 'csrftoken'
    CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'
    CSRF_COOKIE_AGE = 31449600  # 1 year
    CSRF_COOKIE_PATH = '/'
    CSRF_COOKIE_DOMAIN = None  # Auto-detect domain
    
    # Session cookie settings for production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True  # Sessions should be HTTP-only for security
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_AGE = 1209600  # 2 weeks

# CORS settings - Allow React frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:7701",  # Previous frontend port
    "http://localhost:7702",  # Current frontend port
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:7701",  # Current frontend port
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://esg-portal.onrender.com",  # Production URL
    "https://esg-portal-v2-0-v5jv-qy71s8853-aaassems-projects.vercel.app",  # Your Vercel URL
]

# Add Render URLs to CORS if in production
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    CORS_ALLOWED_ORIGINS.extend([
        f"https://{os.environ.get('RENDER_EXTERNAL_HOSTNAME')}",
        f"http://{os.environ.get('RENDER_EXTERNAL_HOSTNAME')}",
    ])

# Allow all origins with production domains
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.onrender\.com$",
    r"^http://.*\.onrender\.com$",
    r"^https://.*\.ngrok-free\.app$",
    r"^https://.*\.ngrok\.io$",
    r"^https://.*\.ngrok\.app$",
    r"^https://.*\.ngrok\.dev$",
    r"^https://.*\.vercel\.app$",  # Vercel domains
    r"^https://.*\.vercel\.com$",  # Vercel custom domains
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only allow all origins in development
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Time zone settings
USE_TZ = True

# CSRF Trusted Origins for Render
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
    'http://localhost:7701',
    'http://127.0.0.1:7701',
    'http://localhost:7702',
    'http://127.0.0.1:7702',
    'https://esg-portal.onrender.com',  # Production URL
    'https://*.onrender.com',
    'http://*.onrender.com',
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
    'https://*.ngrok.app',
    'https://*.ngrok.dev',
]

# Add specific Render app URL if known
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    CSRF_TRUSTED_ORIGINS.append(f"https://{os.environ.get('RENDER_EXTERNAL_HOSTNAME')}")

# File uploads (removed Pillow dependency for now)
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Logging configuration for production debugging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if not DEBUG else 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if not DEBUG else 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# UAE Emirates choices
UAE_EMIRATES = [
    ('dubai', 'Dubai'),
    ('abu_dhabi', 'Abu Dhabi'),
    ('sharjah', 'Sharjah'),
    ('ajman', 'Ajman'),
    ('umm_al_quwain', 'Umm Al Quwain'),
    ('ras_al_khaimah', 'Ras Al Khaimah'),
    ('fujairah', 'Fujairah'),
]

# Sector choices
SECTORS = [
    ('hospitality', 'Hospitality'),
    ('real_estate', 'Real Estate'),
    ('financial_services', 'Financial Services'),
    ('manufacturing', 'Manufacturing'),
    ('technology', 'Technology'),
    ('healthcare', 'Healthcare'),
    ('education', 'Education'),
    ('retail', 'Retail'),
]