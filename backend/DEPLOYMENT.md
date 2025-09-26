# Production Deployment Instructions

## Render Deployment Configuration

### Start Command
Update your Render start command to use the gunicorn configuration:

```bash
cd backend && gunicorn esg_backend.wsgi:application --config gunicorn.conf.py
```

Alternative start command with inline parameters:
```bash
cd backend && gunicorn esg_backend.wsgi:application --timeout 120 --workers 2 --bind 0.0.0.0:10000
```

### Environment Variables
Set these in your Render dashboard:

```bash
DEBUG=False
USE_REAL_EMAIL=False  # Temporarily disabled to prevent timeouts
DATABASE_URL=your-postgres-url-here
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=esg-portal.onrender.com
```

### Build Command
```bash
cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py populate_profiling_questions && python manage.py collectstatic --noinput
```

### Post-Deployment Setup
After deployment, run this command to ensure profiling questions are populated:

```bash
python manage.py populate_profiling_questions
```

This command will:
- Populate all 22 profiling questions needed for the wizard
- Skip questions where corresponding data elements don't exist
- Can be run multiple times safely (idempotent)

## Fixes Applied

1. **Gunicorn Timeout**: Increased from 30s to 120s to prevent worker timeouts
2. **SendGrid Web API**: Implemented HTTP-based email sending to bypass SMTP port 587 blocking
3. **Email Diagnostics**: Added comprehensive logging for email configuration and sending
4. **Error Handling**: Added comprehensive exception handling to prevent 502 errors
5. **CORS Configuration**: Added production domain to allowed origins

## Email Sending Solution

### The Problem
Render's free tier blocks outbound SMTP on port 587, preventing email sending via SMTP.

### The Solution
- **SendGrid Web API**: Uses HTTPS (port 443) instead of SMTP (port 587)
- **Automatic Fallback**: Falls back to SMTP in development or if API unavailable
- **Better Diagnostics**: Detailed logging shows exactly what's happening

### Environment Variables for Real Email

Set these in Render dashboard:

```bash
USE_REAL_EMAIL=true
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEBUG=False
```

### Email Flow
1. **Production**: Uses SendGrid Web API (HTTPS)
2. **Development**: Uses console backend (prints to terminal)
3. **Fallback**: SMTP if Web API fails or unavailable

## Monitoring

Check Render logs for:
- `🔄 SIGNUP REQUEST START` - signup attempts
- `✅ Email sent successfully` - email delivery
- `❌ CRITICAL SIGNUP ERROR` - any unhandled errors