"""
Email service for handling email verification, invitations, and password reset
Integrates with SimpleLogin for email privacy protection
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from .models import EmailVerificationToken
from .simplelogin_service import simplelogin
import logging
from smtplib import SMTPException

# SendGrid Web API imports
try:
    import sendgrid
    from sendgrid.helpers.mail import Mail
    SENDGRID_API_AVAILABLE = True
except ImportError:
    SENDGRID_API_AVAILABLE = False
    print("⚠️ SendGrid API library not installed. Install with: pip install sendgrid")

logger = logging.getLogger(__name__)


def get_base_url():
    """Get the base URL for the frontend application"""
    if hasattr(settings, 'FRONTEND_URL'):
        return settings.FRONTEND_URL
    else:
        # Fallback for development
        return "http://localhost:3001"


def get_user_email_address(user):
    """
    Get email address for sending - uses SimpleLogin alias if available
    """
    if not getattr(settings, 'SIMPLELOGIN_API_KEY', None):
        return user.email  # Direct email if no SimpleLogin

    try:
        # Try to get SimpleLogin alias
        alias_info = simplelogin.get_user_alias(user.email)
        if alias_info and alias_info.get('alias'):
            logger.info(f"Using SimpleLogin alias for {user.email}")
            return alias_info['alias']
    except Exception as e:
        logger.error(f"SimpleLogin error: {str(e)}, using direct email")

    return user.email  # Fallback to direct email


def send_email_via_sendgrid_api(to_email, subject, html_content, plain_content):
    """
    Send email using SendGrid Web API (HTTPS) instead of SMTP
    This bypasses port 587 blocking on free hosting services like Render
    """
    if not SENDGRID_API_AVAILABLE:
        print("❌ SendGrid API library not available", file=sys.stderr)
        return False

    if not getattr(settings, 'SENDGRID_API_KEY', None):
        print("❌ SENDGRID_API_KEY not configured", file=sys.stderr)
        return False

    try:
        import sys
        import time
        start_time = time.time()
        print(f"📧 Attempting SendGrid Web API call...", file=sys.stderr)

        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.DEFAULT_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
            plain_text_content=plain_content
        )

        response = sg.send(message)
        elapsed = time.time() - start_time

        print(f"✅ SendGrid API response: {response.status_code} in {elapsed:.2f} seconds", file=sys.stderr)

        # SendGrid API returns 202 for successful acceptance
        if response.status_code == 202:
            print(f"✅ Email sent successfully via SendGrid API to {to_email}")
            return True
        else:
            print(f"❌ SendGrid API unexpected status: {response.status_code}")
            return False

    except Exception as e:
        import traceback
        import sys
        print(f"❌ SendGrid API error: {type(e).__name__}: {str(e)}", file=sys.stderr)
        print(f"Full traceback:\n{traceback.format_exc()}", file=sys.stderr)
        return False


def send_email_verification(user, request=None):
    """
    Send email verification email to user
    Returns dict with success, email_sent, verification_code, and message
    """
    # Add debugging for Render deployment
    import os
    from django.conf import settings
    
    print(f"🔧 EMAIL CONFIG CHECK for {user.email}:")
    print(f"  USE_REAL_EMAIL: {os.environ.get('USE_REAL_EMAIL', 'Not set')}")
    print(f"  EMAIL_SERVICE: {os.environ.get('EMAIL_SERVICE', 'Not set')}")
    print(f"  SENDGRID_API_KEY exists: {bool(os.environ.get('SENDGRID_API_KEY'))}")
    print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'Not set')}")
    print(f"  EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'Not set')}")
    print(f"  EMAIL_HOST_PASSWORD exists: {bool(getattr(settings, 'EMAIL_HOST_PASSWORD', None))}")
    print(f"  DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"  EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', 'Not set')}")
    print(f"  EMAIL_PORT: {getattr(settings, 'EMAIL_PORT', 'Not set')}")
    
    try:
        # Validate user has email
        if not user.email:
            return {
                'success': False,
                'email_sent': False,
                'verification_code': None,
                'message': 'User has no email address'
            }
        
        # Create or get verification token
        token_obj, created = EmailVerificationToken.objects.get_or_create(
            user=user,
            token_type='email_verification',
            used_at__isnull=True,
            defaults={}
        )
        
        # If token already exists and is still valid, use it
        if not created and not token_obj.is_valid():
            # Token expired, create a new one
            token_obj.delete()
            token_obj = EmailVerificationToken.objects.create(
                user=user,
                token_type='email_verification'
            )
        
        # Context for email template with magic link
        # Build magic link verification URL (same as invitation flow)
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8080')
        magic_link_url = f"{backend_url}/api/auth/magic-link/{token_obj.token}/"
        
        context = {
            'user_name': user.first_name or user.username,
            'verification_url': magic_link_url,
            'site_name': 'ESG Portal',
        }
        
        # Render email templates (magic link versions)
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Verify Your Email Address"
        html_message = render_to_string('emails/email_verification_magic.html', context)
        plain_message = render_to_string('emails/email_verification_magic.txt', context)
        
        # Get email address (SimpleLogin alias or direct email)
        recipient_email = get_user_email_address(user)
        
        # Send email with better error handling
        email_sent = False
        email_error = None
        
        # Try SendGrid Web API first if available and configured for production
        use_web_api = (
            SENDGRID_API_AVAILABLE and
            getattr(settings, 'SENDGRID_API_KEY', None) and
            settings.EMAIL_SERVICE == 'sendgrid' and
            not settings.DEBUG  # Only use API in production
        )

        if use_web_api:
            print(f"🌐 Using SendGrid Web API (bypassing SMTP)", file=sys.stderr)
            email_sent = send_email_via_sendgrid_api(
                to_email=recipient_email,
                subject=subject,
                html_content=html_message,
                plain_content=plain_message
            )
            if not email_sent:
                email_error = "SendGrid Web API failed"
        else:
            # Fallback to Django's SMTP email sending
            try:
                import time
                import sys
                start_time = time.time()
                print(f"📧 Attempting SMTP connection to SendGrid...", file=sys.stderr)

                send_result = send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[recipient_email],
                    html_message=html_message,
                    fail_silently=False,
                )

                elapsed = time.time() - start_time
                print(f"✅ Email sent in {elapsed:.2f} seconds", file=sys.stderr)

                # Check if email was actually sent
                if send_result == 1:
                    email_sent = True
                    print(f"✅ Email sent successfully to {recipient_email}")
                else:
                    email_sent = False
                    email_error = f"SendGrid returned {send_result} - email may not have been sent"
                    print(f"❌ Email send failed (result={send_result})")

            except Exception as e:
                import traceback
                import sys
                email_sent = False
                email_error = f"{type(e).__name__}: {str(e)}"
                print(f"❌ Email failed: {type(e).__name__}: {str(e)}", file=sys.stderr)
                print(f"Full traceback:\n{traceback.format_exc()}", file=sys.stderr)
        
        # Return magic link token instead of verification code for testing
        return {
            'success': True,  # Token was created successfully
            'email_sent': email_sent,
            'verification_token': token_obj.token,  # Magic link token for testing
            'magic_link_url': magic_link_url,  # Full magic link URL for testing
            'message': 'Email sent successfully' if email_sent else email_error or 'Email sending failed'
        }
        
    except Exception as e:
        print(f"❌ Failed to process email verification for {user.email}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'success': False,
            'email_sent': False,
            'verification_token': None,
            'magic_link_url': None,
            'message': f'Error creating verification: {str(e)}'
        }


def verify_email_code(email, verification_code):
    """
    Verify email verification code and activate user account
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        # Find user by email
        from django.contrib.auth.models import User
        user = User.objects.get(email=email)
        
        # Find verification token for this user
        token_obj = EmailVerificationToken.objects.get(
            user=user,
            verification_code=verification_code,
            token_type='email_verification'
        )
        
        if not token_obj.is_valid():
            return False, "This verification code has expired or has already been used.", None
        
        # Activate user
        user.is_active = True
        user.save()
        
        # Mark user profile as email verified
        if hasattr(user, 'userprofile'):
            user.userprofile.email_verified = True
            user.userprofile.save()
        
        # Mark token as used
        token_obj.mark_as_used()
        
        print(f"✅ Email verified for user {user.email}")
        return True, "Email verified successfully! You can now login to your account.", user
        
    except User.DoesNotExist:
        return False, "User not found.", None
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification code.", None
    except Exception as e:
        print(f"❌ Error verifying email code: {str(e)}")
        return False, "An error occurred while verifying your email.", None

def verify_email_token(token):
    """
    Verify email token and activate user account (kept for backward compatibility)
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        token_obj = EmailVerificationToken.objects.get(
            token=token,
            token_type='email_verification'
        )
        
        if not token_obj.is_valid():
            return False, "This verification link has expired or has already been used.", None
        
        # Activate user
        user = token_obj.user
        user.is_active = True
        user.save()
        
        # Mark user profile as email verified
        if hasattr(user, 'userprofile'):
            user.userprofile.email_verified = True
            user.userprofile.save()
        
        # Mark token as used
        token_obj.mark_as_used()
        
        print(f"✅ Email verified for user {user.email}")
        return True, "Email verified successfully! You can now login to your account.", user
        
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification link.", None
    except Exception as e:
        print(f"❌ Error verifying email token: {str(e)}")
        return False, "An error occurred while verifying your email.", None


def send_password_reset_email(user):
    """
    Create password reset token - email will be sent automatically by signals
    """
    try:
        # Create password reset token (email will be sent by signal)
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_type='password_reset'
        )
        
        print(f"✅ Password reset token created for {user.email}")
        
        # Return token details - email sending handled by signals
        return {
            'success': True,
            'email_sent': True,  # Will be sent by signal
            'verification_code': token_obj.verification_code,
            'message': 'Password reset verification code generated - email will be sent automatically'
        }
        
    except Exception as e:
        print(f"❌ Failed to create password reset token for {user.email}: {str(e)}")
        return {
            'success': False,
            'email_sent': False,
            'verification_code': None,
            'message': f'Error: {str(e)}'
        }


def verify_password_reset_code(email, verification_code):
    """
    Verify password reset verification code
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        # Find user by email
        from django.contrib.auth.models import User
        user = User.objects.get(email=email)
        
        # Find verification token for this user
        token_obj = EmailVerificationToken.objects.get(
            user=user,
            verification_code=verification_code,
            token_type='password_reset'
        )
        
        if not token_obj.is_valid():
            return False, "This verification code has expired or has already been used.", None
        
        print(f"✅ Password reset code verified for user {user.email}")
        return True, "Verification code confirmed. You can now reset your password.", user
        
    except User.DoesNotExist:
        return False, "User not found.", None
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification code.", None
    except Exception as e:
        print(f"❌ Error verifying password reset code: {str(e)}")
        return False, "An error occurred while verifying your code.", None


def send_invitation_email(user, invited_by):
    """
    Create invitation token - email will be sent automatically by signals
    """
    try:
        # Create invitation token (email will be sent by signal)
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_type='invitation'
        )
        
        print(f"✅ Invitation token created for {user.email}")
        
        # Return success - email sending handled by signals
        return {
            'success': True,
            'email_sent': True,  # Will be sent by signal
            'token': token_obj.token,
            'message': 'Invitation created - email will be sent automatically'
        }
        
    except Exception as e:
        print(f"❌ Failed to create invitation token for {user.email}: {str(e)}")
        return {
            'success': False,
            'email_sent': False,
            'token': None,
            'message': f'Error: {str(e)}'
        }