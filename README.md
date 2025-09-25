# ESG Portal - Comprehensive Sustainability Management Application

## Overview

ESG Portal is a comprehensive Environmental, Social, and Governance (ESG) data collection and reporting application designed specifically for Small and Medium Enterprises (SMEs) in the UAE hospitality sector. The application streamlines ESG compliance by providing an intelligent onboarding system, automated framework assignment, and integrated data collection workflows.

## Key Features

### 🏢 Company Onboarding
- **Basic Information Collection**: Emirates, sector, and business activities
- **Dynamic Activity Selection**: Pre-defined hospitality activities with custom addition capability
- **Select All/Deselect All**: Bulk selection functionality for activities

### 📋 Framework Management
- **Automatic Framework Assignment**: 
  - Core ESG framework (mandatory for all)
  - Dubai Sustainable Tourism (DST) framework for Dubai-based entities
  - Geographic and sector-specific conditional frameworks
- **Voluntary Framework Selection**: Green Key certification and other optional standards
- **Framework Hierarchy**: Primary mandatory (DST), secondary mandatory (ESG), and voluntary frameworks

### 🔍 Profiling Wizard & Data Checklist
- **Intelligent Questionnaire**: Dynamic yes/no questions based on selected frameworks
- **Smart Data Element Generation**: Personalized checklist combining mandatory and conditional requirements
- **De-duplication Logic**: Eliminates duplicate data elements across multiple frameworks
- **Frequency Consolidation**: Adopts most frequent collection cadence when frameworks conflict

### 📊 Meter Management
- **Auto-meter Creation**: Automatic generation of "Main" meters for all metered data elements
- **Full CRUD Operations**: Create, read, update, delete functionality
- **Meter Attributes**: Type, name, account number, location, and status tracking
- **Data Protection**: Cannot delete meters with associated data (deactivation only)

### 📈 Data Collection & Tracking
- **Month-Centric Interface**: Year and month selection with current year logic
- **Unified Data Entry**: Single view for all collection tasks including metered and non-metered items
- **Evidence Upload**: Support for uploading supporting documentation
- **Progress Tracking**: 
  - Monthly completion rates for data entry and evidence
  - Annual progress tracking with visual progress bars
- **Status Indicators**: Missing, Partial, Complete status for each data entry

### 📊 Dashboard & Analytics
- **Key Metrics Display**: Active frameworks, data elements, registered meters
- **Data Visualization**: Charts showing collected data trends and patterns
- **Progress Overview**: Comprehensive view of completion status

## Technology Stack

### Backend
- **Framework**: Django 4.2.7 with Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: Session-based authentication
- **Static Files**: WhiteNoise for static file serving
- **Production Server**: Gunicorn WSGI server

### Frontend
- **Framework**: React 18 with modern JavaScript (ES6+)
- **Styling**: Tailwind CSS with responsive design
- **HTTP Client**: Fetch API for REST API communication
- **Build Tool**: Create React App with production optimizations

### Deployment
- **Platform**: Render.com
- **Build Process**: Automated React build with Django collectstatic
- **Environment**: Production-ready configuration with environment variables

## Database Schema

### Core Entities
- **Companies**: Company information and registration details
- **Activities**: Business activities with many-to-many relationship to companies
- **Frameworks**: ESG frameworks (mandatory, voluntary, conditional)
- **DataElements**: Master list of all possible data collection points
- **ProfilingQuestions**: Dynamic questionnaire for personalized data requirements

### Data Collection
- **Meters**: Company-specific measurement devices and sources
- **CompanyDataSubmissions**: Actual data values with evidence file support
- **CompanyProfileAnswers**: Stored responses to profiling questions

## API Endpoints

### Company Management
- `GET /api/companies/` - List companies
- `POST /api/companies/` - Create company
- `GET /api/companies/{id}/` - Get company details
- `PUT /api/companies/{id}/` - Update company

### Framework & Data Elements
- `GET /api/frameworks/` - List available frameworks
- `GET /api/data-elements/` - List data elements
- `GET /api/profiling-questions/` - Get profiling questions
- `POST /api/profiling-questions/save_answers/` - Save profiling responses

### Meter Management
- `GET /api/companies/{id}/meters/` - List company meters
- `POST /api/companies/{id}/meters/` - Create meter
- `PUT /api/meters/{id}/` - Update meter
- `DELETE /api/meters/{id}/` - Delete/deactivate meter

### Data Collection
- `GET /api/companies/{id}/profile_answers/` - Get saved answers
- `POST /api/companies/{id}/save_profile_answer/` - Save individual answers
- `GET /api/companies/{id}/data-submissions/` - Get submitted data
- `POST /api/companies/{id}/data-submissions/` - Submit data with evidence

## Installation & Setup

### Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ESG-Portal
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py populate_initial_data
   python manage.py runserver 0.0.0.0:8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Production Deployment on Render

1. **Build Command**: `./render-build.sh`
2. **Start Command**: `cd backend && gunicorn esg_backend.wsgi:application --bind 0.0.0.0:$PORT`
3. **Environment Variables**: Configure database and security settings

## ESG Framework Coverage

### Dubai Sustainable Tourism (DST)
- **19 Sustainability Requirements** covering energy, water, waste, community engagement
- **Monthly/Annual Cadence** for different data elements
- **Mandatory for Dubai hospitality entities**

### Green Key Certification
- **13 Criteria Areas** including water efficiency, waste management, energy conservation
- **Voluntary eco-label** with comprehensive sustainability metrics
- **Focus on operational improvements** and guest engagement

### UAE ESG Reporting
- **Comprehensive ESG Coverage** including carbon footprint, diversity metrics
- **Governance Requirements** for listed companies
- **Annual reporting cadence** with third-party verification support

## Data Element Categories

### Must-Have Elements (All Entities)
- Electricity and water consumption
- Waste to landfill tracking  
- Sustainability policies and personnel
- Employee training and community initiatives
- Government compliance and risk management

### Conditional Elements (Based on Operations)
- Generator and vehicle fuel consumption
- LPG usage for kitchen operations
- Green meeting/event services
- Renewable energy utilization
- Food sourcing and waste management

## Progress Tracking

### Monthly Progress
- Data entry completion percentage
- Evidence upload completion percentage
- Visual progress bars with real-time updates

### Annual Progress  
- Year-to-date completion tracking
- Framework-specific compliance status
- Trend analysis and reporting gaps

## Security Features

- **CORS Configuration**: Secure cross-origin resource sharing
- **Input Validation**: Comprehensive data validation and sanitization
- **File Upload Security**: Secure evidence file handling
- **Production Security**: Environment-based configuration management

## Support & Documentation

### User Journey
1. **Company Onboarding**: Register company and select business activities
2. **Framework Selection**: Automatic and voluntary framework assignment
3. **Profiling Wizard**: Answer questions to personalize data requirements
4. **Meter Setup**: Configure measurement devices and data sources
5. **Data Collection**: Monthly data entry with evidence upload
6. **Dashboard Review**: Monitor progress and analyze trends

### File Structure
```
ESG-Portal/
├── backend/              # Django backend application
│   ├── core/            # Main application logic
│   ├── esg_backend/     # Project configuration
│   └── requirements.txt # Python dependencies
├── frontend/            # React frontend application  
│   ├── src/components/  # React components
│   ├── public/         # Static assets
│   └── package.json    # Node.js dependencies
└── render-build.sh     # Production build script
```

## Contributing

The application follows Django and React best practices with:
- RESTful API design
- Component-based frontend architecture
- Comprehensive error handling
- Responsive design principles
- Production-ready deployment configuration

---

*ESG Portal v1.0 - Streamlining sustainability compliance for UAE hospitality sector*
