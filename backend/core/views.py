from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from .authentication import CsrfExemptSessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

from .models import (
    Company, Activity, CompanyActivity, Framework, CompanyFramework, DataElement, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist
)
from .serializers import (
    CompanySerializer, CompanyCreateSerializer, ActivitySerializer,
    FrameworkSerializer, DataElementSerializer, ProfilingQuestionSerializer,
    CompanyProfileAnswerSerializer, MeterSerializer, 
    CompanyDataSubmissionSerializer, CompanyChecklistSerializer,
    DashboardStatsSerializer, ProgressSerializer
)
from .services import (
    FrameworkService, ProfilingService, ChecklistService,
    MeterService, DataCollectionService, DashboardService
)


def get_user_company(request_user, company_id):
    """
    Universal helper to validate company access through User.company field.
    Returns the company if user has access, raises PermissionDenied otherwise.
    """
    if not company_id:
        raise PermissionDenied("Company ID is required")
    
    try:
        company_id = int(company_id)
    except (ValueError, TypeError):
        raise PermissionDenied("Invalid company ID")
    
    # Check if user's assigned company matches the requested company
    if hasattr(request_user, 'company') and request_user.company and request_user.company.id == company_id:
        return request_user.company
    
    # Fallback: check UserProfile for backward compatibility
    user_profile = getattr(request_user, 'userprofile', None)
    if user_profile and user_profile.company and user_profile.company.id == company_id:
        return user_profile.company
    
    # Final fallback: check if user owns this company directly (legacy support)
    try:
        return Company.objects.get(pk=company_id, user=request_user)
    except Company.DoesNotExist:
        pass
    
    raise PermissionDenied("You don't have permission to access this company")


@method_decorator(csrf_exempt, name='dispatch')
class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for company management"""
    serializer_class = CompanySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]  # Use CSRF-exempt auth
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Return the company associated with the user's profile
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile and user_profile.company:
            return Company.objects.filter(id=user_profile.company.id)
        
        # Fallback: return companies owned by the user directly (legacy support)
        legacy_companies = Company.objects.filter(user=self.request.user)
        if legacy_companies.exists():
            return legacy_companies
            
        # No companies accessible
        return Company.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer
    
    def perform_create(self, serializer):
        # CRITICAL: Set user when creating
        company = serializer.save(user=self.request.user)
        
        # CRITICAL FIX: Update user's profile to link to the new company
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile:
            user_profile.company = company
            user_profile.save()
            print(f"✅ Linked user {self.request.user.username} profile to company {company.name}")
        else:
            print(f"❌ No UserProfile found for user {self.request.user.username}")
        
        # Auto-assign mandatory frameworks
        FrameworkService.assign_mandatory_frameworks(company, self.request.user)
        return company

    def update(self, request, *args, **kwargs):
        """Custom update method to handle emirate changes and reassign frameworks"""
        instance = self.get_object()
        old_emirate = instance.emirate

        # Perform the standard update
        response = super().update(request, *args, **kwargs)

        # Check if emirate changed and reassign frameworks if needed
        if 'emirate' in request.data:
            new_emirate = request.data['emirate']
            if old_emirate != new_emirate:
                print(f"🔄 Emirate changed from {old_emirate} to {new_emirate}, reassigning frameworks...")
                # Reassign mandatory frameworks based on new emirate
                FrameworkService.assign_mandatory_frameworks(instance, request.user)
                # Update active_frameworks field
                instance.refresh_from_db()  # Refresh to get updated data
                instance.update_active_frameworks()
                print(f"✅ Frameworks updated for emirate change")

        return response

    def get_object(self):
        # CRITICAL: Additional security check
        obj = super().get_object()
        
        # Check if user has access to this company through their profile
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile and user_profile.company and user_profile.company.id == obj.id:
            return obj
        
        # Fallback: check if user owns this company (for super users)
        if obj.user == self.request.user:
            return obj
            
        raise PermissionDenied("You don't have permission to access this company")
        return obj
    
    def _get_user_company(self, company_id):
        """Helper method to get company that user has access to"""
        return get_user_company(self.request.user, company_id)
    
    @action(detail=True, methods=['post'])
    def update_info(self, request, pk=None):
        """Update company basic information (CSRF-exempt alternative to PUT)"""
        print(f"\n🏢 === COMPANY UPDATE REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        print(f"🏢 Company ID: {pk}")
        print(f"📝 Request data: {request.data}")
        
        try:
            company = self._get_user_company(pk)
            print(f"✅ Company found: {company.name} (ID: {company.id})")
            
            # Update allowed fields
            if 'name' in request.data:
                company.name = request.data['name']
                print(f"📝 Updated name to: {company.name}")
                
            if 'emirate' in request.data:
                company.emirate = request.data['emirate'].lower()
                print(f"📍 Updated emirate to: {company.emirate}")
                
            if 'sector' in request.data:
                company.sector = request.data['sector'].lower().replace(' & ', '_').replace(' ', '_')
                print(f"🏭 Updated sector to: {company.sector}")
            
            company.save()
            print(f"✅ Company saved successfully")

            # If emirate changed, reassign frameworks
            if 'emirate' in request.data:
                from .services import FrameworkService
                print(f"🔄 Emirate changed, reassigning mandatory frameworks...")
                FrameworkService.assign_mandatory_frameworks(company, request.user)
                company.update_active_frameworks()
                print(f"✅ Frameworks updated for new emirate: {company.emirate}")

            # Return updated company data
            serializer = self.get_serializer(company)
            response_data = serializer.data
            
            print(f"📤 Returning company data: {response_data}")
            print(f"🏢 === COMPANY UPDATE REQUEST END ===\n")
            
            return Response(response_data)
            
        except Exception as e:
            print(f"❌ Error updating company: {str(e)}")
            print(f"🏢 === COMPANY UPDATE REQUEST END (ERROR) ===\n")
            return Response(
                {'error': f'Failed to update company: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get company's overall progress through the modules"""
        company = get_object_or_404(Company, pk=pk)
        
        progress = {
            'module_1_complete': bool(company.companyactivity_set.exists()),
            'module_2_complete': bool(company.companyframework_set.exists()),
            'module_3_complete': bool(
                CompanyProfileAnswer.objects.filter(company=company).exists() and
                CompanyChecklist.objects.filter(company=company).exists()
            ),
            'module_4_complete': bool(Meter.objects.filter(company=company).exists()),
            'module_5_complete': bool(CompanyDataSubmission.objects.filter(company=company).exists()),
        }
        
        # Calculate percentage
        completed_modules = sum(progress.values())
        progress['overall_percentage'] = (completed_modules / 5) * 100
        
        return Response(progress)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """Get company's selected activities"""
        company = get_object_or_404(Company, pk=pk)
        
        activities = Activity.objects.filter(companyactivity__company=company)
        serializer = ActivitySerializer(activities, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_activities(self, request, pk=None):
        """Save company's selected activities and re-assign mandatory frameworks"""
        print(f"\n🏢 === ACTIVITY SAVE REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        print(f"🏢 Company ID requested: {pk}")
        print(f"📝 Activity IDs in request: {request.data.get('activity_ids', [])}")
        
        company = self._get_user_company(pk)
        print(f"✅ Company resolved: {company.name} (ID: {company.id})")
        
        activity_ids = request.data.get('activity_ids', [])
        
        # Show current database state BEFORE changes (company-wide)
        existing_activities = CompanyActivity.objects.filter(
            company=company
        )
        print(f"📊 BEFORE: {existing_activities.count()} existing CompanyActivity records for company")
        for ca in existing_activities:
            print(f"   - ID: {ca.id}, Activity: '{ca.activity.name}' (Activity ID: {ca.activity.id}, Created by: {ca.user.username if ca.user else 'System'})")
        
        with transaction.atomic():
            # Clear existing activities for this company (company-wide, not user-specific)
            deleted_count, _ = CompanyActivity.objects.filter(
                company=company
            ).delete()
            print(f"🗑️  Deleted {deleted_count} existing CompanyActivity records")
            
            # Add new activities
            created_count = 0
            for activity_id in activity_ids:
                try:
                    activity = Activity.objects.get(id=activity_id)
                    print(f"🔍 Found activity: '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
                    
                    company_activity = CompanyActivity.objects.create(
                        user=None,  # Company-wide activity, not tied to specific user
                        company=company,
                        activity=activity
                    )
                    print(f"✅ Created CompanyActivity record: ID {company_activity.id}")
                    created_count += 1
                    
                except Activity.DoesNotExist:
                    print(f"❌ Activity ID {activity_id} not found in database!")
                    continue
            
            print(f"📈 Created {created_count} new CompanyActivity records")
            
            # Re-assign mandatory frameworks based on updated company profile
            print(f"🔄 Re-assigning mandatory frameworks...")
            FrameworkService.assign_mandatory_frameworks(company, request.user)
        
        # Show final database state AFTER changes (company-wide, not user-specific)
        final_activities = Activity.objects.filter(
            companyactivity__company=company
        ).distinct()
        print(f"📊 AFTER: {final_activities.count()} activities now linked to company")
        for activity in final_activities:
            print(f"   - '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
        
        print(f"🏢 === ACTIVITY SAVE REQUEST END ===\n")
        
        # Return updated activities (company-wide, visible to all users in company)
        activities = Activity.objects.filter(
            companyactivity__company=company
        ).distinct()
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def frameworks(self, request, pk=None):
        """Get company's assigned mandatory frameworks"""
        company = self._get_user_company(pk)
        
        # Get company's assigned frameworks (company-wide, visible to all users)
        company_frameworks = CompanyFramework.objects.filter(
            company=company
        )
        frameworks = [cf.framework for cf in company_frameworks]
        serializer = FrameworkSerializer(frameworks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def profile_answers(self, request, pk=None):
        """Get company's profiling wizard answers"""
        company = self._get_user_company(pk)
        
        # Get the most recent answers for each question for this company
        # Users should see company-wide answers, not just their own
        from django.db.models import Max
        
        # Get the latest answer for each question
        latest_answers = CompanyProfileAnswer.objects.filter(
            company=company
        ).values('question').annotate(
            latest_time=Max('answered_at')
        )
        
        # Get the actual answer records
        answer_ids = []
        for item in latest_answers:
            latest_answer = CompanyProfileAnswer.objects.filter(
                company=company,
                question=item['question'],
                answered_at=item['latest_time']
            ).first()
            if latest_answer:
                answer_ids.append(latest_answer.id)
        
        answers = CompanyProfileAnswer.objects.filter(id__in=answer_ids)
        serializer = CompanyProfileAnswerSerializer(answers, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_profile_answer(self, request, pk=None):
        """Save a single profiling wizard answer"""
        company = self._get_user_company(pk)
        
        # Check if user has permission to edit profiling answers
        user_role = getattr(request.user.userprofile, 'role', 'viewer')
        allowed_edit_roles = ['super_user', 'admin']
        
        if user_role not in allowed_edit_roles:
            return Response(
                {'error': f'Role "{user_role}" does not have permission to edit profiling answers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        question_id = request.data.get('question')
        answer = request.data.get('answer')
        
        if question_id is None or answer is None:
            return Response(
                {'error': 'question and answer are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            question = ProfilingQuestion.objects.get(question_id=question_id)
            
            # Update or create the answer (company-wide, not user-specific)
            profile_answer, created = CompanyProfileAnswer.objects.update_or_create(
                user=None,  # Company-wide answer, not tied to specific user
                company=company,
                question=question,
                defaults={'answer': answer}
            )
            
            serializer = CompanyProfileAnswerSerializer(profile_answer)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except ProfilingQuestion.DoesNotExist:
            return Response(
                {'error': 'Question not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for business activities"""
    queryset = Activity.objects.all().order_by('name')
    serializer_class = ActivitySerializer
    permission_classes = [permissions.AllowAny]
    
    def list(self, request, *args, **kwargs):
        """Override list to add database state logging"""
        print(f"\n📋 === ACTIVITY LIST REQUEST ===")
        print(f"👤 User: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        # Show all activities in database
        all_activities = Activity.objects.all().order_by('name')
        predefined_count = all_activities.filter(is_custom=False).count()
        custom_count = all_activities.filter(is_custom=True).count()
        
        print(f"📊 Total activities in database: {all_activities.count()}")
        print(f"   - Predefined: {predefined_count}")
        print(f"   - Custom: {custom_count}")
        
        print(f"📋 All activities:")
        for activity in all_activities:
            print(f"   - ID: {activity.id}, Name: '{activity.name}', is_custom: {activity.is_custom}")
        
        print(f"📋 === ACTIVITY LIST REQUEST END ===\n")
        
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def add_custom(self, request):
        """Add a custom activity and auto-select it for the company"""
        print(f"\n🆕 === ADD CUSTOM ACTIVITY REQUEST START ===")
        print(f"👤 User: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        activity_name = request.data.get('name')
        company_id = request.data.get('company_id')
        
        print(f"📝 Activity name: '{activity_name}'")
        print(f"🏢 Company ID: {company_id}")
        
        if not activity_name:
            print(f"❌ No activity name provided")
            return Response(
                {'error': 'Activity name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if activity already exists
        existing_activity = Activity.objects.filter(name=activity_name).first()
        if existing_activity:
            print(f"🔍 Found existing activity: '{existing_activity.name}' (ID: {existing_activity.id}, is_custom: {existing_activity.is_custom})")
        else:
            print(f"🆕 Activity '{activity_name}' does not exist, will create new one")
        
        activity, created = Activity.objects.get_or_create(
            name=activity_name,
            defaults={'is_custom': True}
        )
        
        if created:
            print(f"✅ Created new custom activity: '{activity.name}' (ID: {activity.id})")
        else:
            print(f"🔄 Using existing activity: '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
        
        # If company_id provided, automatically select this activity for the company
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                print(f"🏢 Found company: '{company.name}' (ID: {company.id})")
                
                company_activity, ca_created = CompanyActivity.objects.get_or_create(
                    company=company, 
                    activity=activity
                )
                
                if ca_created:
                    print(f"✅ Created CompanyActivity link: Company '{company.name}' -> Activity '{activity.name}' (CompanyActivity ID: {company_activity.id})")
                else:
                    print(f"🔄 CompanyActivity link already exists: ID {company_activity.id}")
                    
            except Company.DoesNotExist:
                print(f"❌ Company ID {company_id} not found!")
        else:
            print(f"⚠️  No company_id provided, activity created but not linked to any company")
        
        serializer = self.get_serializer(activity)
        response_data = serializer.data
        response_data['auto_selected'] = bool(company_id)
        
        print(f"📤 Returning activity data: ID {activity.id}, name: '{activity.name}', auto_selected: {bool(company_id)}")
        print(f"🆕 === ADD CUSTOM ACTIVITY REQUEST END ===\n")
        
        return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class FrameworkViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ESG frameworks"""
    queryset = Framework.objects.all()
    serializer_class = FrameworkSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def voluntary(self, request):
        """Get all voluntary frameworks"""
        frameworks = FrameworkService.get_voluntary_frameworks()
        serializer = self.get_serializer(frameworks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def assign_voluntary(self, request):
        """Assign voluntary framework to company"""
        company_id = request.data.get('company_id')
        framework_id = request.data.get('framework_id')
        
        try:
            company = Company.objects.get(pk=company_id)
            success = FrameworkService.assign_voluntary_framework(company, framework_id)
            
            if success:
                return Response({'message': 'Framework assigned successfully'})
            else:
                return Response(
                    {'error': 'Framework not found or not voluntary'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def remove_voluntary(self, request):
        """Remove voluntary framework from company"""
        company_id = request.data.get('company_id')
        framework_id = request.data.get('framework_id')
        
        try:
            company = Company.objects.get(pk=company_id)
            framework = Framework.objects.get(framework_id=framework_id, type='voluntary')
            
            # Remove the framework assignment
            CompanyFramework.objects.filter(
                company=company,
                framework=framework,
                is_auto_assigned=False  # Only remove voluntary frameworks
            ).delete()

            # Bridge to new framework system: update Company model
            if framework_id == 'GREEN_KEY':
                company.has_green_key = False
                company.save()
                # Update active frameworks to remove 'G'
                company.update_active_frameworks()

            return Response({'message': 'Framework removed successfully'})
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Framework.DoesNotExist:
            return Response(
                {'error': 'Framework not found or not voluntary'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class ProfilingQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for profiling questions"""
    queryset = ProfilingQuestion.objects.all()
    serializer_class = ProfilingQuestionSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def for_company(self, request):
        """Get profiling questions for a specific company"""
        # Check if user has permission to access profiling questions
        user_role = getattr(request.user.userprofile, 'role', 'viewer')
        allowed_roles = ['super_user', 'admin', 'site_manager', 'viewer']

        if user_role not in allowed_roles:
            return Response(
                {'error': f'Role "{user_role}" does not have permission to access profiling questions'},
                status=status.HTTP_403_FORBIDDEN
            )

        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # CRITICAL: Ensure user can only access their own company
            company = get_user_company(request.user, company_id)

            questions = ProfilingService.get_profiling_questions(company)
            serializer = self.get_serializer(questions, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error retrieving questions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def save_answers(self, request):
        """Save profiling wizard answers"""
        # Check if user has permission to edit profiling answers
        user_role = getattr(request.user.userprofile, 'role', 'viewer')
        allowed_edit_roles = ['super_user', 'admin']
        
        if user_role not in allowed_edit_roles:
            return Response(
                {'error': f'Role "{user_role}" does not have permission to edit profiling answers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        company_id = request.data.get('company_id')
        answers = request.data.get('answers', [])
        
        try:
            # CRITICAL: Ensure user can only save answers for their own company
            company = get_user_company(request.user, company_id)
                    
            ProfilingService.save_profiling_answers(company, answers, request.user)
            
            # Generate personalized checklist after saving answers
            ChecklistService.generate_personalized_checklist(company)
            
            # Auto-create meters for metered data elements
            MeterService.auto_create_meters(company)
            
            return Response({'message': 'Answers saved, checklist generated, and meters created successfully'})
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class CompanyChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for company's personalized checklist"""
    serializer_class = CompanyChecklistSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination to ensure all 80 elements are returned

    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # CRITICAL: Ensure user can only access checklists for their own company
            try:
                company = get_user_company(self.request.user, company_id)
                return CompanyChecklist.objects.filter(company_id=company_id)
            except PermissionDenied:
                return CompanyChecklist.objects.none()
        return CompanyChecklist.objects.none()
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate personalized checklist for company"""
        company_id = request.data.get('company_id')
        
        try:
            # CRITICAL: Ensure user can only generate checklist for their own company
            company = get_user_company(request.user, company_id)
                    
            checklist = ChecklistService.generate_personalized_checklist(company)
            
            # Auto-create meters for metered data elements
            MeterService.auto_create_meters(company)
            
            serializer = self.get_serializer(checklist, many=True)
            return Response(serializer.data)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class MeterViewSet(viewsets.ModelViewSet):
    """ViewSet for meter management"""
    serializer_class = MeterSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # CRITICAL: Filter by user's company to ensure data isolation
            try:
                company = get_user_company(self.request.user, company_id)
                return Meter.objects.filter(company_id=company_id)
            except PermissionDenied:
                return Meter.objects.none()
        return Meter.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Custom create to handle company_id from query params or request body"""
        try:
            print(f"🔍 Meter create request received from user: {request.user}")
            print(f"📊 Request data: {request.data}")
            print(f"📊 Query params: {request.query_params}")

            # Check if meter creation is allowed via feature flag
            from .models import FeatureFlag
            meter_creation_enabled = FeatureFlag.is_enabled('meter_creation', default=True)
            if not meter_creation_enabled:
                print(f"❌ Meter creation is disabled by feature flag")
                return Response(
                    {'error': 'Meter creation is currently disabled by the system administrator'},
                    status=status.HTTP_403_FORBIDDEN
                )
            print(f"✅ Meter creation is enabled (feature flag: {meter_creation_enabled})")

            # Get company_id from query params or request body
            company_id = request.query_params.get('company_id') or request.data.get('company')
            print(f"🏢 Company ID: {company_id}")
            
            if not company_id:
                return Response(
                    {'error': 'company_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate company exists and belongs to authenticated user
            try:
                company = get_user_company(request.user, company_id)
                print(f"✅ Company found: {company.name}")
            except PermissionDenied as e:
                print(f"❌ Company access denied for ID: {company_id}")
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create meter data with company_id
            meter_data = request.data.copy()
            meter_data['company_id'] = company_id
            print(f"🔧 Creating meter with data: {meter_data}")
            
            # Create meter directly (company-wide, not user-specific)
            meter = Meter.objects.create(
                user=None,  # Company-wide meter, not tied to specific user
                company=company,
                type=meter_data.get('type'),
                name=meter_data.get('name'),
                account_number=meter_data.get('account_number', ''),
                location_description=meter_data.get('location_description', ''),
                status=meter_data.get('status', 'active').lower(),
                is_auto_created=False  # Manual meter creation by user
            )
            print(f"✅ Meter created successfully: {meter.id}")
            
            serializer = self.get_serializer(meter)
            print(f"📤 Returning meter data: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"💥 ERROR in meter creation: {str(e)}")
            print(f"💥 Error type: {type(e).__name__}")
            import traceback
            print(f"💥 Full traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Internal server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Custom update to ensure company_id consistency"""
        meter = self.get_object()
        
        # Update meter fields
        if 'name' in request.data:
            meter.name = request.data['name']
        if 'type' in request.data:
            meter.type = request.data['type']
        if 'account_number' in request.data:
            meter.account_number = request.data['account_number']
        if 'location_description' in request.data:
            meter.location_description = request.data['location_description']
        if 'status' in request.data:
            meter.status = request.data['status'].lower()
        
        meter.save()
        
        serializer = self.get_serializer(meter)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def auto_create(self, request):
        """Auto-create default meters for company"""
        company_id = request.data.get('company_id')
        
        try:
            company = get_user_company(request.user, company_id)
            meters = MeterService.auto_create_meters(company)
            serializer = self.get_serializer(meters, many=True)
            return Response(serializer.data)
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to check if meter can be deleted and clean up associated data"""
        meter = self.get_object()
        
        # Check if meter has actual data (not just empty submissions)
        if meter.has_data():
            return Response(
                {'error': f'Cannot delete meter "{meter.name}" because it has data entries. Please remove all data entries first, or deactivate the meter instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean up associated empty submissions before deleting meter
        from .models import CompanyDataSubmission
        deleted_submissions = CompanyDataSubmission.objects.filter(meter=meter).count()
        CompanyDataSubmission.objects.filter(meter=meter).delete()
        
        # Now delete the meter
        response = super().destroy(request, *args, **kwargs)
        
        # Log for debugging
        print(f"Deleted meter {meter.name} and cleaned up {deleted_submissions} empty submissions")
        
        return response


@method_decorator(csrf_exempt, name='dispatch')
class DataCollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for data collection and submissions"""
    serializer_class = CompanyDataSubmissionSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        queryset = CompanyDataSubmission.objects.all()
        
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if year:
            queryset = queryset.filter(reporting_year=year)
        if month:
            month_name = datetime(int(year), int(month), 1).strftime('%b')
            queryset = queryset.filter(reporting_period=month_name)
        
        return queryset.order_by('-updated_at')
    
    @action(detail=False, methods=['get'])
    def available_months(self, request):
        """Get available months for data collection"""
        year = request.query_params.get('year')
        if not year:
            return Response(
                {'error': 'year parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        months = DataCollectionService.get_available_months(int(year))
        return Response({'months': months})
    
    @action(detail=False, methods=['get'])
    def tasks(self, request):
        """Get data collection tasks for specific month"""
        company_id = request.query_params.get('company_id')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not all([company_id, year, month]):
            return Response(
                {'error': 'company_id, year, and month parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)
            print(f"🔐 Tasks request from user: {request.user} (ID: {request.user.id if hasattr(request.user, 'id') else 'N/A'})")
            tasks = DataCollectionService.get_data_collection_tasks(
                company, int(year), int(month), user=request.user
            )
            
            # Serialize the tasks
            task_data = []
            for task in tasks:
                submission_data = CompanyDataSubmissionSerializer(task['submission']).data
                meter_info = None
                if task['meter']:
                    meter_info = {
                        'id': task['meter'].id,
                        'name': task['meter'].name,
                        'type': task['meter'].type,
                        'location': task['meter'].location_description,
                        'account_number': task['meter'].account_number,
                        'status': task['meter'].status
                    }

                # Get the checklist item ID for element assignments
                checklist_item = CompanyChecklist.objects.filter(
                    company=company,
                    element=task['element']
                ).first()

                task_data.append({
                    'type': task['type'],
                    'element_id': task['element'].element_id,
                    'element_name': task['element'].name,
                    'element_unit': task['element'].unit,
                    'element_description': task['element'].description,
                    'element_category': task['element'].category,
                    'checklist_item_id': checklist_item.id if checklist_item else None,
                    'meter': meter_info,
                    'cadence': task['cadence'],
                    'submission': submission_data
                })
            
            return Response(task_data)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """Get data collection progress"""
        company_id = request.query_params.get('company_id')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not all([company_id, year]):
            return Response(
                {'error': 'company_id and year parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)
            progress = DataCollectionService.calculate_progress(
                company, int(year), int(month) if month else None, user=request.user
            )
            serializer = ProgressSerializer(data=progress)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['post'], url_path='cleanup-orphaned')
    def cleanup_orphaned_submissions(self, request):
        """Clean up orphaned submissions from deleted meters"""
        company_id = request.data.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import CompanyDataSubmission, Meter
            
            # Find submissions that reference non-existent meters
            orphaned_count = 0
            all_submissions = CompanyDataSubmission.objects.filter(company_id=company_id)
            
            for submission in all_submissions:
                if submission.meter_id:  # Only check metered submissions
                    try:
                        # Try to access the meter - this will fail if meter doesn't exist
                        _ = submission.meter
                    except Meter.DoesNotExist:
                        # Meter doesn't exist, delete the orphaned submission
                        submission.delete()
                        orphaned_count += 1
            
            return Response({
                'message': f'Cleaned up {orphaned_count} orphaned submissions',
                'deleted_count': orphaned_count
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Custom update method to handle file removal"""
        instance = self.get_object()
        
        # Check if this is a file removal request
        if 'remove_evidence' in request.data:
            instance.evidence_file.delete(save=False)  # Delete the file
            instance.evidence_file = None
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        
        # Otherwise, use the default update behavior
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], url_path='assign-task')
    def assign_task(self, request):
        """Assign a data collection task to a user"""
        task_id = request.data.get('task_id')
        assigned_user_id = request.data.get('assigned_user_id')
        
        if not task_id or not assigned_user_id:
            return Response(
                {'error': 'task_id and assigned_user_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the task (CompanyDataSubmission)
            task = CompanyDataSubmission.objects.get(id=task_id)
            
            # Get the user to assign to
            from django.contrib.auth.models import User
            assigned_user = User.objects.get(id=assigned_user_id)
            
            # Update assignment fields
            task.assigned_to = assigned_user
            task.assigned_by = request.user
            task.assigned_at = timezone.now()
            task.save()
            
            return Response({
                'message': 'Task assigned successfully',
                'task_id': task_id,
                'assigned_to': {
                    'id': assigned_user.id,
                    'name': f"{assigned_user.first_name} {assigned_user.last_name}".strip() or assigned_user.username,
                    'email': assigned_user.email
                },
                'assigned_by': request.user.username,
                'assigned_at': task.assigned_at.isoformat()
            })
            
        except CompanyDataSubmission.DoesNotExist:
            return Response(
                {'error': 'Task not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to assign task: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class DashboardView(APIView):
    """API view for dashboard statistics"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]  # CRITICAL: Fixed security hole
    
    def get(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)
            stats = DashboardService.get_dashboard_stats(company, user=request.user)
            serializer = DashboardStatsSerializer(data=stats)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )