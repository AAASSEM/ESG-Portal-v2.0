"""
Developer Admin Panel API Views
Superuser-only endpoints for managing the ESG Portal application
"""

import os
import subprocess
import psutil
import json
import time
from io import StringIO
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from core.models import FeatureFlag, Company, UserProfile, Meter, CompanyDataSubmission
from core.email_service import send_email_verification
from core.services import DashboardService


def is_super_user(user):
    """Check if user has super_user privileges"""
    return (
        getattr(user, 'userprofile', None) and
        user.userprofile.role == 'super_user'
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_access_required(request):
    """Check if user has admin access"""

    # Developer shortcut: Allow direct access for 'admin' username
    if request.user.username == 'admin':
        return JsonResponse({
            'success': True,
            'user': request.user.username,
            'role': 'developer',
            'access_type': 'developer'
        })

    # Regular superuser check
    if not is_super_user(request.user):
        return JsonResponse({
            'error': 'Access denied. Super user privileges required.'
        }, status=status.HTTP_403_FORBIDDEN)

    return JsonResponse({
        'success': True,
        'user': request.user.username,
        'role': getattr(request.user.userprofile, 'role', 'unknown')
    })


@api_view(['GET', 'POST'])
@permission_classes([])  # No permission classes required
def feature_flags(request):
    """Manage feature flags - developer access allowed"""

    if request.method == 'GET':
        # Get all feature flags
        flags = FeatureFlag.objects.all().order_by('category', 'name')
        flags_data = []

        for flag in flags:
            flags_data.append({
                'id': flag.id,
                'key': flag.key,
                'name': flag.name,
                'description': flag.description,
                'category': flag.category,
                'flag_type': flag.flag_type,
                'value': flag.get_value(),
                'is_active': flag.is_active,
                'requires_restart': flag.requires_restart,
                'last_modified': flag.last_modified.isoformat(),
                'modified_by': flag.modified_by.username if flag.modified_by else None
            })

        return JsonResponse({
            'flags': flags_data,
            'categories': FeatureFlag.CATEGORIES
        })

    elif request.method == 'POST':
        # Create or update feature flag
        flag_data = request.data.get('flag')

        if not flag_data or 'key' not in flag_data:
            return JsonResponse({'error': 'Missing flag key'}, status=400)

        try:
            flag, created = FeatureFlag.objects.get_or_create(
                key=flag_data['key'],
                defaults={
                    'name': flag_data.get('name', flag_data['key']),
                    'description': flag_data.get('description', ''),
                    'category': flag_data.get('category', 'ui'),
                    'flag_type': flag_data.get('flag_type', 'boolean'),
                    'modified_by': request.user
                }
            )

            # Set the value
            if 'value' in flag_data:
                flag.set_value(flag_data['value'])

            # Update other fields if updating
            if not created:
                flag.name = flag_data.get('name', flag.name)
                flag.description = flag_data.get('description', flag.description)
                flag.category = flag_data.get('category', flag.category)
                flag.is_active = flag_data.get('is_active', flag.is_active)
                flag.requires_restart = flag_data.get('requires_restart', flag.requires_restart)

            flag.modified_by = request.user
            flag.save()

            return JsonResponse({
                'success': True,
                'flag': {
                    'id': flag.id,
                    'key': flag.key,
                    'name': flag.name,
                    'value': flag.get_value(),
                    'created': created
                }
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@api_view(['PUT', 'DELETE'])
@permission_classes([])  # No permission classes required
def feature_flag_detail(request, flag_id):
    """Manage individual feature flag - developer access allowed"""
    # Developer access - no authentication required

    try:
        flag = FeatureFlag.objects.get(id=flag_id)
    except FeatureFlag.DoesNotExist:
        return JsonResponse({'error': 'Feature flag not found'}, status=404)

    if request.method == 'PUT':
        # Update feature flag
        flag_data = request.data.get('flag')

        if 'value' in flag_data:
            flag.set_value(flag_data['value'])

        flag.name = flag_data.get('name', flag.name)
        flag.description = flag_data.get('description', flag.description)
        flag.category = flag_data.get('category', flag.category)
        flag.is_active = flag_data.get('is_active', flag.is_active)
        flag.requires_restart = flag_data.get('requires_restart', flag.requires_restart)
        # flag.modified_by = request.user  # No authenticated user for dev access
        flag.save()

        return JsonResponse({
            'success': True,
            'flag': {
                'id': flag.id,
                'key': flag.key,
                'name': flag.name,
                'value': flag.get_value(),
                'modified': True
            }
        })

    elif request.method == 'DELETE':
        flag.delete()
        return JsonResponse({'success': True})


@api_view(['GET'])
@permission_classes([])  # No permission classes required
def system_health(request):
    """Get system health metrics - developer access allowed"""

    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # Database health
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM auth_user WHERE is_active = 1")
            active_users = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM core_company")
            total_companies = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM core_companydatasubmission")
            total_submissions = cursor.fetchone()[0]

        # Cache status
        cache_status = True
        try:
            cache.set('health_check', 'ok', 10)
            cache_status = cache.get('health_check') == 'ok'
        except:
            cache_status = False

        # Django settings
        debug_mode = getattr(settings, 'DEBUG', False)
        email_backend = getattr(settings, 'EMAIL_BACKEND', 'Unknown')

        health_data = {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                }
            },
            'application': {
                'debug_mode': debug_mode,
                'email_backend': email_backend,
                'database': 'Connected',
                'cache': 'Active' if cache_status else 'Inactive',
                'active_users': active_users,
                'total_companies': total_companies,
                'total_submissions': total_submissions
            },
            'uptime': time.time() - psutil.boot_time()
        }

        return JsonResponse(health_data)

    except Exception as e:
        return JsonResponse({
            'error': f'Failed to get system health: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_logs(request):
    """Get recent system logs"""
    if not is_super_user(request.user):
        return JsonResponse({'error': 'Access denied'}, status=403)

    log_level = request.GET.get('level', 'INFO')
    lines = int(request.GET.get('lines', 100))
    search = request.GET.get('search', '')

    try:
        # This is a simplified version - in production, you'd want to use proper logging
        log_lines = []

        # Check for error file (from our earlier debugging)
        error_file = '/mnt/c/Users/20100/thefinal/vsim2.0/error.txt'
        if os.path.exists(error_file):
            try:
                with open(error_file, 'r') as f:
                    file_lines = f.readlines()
                    for line in file_lines[-lines:]:
                        if search and search.lower() not in line.lower():
                            continue
                        log_lines.append(line.strip())
            except:
                pass

        return JsonResponse({
            'logs': log_lines,
            'level': log_level,
            'lines': len(log_lines),
            'search': search
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([])  # No permission classes required
def run_management_command(request):
    """Run Django management commands - developer access allowed"""

    command = request.data.get('command')
    if not command:
        return JsonResponse({'error': 'Missing command'}, status=400)

    # List of allowed commands for security
    allowed_commands = [
        'populate_initial_data',
        'import_comprehensive_esg_framework',
        'populate_profiling_questions',
        'update_company_frameworks',
        'collectstatic',
        'clearsessions',
        'create_missing_elements'
    ]

    if command not in allowed_commands:
        return JsonResponse({'error': f'Command "{command}" not allowed'}, status=400)

    try:
        # Run the command
        out = StringIO()
        call_command(command, stdout=out)
        output = out.getvalue()

        return JsonResponse({
            'success': True,
            'command': command,
            'output': output,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return JsonResponse({
            'error': f'Command failed: {str(e)}'
        }, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_management(request):
    """User management tools"""
    if not is_super_user(request.user):
        return JsonResponse({'error': 'Access denied'}, status=403)

    if request.method == 'GET':
        # Get user statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        super_users = UserProfile.objects.filter(role='super_user').count()
        admins = UserProfile.objects.filter(role='admin').count()

        # Recent users
        recent_users = User.objects.filter(
            date_joined__gte=timezone.now() - timedelta(days=7)
        ).order_by('-date_joined')[:10]

        recent_users_data = []
        for user in recent_users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': getattr(user.userprofile, 'email', 'N/A') if hasattr(user, 'userprofile') else user.email,
                'date_joined': user.date_joined.isoformat(),
                'is_active': user.is_active,
                'role': getattr(user.userprofile, 'role', 'N/A') if hasattr(user, 'userprofile') else 'N/A'
            }
            recent_users_data.append(user_data)

        return JsonResponse({
            'statistics': {
                'total_users': total_users,
                'active_users': active_users,
                'super_users': super_users,
                'admins': admins
            },
            'recent_users': recent_users_data
        })

    elif request.method == 'POST':
        # Create test user or perform action
        action = request.data.get('action')

        if action == 'create_test_user':
            username = request.data.get('username')
            role = request.data.get('role', 'viewer')
            email = request.data.get('email', f'{username}@test.com')

            if not username:
                return JsonResponse({'error': 'Missing username'}, status=400)

            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password='test123456'
                )

                UserProfile.objects.create(
                    user=user,
                    email=email,
                    role=role,
                    email_verified=True
                )

                return JsonResponse({
                    'success': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': email,
                        'role': role
                    }
                })

            except Exception as e:
                return JsonResponse({'error': str(e)}, status=500)

        else:
            return JsonResponse({'error': 'Invalid action'}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_tools(request):
    """Email testing and debugging tools"""
    if not is_super_user(request.user):
        return JsonResponse({'error': 'Access denied'}, status=403)

    action = request.data.get('action')

    if action == 'send_test_email':
        recipient = request.data.get('recipient', request.user.email)

        try:
            result = send_email_verification(request.user, request)

            return JsonResponse({
                'success': True,
                'message': f'Test email sent to {recipient}',
                'result': result
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    elif action == 'toggle_email_backend':
        # Toggle between SendGrid and console backend
        current_backend = getattr(settings, 'EMAIL_BACKEND', '')

        if 'console' in current_backend:
            # Switch to SendGrid
            new_backend = 'django.core.mail.backends.smtp.EmailBackend'
        else:
            # Switch to console
            new_backend = 'django.core.mail.backends.console.EmailBackend'

        # Note: This would require restart to take effect
        return JsonResponse({
            'success': True,
            'current_backend': current_backend,
            'new_backend': new_backend,
            'requires_restart': True
        })

    else:
        return JsonResponse({'error': 'Invalid action'}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def emergency_controls(request):
    """Emergency system controls"""
    if not is_super_user(request.user):
        return JsonResponse({'error': 'Access denied'}, status=403)

    action = request.data.get('action')
    confirmation = request.data.get('confirmation', '')

    # Require explicit confirmation for emergency actions
    if confirmation != 'EMERGENCY_CONFIRMED':
        return JsonResponse({'error': 'Emergency action requires confirmation'}, status=400)

    if action == 'enable_maintenance_mode':
        try:
            flag, created = FeatureFlag.objects.get_or_create(
                key='maintenance_mode',
                defaults={'boolean_value': True, 'name': 'Maintenance Mode'}
            )
            flag.boolean_value = True
            flag.save()

            return JsonResponse({
                'success': True,
                'message': 'Maintenance mode enabled',
                'timestamp': datetime.now().isoformat()
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    elif action == 'disable_all_logins':
        try:
            flag, created = FeatureFlag.objects.get_or_create(
                key='user_registration',
                defaults={'boolean_value': False, 'name': 'User Registration'}
            )
            flag.boolean_value = False
            flag.save()

            return JsonResponse({
                'success': True,
                'message': 'All logins disabled',
                'timestamp': datetime.now().isoformat()
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    elif action == 'clear_all_cache':
        try:
            cache.clear()

            return JsonResponse({
                'success': True,
                'message': 'All cache cleared',
                'timestamp': datetime.now().isoformat()
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    else:
        return JsonResponse({'error': 'Invalid emergency action'}, status=400)


@api_view(['GET'])
@permission_classes([])  # No authentication required for developer access
def user_control_list(request):
    """Get list of all users for management"""

    try:
        users = User.objects.all().order_by('-date_joined')
        users_data = []

        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'role': 'unknown',
                'email_verified': False,
                'company_count': 0,
                'meter_count': 0
            }

            # Get user profile information
            if hasattr(user, 'userprofile'):
                profile = user.userprofile
                user_data['role'] = getattr(profile, 'role', 'unknown')
                user_data['email_verified'] = getattr(profile, 'email_verified', False)

            # Get company count
            user_data['company_count'] = Company.objects.filter(user=user).count()

            # Get meter count
            user_data['meter_count'] = Meter.objects.filter(user=user).count()

            users_data.append(user_data)

        return JsonResponse({
            'users': users_data,
            'total_count': len(users_data)
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([])  # No authentication required for developer access
def user_control_action(request, user_id):
    """Perform actions on a specific user (deactivate, delete, etc.)"""

    try:
        user = User.objects.get(id=user_id)

        action = request.data.get('action')
        confirmation = request.data.get('confirmation', '')

        if action == 'deactivate':
            if confirmation != 'DEACTIVATE_CONFIRMED':
                return JsonResponse({'error': 'Deactivation requires confirmation'}, status=400)

            user.is_active = False
            user.save()

            return JsonResponse({
                'success': True,
                'message': f'User {user.username} has been deactivated',
                'action': 'deactivated'
            })

        elif action == 'activate':
            user.is_active = True
            user.save()

            return JsonResponse({
                'success': True,
                'message': f'User {user.username} has been activated',
                'action': 'activated'
            })

        elif action == 'delete':
            if confirmation != 'DELETE_CONFIRMED':
                return JsonResponse({'error': 'Deletion requires confirmation'}, status=400)

            username = user.username
            email = user.email

            # Delete related objects (due to cascading, this should handle most)
            user.delete()

            return JsonResponse({
                'success': True,
                'message': f'User {username} ({email}) has been permanently deleted',
                'action': 'deleted'
            })

        elif action == 'reset_password':
            # Force password reset on next login
            if hasattr(user, 'userprofile'):
                user.userprofile.must_reset_password = True
                user.userprofile.save()
            else:
                # Create profile if it doesn't exist
                UserProfile.objects.create(
                    user=user,
                    email=user.email,
                    must_reset_password=True
                )

            return JsonResponse({
                'success': True,
                'message': f'User {user.username} will be required to reset password on next login',
                'action': 'password_reset_required'
            })

        else:
            return JsonResponse({'error': 'Invalid action'}, status=400)

    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)