@echo off
echo 🚀 Building React frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo 📋 Checking asset manifest...
if not exist "build-good\asset-manifest.json" (
    echo ❌ Build failed or asset manifest not found
    exit /b 1
)

echo ✅ Build completed successfully

echo 🔍 Extracting file hashes from asset manifest...
for /f "tokens=2 delims=:," %%a in ('findstr /r /c:"\"main\.css\":\"" build-good\asset-manifest.json') do (
    for /f "tokens=*" %%b in ("%%a") do set CSS_PATH=%%b
)
for /f "tokens=2 delims=:," %%a in ('findstr /r /c:"\"main\.js\":\"" build-good\asset-manifest.json') do (
    for /f "tokens=*" %%b in ("%%a") do set JS_PATH=%%b
)

set CSS_FILE=%CSS_PATH:/static/css/=%
set CSS_FILE=%CSS_FILE:"=%
set JS_FILE=%JS_PATH:/static/js/=%
set JS_FILE=%JS_FILE:"=%

echo 📄 CSS file: %CSS_FILE%
echo 📄 JS file: %JS_FILE%

echo 📂 Copying static files to Django...
if not exist "..\backend\static\css" mkdir ..\backend\static\css
if not exist "..\backend\static\js" mkdir ..\backend\static\js
copy build-good\static\css\%CSS_FILE% ..\backend\static\css\
copy build-good\static\js\%JS_FILE% ..\backend\static\js\

echo 📝 Updating Django template...
cd ..\backend

powershell -Command "(Get-Content templates/index.html) | ForEach-Object { $_ -replace 'href=\"/static/css/main\.[a-z0-9]*\.css\"', 'href=\"/static/css/%CSS_FILE%\"' } | Set-Content templates/index.html"
powershell -Command "(Get-Content templates/index.html) | ForEach-Object { $_ -replace 'src=\"/static/js/main\.[a-z0-9]*\.js\"', 'src=\"/static/js/%JS_FILE%\"' } | Set-Content templates/index.html"

echo 🔧 Running Django collectstatic...
python manage.py collectstatic --noinput

echo ✅ Static file collection completed!
echo 🌐 Your application should now serve the updated frontend files.
pause