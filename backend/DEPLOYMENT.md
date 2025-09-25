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
cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

## Fixes Applied

1. **Gunicorn Timeout**: Increased from 30s to 120s to prevent worker timeouts
2. **Email Backend**: Temporarily disabled real email sending to prevent SMTP timeouts
3. **Error Handling**: Added comprehensive exception handling to prevent 502 errors
4. **CORS Configuration**: Added production domain to allowed origins

## Re-enabling Real Email

Once the signup process is stable, you can re-enable real email by:

1. Set `USE_REAL_EMAIL=true` in Render environment variables
2. Set `EMAIL_SERVICE=sendgrid`
3. Add your `SENDGRID_API_KEY`
4. Remove the temporary email override in settings.py lines 192-194

## Monitoring

Check Render logs for:
- `🔄 SIGNUP REQUEST START` - signup attempts
- `✅ Email sent successfully` - email delivery
- `❌ CRITICAL SIGNUP ERROR` - any unhandled errors