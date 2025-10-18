#!/bin/bash

echo "🚀 Building React frontend..."
cd frontend
npm run build

echo "📋 Checking asset manifest..."
if [ -f "build/asset-manifest.json" ]; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed or build directory not found"
    exit 1
fi

echo "🔍 Extracting file hashes from asset manifest..."
CSS_FILE=$(grep -o '"main\.css":"[^"]*"' build/asset-manifest.json | cut -d'"' -f4 | xargs basename)
JS_FILE=$(grep -o '"main\.js":"[^"]*"' build/asset-manifest.json | cut -d'"' -f4 | xargs basename)

echo "📄 CSS file: $CSS_FILE"
echo "📄 JS file: $JS_FILE"

echo "📂 Copying static files to Django..."
mkdir -p ../backend/static/css
mkdir -p ../backend/static/js
cp build/static/css/$CSS_FILE ../backend/static/css/
cp build/static/js/$JS_FILE ../backend/static/js/

echo "📝 Updating Django template..."
cd ../backend
sed -i "s|href=\"/static/css/main\.[a-z0-9]*\.css\"|href=\"/static/css/$CSS_FILE\"|g" templates/index.html
sed -i "s|src=\"/static/js/main\.[a-z0-9]*\.js\"|src=\"/static/js/$JS_FILE\"|g" templates/index.html

echo "🔧 Running Django collectstatic..."
python manage.py collectstatic --noinput

echo "✅ Static file collection completed!"
echo "🌐 Your application should now serve the updated frontend files."