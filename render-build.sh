#!/bin/bash

# Build script for Render deployment

set -o errexit  # Exit on error

echo "🚀 Starting build process for ESG Portal..."

# Navigate to the project root
echo "📍 Current directory: $(pwd)"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Navigate to frontend directory and build React app
echo "🔨 Setting up React frontend..."
cd frontend
npm install
# Skip npm run build - we'll use the pre-built good version
echo "📦 Using pre-built frontend files..."
cd ..

# Navigate to backend directory 
echo "🔧 Setting up Django backend..."
cd backend

# Collect static files (includes React build)
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "🗃️  Running database migrations..."
python manage.py migrate

# Load 80 ESG framework elements from fixtures
echo "📊 Loading comprehensive ESG framework (80 elements)..."
python manage.py loaddata fixtures/data_elements_fixture.json || echo "⚠️ Data elements fixture not found"

# Create missing DataElements needed for profiling questions
echo "➕ Creating missing DataElements..."
python manage.py create_missing_elements

# Populate profiling questions for the wizard (now all 22 will work)
echo "❓ Populating profiling questions..."
python manage.py populate_profiling_questions

# Populate initial data if needed (development only)
if [ "$NODE_ENV" != "production" ]; then
    echo "🌱 Populating initial data..."
    python manage.py populate_initial_data || true
fi

echo "✅ Build completed successfully!"
echo "🌐 Ready for deployment on Render"