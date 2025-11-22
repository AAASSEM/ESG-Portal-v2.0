from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, ActivityViewSet, FrameworkViewSet,
    ProfilingQuestionViewSet, CompanyChecklistViewSet,
    MeterViewSet, DataCollectionViewSet, DashboardView
)
from .user_views import UserViewSet
from .auth_views import SignupView, LoginView, LogoutView, UserProfileView, CsrfTokenView, UserSitesView, RoleSwitchView, ResetPasswordView, CompanyUpdateView, EmailVerificationView, EmailCodeVerificationView, ResendVerificationView, SendResetCodeView, VerifyResetCodeView, MagicLinkAuthView
from .assignment_views import ElementAssignmentViewSet
from . import admin_views

# Create router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'activities', ActivityViewSet, basename='activities')
router.register(r'frameworks', FrameworkViewSet, basename='frameworks')
router.register(r'profiling-questions', ProfilingQuestionViewSet, basename='profiling-questions')
router.register(r'checklist', CompanyChecklistViewSet, basename='checklist')
router.register(r'meters', MeterViewSet, basename='meters')
router.register(r'data-collection', DataCollectionViewSet, basename='data-collection')
router.register(r'users', UserViewSet, basename='users')
router.register(r'element-assignments', ElementAssignmentViewSet, basename='element-assignments')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    # Authentication endpoints
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/user/', UserProfileView.as_view(), name='user-profile'),
    path('auth/switch-role/', RoleSwitchView.as_view(), name='switch-role'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    # Email verification endpoints
    path('auth/verify-email/', EmailVerificationView.as_view(), name='verify-email'),
    path('auth/verify-code/', EmailCodeVerificationView.as_view(), name='verify-code'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    # Password reset verification endpoints
    path('auth/send-reset-code/', SendResetCodeView.as_view(), name='send-reset-code'),
    path('auth/verify-reset-code/', VerifyResetCodeView.as_view(), name='verify-reset-code'),
    # Magic link authentication (invitation auto-login)
    path('auth/magic-link/<str:token>/', MagicLinkAuthView.as_view(), name='magic-link-auth'),
    # User endpoints
    path('user/sites/', UserSitesView.as_view(), name='user-sites'),
    # Direct company update (bypasses DRF router)
    path('company/<int:company_id>/update/', CompanyUpdateView.as_view(), name='company-update'),
    # Developer Admin Panel endpoints
    path('admin/access/', admin_views.admin_access_required, name='admin-access'),
    path('admin/feature-flags/', admin_views.feature_flags, name='feature-flags'),
    path('admin/feature-flags/<int:flag_id>/', admin_views.feature_flag_detail, name='feature-flag-detail'),
    path('admin/system/health/', admin_views.system_health, name='system-health'),
    path('admin/system/logs/', admin_views.system_logs, name='system-logs'),
    path('admin/tools/command/', admin_views.run_management_command, name='run-command'),
    path('admin/users/manage/', admin_views.user_management, name='user-management'),
    path('admin/users/list/', admin_views.user_control_list, name='user-control-list'),
    path('admin/users/<int:user_id>/action/', admin_views.user_control_action, name='user-control-action'),
    path('admin/emails/tools/', admin_views.email_tools, name='email-tools'),
    path('admin/emergency/controls/', admin_views.emergency_controls, name='emergency-controls'),
]