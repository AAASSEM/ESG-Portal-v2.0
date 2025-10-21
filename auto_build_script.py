#!/usr/bin/env python3
"""
Automated React + Django Build Script
Run this instead of 'npm run build' to automatically sync everything
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Color codes for pretty output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_step(step, message):
    print(f"\n{BLUE}[Step {step}]{RESET} {message}")

def print_success(message):
    print(f"{GREEN}✓{RESET} {message}")

def print_error(message):
    print(f"{RED}✗{RESET} {message}")

def print_warning(message):
    print(f"{YELLOW}⚠{RESET} {message}")

def main():
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}  React + Django Automated Build Script{RESET}")
    print(f"{GREEN}{'='*60}{RESET}\n")
    
    # Get project root directory
    project_root = Path(__file__).parent.absolute()
    frontend_dir = project_root / "frontend"
    backend_dir = project_root / "backend"
    
    # Step 1: Build React app
    print_step(1, "Building React frontend...")
    try:
        os.chdir(frontend_dir)
        result = subprocess.run(["npm", "run", "build"], 
                              capture_output=True, 
                              text=True, 
                              check=True)
        print_success("React build completed successfully!")
    except subprocess.CalledProcessError as e:
        print_error(f"React build failed: {e}")
        print(e.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print_error("npm not found. Make sure Node.js is installed!")
        sys.exit(1)
    
    # Step 2: Find generated files
    print_step(2, "Finding generated files...")
    
    build_dir = frontend_dir / "build" / "static"
    css_dir = build_dir / "css"
    js_dir = build_dir / "js"
    
    # Find main CSS file
    css_files = list(css_dir.glob("main.*.css"))
    if not css_files:
        print_error("No CSS file found!")
        sys.exit(1)
    css_file = css_files[0]
    css_filename = css_file.name
    print_success(f"Found CSS: {css_filename}")
    
    # Find main JS file
    js_files = list(js_dir.glob("main.*.js"))
    if not js_files:
        print_error("No JS file found!")
        sys.exit(1)
    js_file = js_files[0]
    js_filename = js_file.name
    print_success(f"Found JS: {js_filename}")
    
    # Step 3: Copy files to Django static directories
    print_step(3, "Copying files to Django static directories...")
    
    django_css_dir = backend_dir / "static" / "css"
    django_js_dir = backend_dir / "static" / "js"
    
    # Create directories if they don't exist
    django_css_dir.mkdir(parents=True, exist_ok=True)
    django_js_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy files
    shutil.copy2(css_file, django_css_dir / css_filename)
    print_success(f"Copied {css_filename} to backend/static/css/")
    
    shutil.copy2(js_file, django_js_dir / js_filename)
    print_success(f"Copied {js_filename} to backend/static/js/")
    
    # Step 4: Update Django template
    print_step(4, "Updating Django template...")
    
    template_file = backend_dir / "templates" / "index.html"
    
    if not template_file.exists():
        print_error(f"Template file not found: {template_file}")
        sys.exit(1)
    
    # Read template
    with open(template_file, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    # Update CSS reference
    template_content = re.sub(
        r'<link href="/static/css/main\.[a-f0-9]+\.css"',
        f'<link href="/static/css/{css_filename}"',
        template_content
    )
    
    # Update JS reference
    template_content = re.sub(
        r'<script defer="defer" src="/static/js/main\.[a-f0-9]+\.js"',
        f'<script defer="defer" src="/static/js/{js_filename}"',
        template_content
    )
    
    # Write updated template
    with open(template_file, 'w', encoding='utf-8') as f:
        f.write(template_content)
    
    print_success("Django template updated successfully!")
    
    # Step 5: Clean up old files (optional)
    print_step(5, "Cleaning up old build files...")
    
    # Remove old CSS files
    for old_file in django_css_dir.glob("main.*.css"):
        if old_file.name != css_filename:
            old_file.unlink()
            print_success(f"Removed old file: {old_file.name}")
    
    # Remove old JS files
    for old_file in django_js_dir.glob("main.*.js"):
        if old_file.name != js_filename:
            old_file.unlink()
            print_success(f"Removed old file: {old_file.name}")
    
    # Final summary
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}  Build Complete! 🎉{RESET}")
    print(f"{GREEN}{'='*60}{RESET}")
    print(f"\n📦 Files ready:")
    print(f"   • CSS: {css_filename}")
    print(f"   • JS:  {js_filename}")
    print(f"\n🚀 Next step:")
    print(f"   cd backend")
    print(f"   python manage.py runserver 0.0.0.0:8080")
    print()

if __name__ == "__main__":
    main()
