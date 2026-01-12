# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ESG Portal is a full-stack web application for Environmental, Social, and Governance (ESG) data collection and reporting, designed for SMEs in the UAE hospitality sector. The app uses Django REST Framework backend with React frontend.

## Development Commands

### Backend (Django)
```bash
cd backend

# Initial setup
pip install -r requirements.txt
python manage.py migrate
python manage.py populate_initial_data  # Load frameworks and base data
python manage.py loaddata fixtures/data_elements_fixture.json  # 80 ESG elements
python manage.py loaddata fixtures/profiling_questions_fixture.json  # 22 questions

# Development server
python manage.py runserver 0.0.0.0:8000

# Production
python manage.py collectstatic --no-input

# Database
python manage.py migrate
python manage.py createsuperuser
```

### Frontend (React)
```bash
cd frontend

# Setup
npm install

# Development (multiple options)
npm start              # Port 3000
npm run dev            # Port 3000, CI=false
npm run start:http     # Port 7701 HTTP
npm run start:https    # Port 7701 HTTPS

# Production build
npm run build          # Builds to frontend/build/
```

### Full Stack (from root)
```bash
# Full production build
./build.sh                    # Complete build with fixtures
./build_and_collect_static.sh # Static files only
./build_no_pillow.sh          # Without Pillow dependency

# Development (both terminals)
cd backend && python manage.py runserver 0.0.0.0:8000
cd frontend && npm start
```

## Architecture

### Backend Structure
- **`core/`** - Main Django application containing all business logic
  - `models.py` - Database models (Company, Framework, DataElement, Meter, etc.)
  - `views.py` - REST API ViewSets
  - `serializers.py` - DRF serializers
  - `services.py` - Business logic services (FrameworkService, ProfilingService, DataService)
  - `authentication.py` - Custom session-based authentication with CSRF exemption
  - `management/commands/` - Django management commands
  - `fixtures/` - JSON fixtures for initial data

- **`esg_backend/`** - Django project configuration
  - `settings.py` - Environment-aware settings with .env support
  - `urls.py` - Root URL routing

### Frontend Structure
- **`src/components/`** - React components organized by feature
- **`src/App.js`** - Main app with React Router setup
- **`build/`** - Production build output (copied to Django staticfiles in production)

### Key Architecture Patterns

**Service Layer Pattern**: Business logic is separated into service classes:
- `FrameworkService.assign_mandatory_frameworks()` - Auto-assign frameworks based on emirate/sector
- `ProfilingService.generate_checklist()` - Create personalized data element checklists
- `DataService.submit_data()` - Handle data submission with validation

**Dynamic Framework Assignment**:
- All companies get Core ESG framework (mandatory)
- Dubai + Hospitality companies get DST framework (auto-assigned)
- Voluntary frameworks available via user selection

**Profiling Wizard Flow**:
1. User answers yes/no questions based on selected frameworks
2. System generates personalized checklist of required data elements
3. De-duplication removes duplicates across frameworks
4. Frequency consolidation adopts most frequent cadence

**Meter Management**:
- Auto-creates "Main" meters for metered data elements during checklist generation
- Meters track utility meters and data sources
- Cannot delete meters with associated data (deactivation only)

**Data Collection**:
- Month-centric data entry interface
- Supports both metered and non-metered data elements
- Evidence file uploads for compliance documentation
- Progress tracking (monthly and annual)

### Database Schema Highlights

**Core Models**:
- `Company` - Company info with emirate, sector, active_frameworks JSON field
- `UserProfile` - Extended User with roles (super_user, admin, site_manager, uploader, viewer, meter_manager)
- `Framework` - ESG frameworks (ESG, DST, Green Key)
- `DataElement` - 80+ ESG data elements with categories and collection frequencies
- `CompanyFramework` - Many-to-many with assignment metadata
- `CompanyChecklist` - Personalized data requirements per company
- `Meter` - Company-specific measurement devices
- `CompanyDataSubmission` - Actual data values with evidence files

**Key Relationships**:
- Company → User ( ForeignKey, user owns companies)
- Company → UserProfile (ForeignKey, users belong to companies)
- CompanyFramework → Framework (many frameworks per company)
- CompanyChecklist → DataElement (personalized requirements)
- Meter → DataElement (meters track specific elements)

### Authentication & Authorization

**Session-based authentication** with role-based access control:
- Uses Django sessions with CSRF exemption for API
- 6 user roles: super_user, admin, site_manager, uploader, viewer, meter_manager
- Email verification required (optional SimpleLogin alias support)
- Custom authentication in `core/authentication.py`

### API Structure

RESTful endpoints organized by resource:
- `/api/companies/` - Company CRUD operations
- `/api/frameworks/` - Framework list and assignment
- `/api/data-elements/` - Data element definitions
- `/api/profiling-questions/` - Dynamic questionnaires
- `/api/companies/{id}/meters/` - Meter management
- `/api/companies/{id}/data-submissions/` - Data collection
- `/api/dashboard/` - Dashboard metrics and analytics

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Django
DEBUG=True/False
SECRET_KEY=...

# Email (SMTP or SendGrid)
USE_REAL_EMAIL=true/false
EMAIL_SERVICE=smtp/console
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=noreply@esgportal.com

# SimpleLogin (optional)
SIMPLELOGIN_API_KEY=...
SIMPLELOGIN_ENABLED=true/false

# CORS
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Render/Deployment
RENDER_EXTERNAL_HOSTNAME=...
VERCEL_URL=...
```

### Static File Handling

**Development**: Django dev server serves static files
**Production**: WhiteNoise serves compressed static files from `staticfiles/`
- React builds to `frontend/build/`
- Build scripts copy React build to `backend/staticfiles/`
- `python manage.py collectstatic` aggregates all static files

### Deployment

**Platform**: Render.com (primary), Docker, or Vercel (frontend only)

**Render Build Command**: `./render-build.sh` or `./build.sh`
**Render Start Command**: `cd backend && gunicorn esg_backend.wsgi:application --bind 0.0.0.0:$PORT`

**Build Process**:
1. `npm install && CI=false npm run build` - Build React
2. Copy `frontend/build/*` to `backend/staticfiles/`
3. `pip install -r requirements.txt`
4. `python manage.py collectstatic --no-input`
5. `python manage.py migrate`
6. Load fixtures (data elements, profiling questions)
7. Run initialization scripts

## Important Implementation Details

**Framework Assignment Logic** (`core/services.py:FrameworkService`):
- Core ESG is always mandatory
- DST is mandatory ONLY if emirate='dubai' AND sector='hospitality'
- Other frameworks can be voluntarily selected
- Framework codes stored in `Company.active_frameworks` JSON field

**Checklist Generation** (`core/services.py:ProfilingService`):
- Answers to profiling questions determine which data elements are required
- De-duplication: If element required by multiple frameworks, only show once
- Frequency consolidation: If frameworks conflict on frequency, use highest frequency (Monthly > Quarterly > Annually)

**Meter Auto-Creation** (`core/services.py:ProfilingService.generate_checklist`):
- For each metered data element in checklist, auto-create "Main" meter
- Meter type matches data element category (Electricity, Water, Fuel, etc.)
- Only creates if meter doesn't already exist for that company + element

**Progress Tracking** (`core/services.py:DataService`):
- Monthly progress: % of data entries completed, % of evidence uploaded
- Annual progress: year-to-date completion tracking
- Status indicators: Missing, Partial, Complete

**Email Configuration** (`backend/esg_backend/settings.py`):
- Supports both SMTP and SendGrid
- Console email backend for development (no actual emails sent)
- Set `USE_REAL_EMAIL=true` and configure SMTP settings for production

**CORS Configuration**:
- `CORS_ALLOWED_ORIGINS` from environment variables
- In development: localhost:3000, localhost:7701
- In production: FRONTEND_URL environment variable

## Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## Common Issues & Solutions

**Static files 404 in production**: Run `python manage.py collectstatic --no-input`
**CORS errors**: Check `FRONTEND_URL` and `BACKEND_URL` environment variables
**Database migrations not applied**: Run `python manage.py migrate`
**Fixture data missing**: Run `python manage.py loaddata fixtures/data_elements_fixture.json`
**Build failures on Render**: Check `./build.sh` has execute permissions (`chmod +x build.sh`)

## File Upload Handling

Evidence files stored in `backend/media/` with this structure:
- `media/evidence/{company_id}/{year}/{month}/{data_element_id}/{filename}`

File uploads require:
- User authentication
- Valid company association
- File size limits enforced in Django settings
- File type validation (images, PDFs, documents)
