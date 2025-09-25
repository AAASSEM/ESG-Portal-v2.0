"""
Business logic services for ESG application
"""
from django.db import transaction
from django.db.models import Count, Q
from datetime import datetime
from collections import defaultdict
from .models import (
    Company, Framework, CompanyFramework, DataElement, 
    DataElementFrameworkMapping, ProfilingQuestion, 
    CompanyProfileAnswer, Meter, CompanyChecklist,
    ChecklistFrameworkMapping, CompanyDataSubmission
)


class FrameworkService:
    """Service for handling framework assignment logic"""
    
    @staticmethod
    def assign_mandatory_frameworks(company, user=None):
        """
        Assign mandatory frameworks based on company profile
        Core ESG is mandatory for all, conditional frameworks based on emirate/sector
        """
        # First, clear existing auto-assigned frameworks to ensure clean assignment
        CompanyFramework.objects.filter(
            user=user,
            company=company, 
            is_auto_assigned=True
        ).delete()
        
        frameworks_to_assign = []
        
        # Core ESG framework is mandatory for all
        esg_framework, _ = Framework.objects.get_or_create(
            framework_id='ESG',
            defaults={
                'name': 'ESG Standards',
                'type': 'mandatory',
                'description': 'Core Environmental, Social, and Governance standards'
            }
        )
        frameworks_to_assign.append(esg_framework)
        
        # Dubai Sustainable Tourism (DST) - mandatory ONLY if Dubai + Hospitality
        if company.emirate == 'dubai' and company.sector == 'hospitality':
            dst_framework, _ = Framework.objects.get_or_create(
                framework_id='DST',
                defaults={
                    'name': 'Dubai Sustainable Tourism',
                    'type': 'mandatory_conditional',
                    'description': 'Dubai Department of Economy and Tourism sustainability requirements',
                    'condition_emirate': 'dubai',
                    'condition_sector': 'hospitality'
                }
            )
            frameworks_to_assign.append(dst_framework)
        
        # Dubai Energy Regulations - mandatory for all Dubai establishments
        if company.emirate == 'dubai':
            energy_framework, _ = Framework.objects.get_or_create(
                framework_id='DUBAI_ENERGY_REGULATIONS',
                defaults={
                    'name': 'Dubai Supreme Council of Energy Regulations',
                    'type': 'mandatory_conditional',
                    'description': 'Mandatory compliance - Dubai Supreme Council of Energy',
                    'condition_emirate': 'dubai',
                    'condition_sector': ''
                }
            )
            frameworks_to_assign.append(energy_framework)
        
        # UAE ESG Reporting Requirements - mandatory for listed companies
        # For now, we'll make it conditional based on a future profiling question
        
        # Assign frameworks to company (company-wide, not user-specific)
        for framework in frameworks_to_assign:
            CompanyFramework.objects.get_or_create(
                user=None,  # Company-wide framework assignment
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': True}
            )
        
        return frameworks_to_assign
    
    @staticmethod
    def get_voluntary_frameworks():
        """Get all available voluntary frameworks"""
        return Framework.objects.filter(type='voluntary')
    
    @staticmethod
    def assign_voluntary_framework(company, framework_id):
        """Assign a voluntary framework to a company"""
        try:
            framework = Framework.objects.get(framework_id=framework_id, type='voluntary')
            CompanyFramework.objects.get_or_create(
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': False}
            )

            # Bridge to new framework system: update Company model
            if framework_id == 'GREEN_KEY':
                company.has_green_key = True
                company.save()
                # Update active frameworks to include 'G'
                company.update_active_frameworks()

            return True
        except Framework.DoesNotExist:
            return False


class ProfilingService:
    """Service for handling profiling wizard logic"""

    @staticmethod
    def get_profiling_questions(company):
        """Get framework-specific profiling questions based on company's active frameworks"""
        # Ensure company has active frameworks set
        if not company.active_frameworks:
            company.update_active_frameworks()

        # Get available elements for this company based on frameworks
        available_elements = company.get_available_elements()

        # Get profiling questions for all available conditional elements
        # Don't deduplicate by condition_logic as different elements may have same condition
        conditional_element_ids = available_elements.filter(
            requirement_type='conditional'
        ).exclude(
            condition_logic__isnull=True
        ).exclude(
            condition_logic=''
        ).values_list('element_id', flat=True)

        questions = ProfilingQuestion.objects.filter(
            activates_element_id__in=conditional_element_ids
        ).order_by('order')

        return questions

    @staticmethod
    def save_profiling_answers(company, answers_data, user):
        """Save profiling wizard answers for comprehensive ESG framework"""
        with transaction.atomic():
            for answer_data in answers_data:
                question_id = answer_data.get('question_id')
                answer = answer_data.get('answer')

                try:
                    question = ProfilingQuestion.objects.get(question_id=question_id)
                    CompanyProfileAnswer.objects.update_or_create(
                        user=None,  # Company-wide answer, not user-specific
                        company=company,
                        question=question,
                        defaults={'answer': answer}
                    )
                except ProfilingQuestion.DoesNotExist:
                    continue


class ChecklistService:
    """Service for generating personalized checklists"""
    
    @staticmethod
    def generate_personalized_checklist(company):
        """
        Generate framework-based personalized checklist:
        1. Only include elements that match company's active frameworks (E/D/G)
        2. Must-have elements for matching frameworks are always included
        3. Conditional elements activated by "Yes" answers for matching frameworks
        4. Uses framework-based filtering per prompt.txt
        """
        with transaction.atomic():
            # Clear existing checklist
            CompanyChecklist.objects.filter(company=company).delete()

            # Ensure company has active frameworks set
            if not company.active_frameworks:
                company.update_active_frameworks()

            # Get available elements for this company based on frameworks
            available_elements = company.get_available_elements()

            # Filter must-have elements from available elements
            must_have_elements = available_elements.filter(
                requirement_type='must-have'
            ).exclude(element_id__startswith='LEGACY_')

            # Get conditional elements activated by "Yes" answers (only from available elements)
            yes_answers = CompanyProfileAnswer.objects.filter(
                company=company,
                answer=True
            ).values_list('question__activates_element_id', flat=True)

            # Get conditional elements that were activated AND are available for this company
            conditional_elements = available_elements.filter(
                element_id__in=yes_answers,
                requirement_type='conditional'
            ).exclude(element_id__startswith='LEGACY_')

            # Combine framework-filtered elements
            all_elements = must_have_elements.union(conditional_elements)

            # Create checklist items using framework-filtered elements
            for element in all_elements:
                # Use cadence directly from the element (from Excel import)
                element_cadence = element.cadence or 'annual'

                # Create checklist item
                checklist_item = CompanyChecklist.objects.create(
                    company=company,
                    element=element,
                    is_required=True,
                    cadence=element_cadence
                )

                # Framework information is already stored in the element.frameworks field

            return CompanyChecklist.objects.filter(company=company)


class MeterService:
    """Service for handling meter management"""
    
    @staticmethod
    def auto_create_meters(company):
        """Automatically create default meters for metered data elements"""
        checklist_items = CompanyChecklist.objects.filter(
            company=company,
            element__is_metered=True
        )
        
        created_meters = []
        for item in checklist_items:
            # Create a default "Main" meter for each metered element type
            meter_type = item.element.name  # Use element name as meter type
            
            # Check if a meter of this type already exists
            existing_meter = Meter.objects.filter(
                company=company,
                type=meter_type
            ).first()
            
            if not existing_meter:
                meter = Meter.objects.create(
                    company=company,
                    type=meter_type,
                    name="Main",
                    status='active'
                )
                created_meters.append(meter)
        
        return created_meters
    
    @staticmethod
    def can_delete_meter(meter):
        """Check if meter can be deleted (no associated data)"""
        return not meter.has_data()


class DataCollectionService:
    """Service for handling data collection and tracking"""
    
    @staticmethod
    def get_available_months(year):
        """Get available months for data collection based on year"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        if year == current_year:
            # For current year, show all 12 months to allow planning ahead
            return list(range(1, 13))
        elif year < current_year:
            # For past years, show all 12 months
            return list(range(1, 13))
        else:
            # For future years, show no months
            return []
    
    @staticmethod
    def get_data_collection_tasks(company, year, month, user=None):
        """Get all data collection tasks for a specific month - shared data visibility"""
        month_name = datetime(year, month, 1).strftime('%b')
        
        # Get checklist items filtered by cadence appropriate for this month
        # Only include tasks that should appear in this specific month
        monthly_cadences = ['monthly', 'daily']  # Monthly tasks + daily reporting tasks

        # For annual tasks, only show them in December or January (configurable)
        annual_month = 12  # December for annual reporting
        if month == annual_month:
            allowed_cadences = monthly_cadences + ['annual']
        else:
            allowed_cadences = monthly_cadences

        # Event-based tasks are only created when specific events occur
        # They should not appear as regular monthly tasks
        checklist_items = CompanyChecklist.objects.filter(
            company=company,
            cadence__in=allowed_cadences
        )

        tasks = []
        for item in checklist_items:
            if item.element.is_metered:
                # For metered elements, create task for each active meter
                # Enhanced matching for comprehensive ESG framework
                element_lower = item.element.name.lower()

                # Map comprehensive framework elements to meter types
                if 'electricity consumption' in element_lower:
                    meter_type = 'Electricity Consumption'
                elif 'water consumption' in element_lower:
                    meter_type = 'Water Consumption'
                elif 'district cooling' in element_lower:
                    meter_type = 'District Cooling Consumption'
                elif 'renewable energy generation' in element_lower or 'on-site renewable' in element_lower:
                    meter_type = 'Renewable Energy Generation'
                elif 'water flow rate' in element_lower:
                    if 'shower' in element_lower:
                        meter_type = 'Water Flow - Showers'
                    elif 'tap' in element_lower:
                        meter_type = 'Water Flow - Taps'
                    else:
                        meter_type = 'Water Flow Rate'
                elif 'sub-metered water' in element_lower:
                    meter_type = 'Sub-metered Water'
                elif 'renewable energy percentage' in element_lower:
                    meter_type = 'Renewable Energy Percentage'
                else:
                    # For backward compatibility with legacy elements
                    meter_type = item.element.name

                # Try exact match first
                meters = Meter.objects.filter(
                    company=company,
                    type=meter_type,
                    status='active'
                )

                # If no exact match, try flexible matching
                if not meters.exists():
                    # Try partial matches for backward compatibility
                    if 'electricity' in element_lower:
                        meters = Meter.objects.filter(
                            company=company,
                            type__icontains='Electricity',
                            status='active'
                        )
                    elif 'water' in element_lower:
                        meters = Meter.objects.filter(
                            company=company,
                            type__icontains='Water',
                            status='active'
                        )
                    elif 'renewable' in element_lower:
                        meters = Meter.objects.filter(
                            company=company,
                            type__icontains='Renewable',
                            status='active'
                        )

                # If still no meters found, auto-create one
                if not meters.exists():
                    meter = Meter.objects.create(
                        company=company,
                        type=meter_type,
                        name='Main',
                        status='active',
                        is_auto_created=True
                    )
                    meters = [meter]
                for meter in meters:
                    # Find existing submission from ANY user, or create new one for current user
                    submission = CompanyDataSubmission.objects.filter(
                        company=company,
                        element=item.element,
                        meter=meter,
                        reporting_year=year,
                        reporting_period=month_name
                    ).first()
                    
                    if not submission:
                        # Create new submission record with current user
                        submission = CompanyDataSubmission.objects.create(
                            user=user,
                            company=company,
                            element=item.element,
                            meter=meter,
                            reporting_year=year,
                            reporting_period=month_name
                        )
                    
                    tasks.append({
                        'type': 'metered',
                        'element': item.element,
                        'meter': meter,
                        'submission': submission,
                        'cadence': item.cadence
                    })
            else:
                # For non-metered elements, find existing submission from ANY user or create new
                submission = CompanyDataSubmission.objects.filter(
                    company=company,
                    element=item.element,
                    meter=None,
                    reporting_year=year,
                    reporting_period=month_name
                ).first()
                
                if not submission:
                    # Create new submission record with current user
                    submission = CompanyDataSubmission.objects.create(
                        user=user,
                        company=company,
                        element=item.element,
                        meter=None,
                        reporting_year=year,
                        reporting_period=month_name
                    )
                
                tasks.append({
                    'type': 'non_metered',
                    'element': item.element,
                    'meter': None,
                    'submission': submission,
                    'cadence': item.cadence
                })
        
        return tasks
    
    @staticmethod
    def calculate_progress(company, year, month=None, user=None):
        """Calculate data collection progress - counts data and evidence as separate tasks"""
        filters = {'company': company, 'reporting_year': year}
        
        if month:
            month_name = datetime(year, month, 1).strftime('%b')
            filters['reporting_period'] = month_name
        else:
            # For yearly progress, ensure all tasks are created for all 12 months
            # Create submissions for the FULL year (Jan-Dec)
            for month_num in range(1, 13):
                tasks = DataCollectionService.get_data_collection_tasks(company, year, month_num, user=user)
        
        # Remove user filtering to allow shared data visibility
        # All users can see data entered by any user for the same company
        
        submissions = CompanyDataSubmission.objects.filter(**filters)
        
        # Filter out submissions from inactive meters
        # Include submissions without meters (non-metered tasks) and submissions from active meters only
        active_submissions = submissions.filter(
            Q(meter__isnull=True) | Q(meter__status='active')
        )
        
        # Separate active period submissions from inactive period submissions
        active_period_submissions = active_submissions.exclude(value='INACTIVE_PERIOD')
        inactive_period_submissions = active_submissions.filter(value='INACTIVE_PERIOD')
        
        total_active_submissions = active_period_submissions.count()
        total_inactive_submissions = inactive_period_submissions.count()
        
        if total_active_submissions == 0 and total_inactive_submissions == 0:
            return {
                'data_progress': 0, 
                'evidence_progress': 0, 
                'total_points': 0, 
                'completed_points': 0,
                'items_remaining': 0,
                'inactive_period_points': 0
            }
        
        # Count completed data entries and evidence files separately (only from active period)
        data_complete = active_period_submissions.exclude(value='').count()
        evidence_complete = active_period_submissions.exclude(evidence_file='').count()
        
        # Total tasks = active submissions × 2 (data + evidence for each submission)
        total_active_tasks = total_active_submissions * 2
        
        # Inactive period tasks (shown as incomplete/orange)
        total_inactive_tasks = total_inactive_submissions * 2
        
        # Completed tasks = data entries + evidence uploads (only from active period)
        completed_tasks = data_complete + evidence_complete
        
        # Remaining tasks = total active tasks - completed tasks
        items_remaining = total_active_tasks - completed_tasks
        
        # Calculate percentages based on active period only
        overall_progress = (completed_tasks / total_active_tasks) * 100 if total_active_tasks > 0 else 0
        data_progress = (data_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0
        evidence_progress = (evidence_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0
        
        return {
            'data_progress': data_progress,
            'evidence_progress': evidence_progress,
            'overall_progress': overall_progress,
            'total_points': total_active_tasks,  # Only active period tasks
            'completed_points': completed_tasks,
            'items_remaining': items_remaining,
            'total_submissions': total_active_submissions,  # Active period submissions
            'data_complete': data_complete,
            'evidence_complete': evidence_complete,
            'inactive_period_points': total_inactive_tasks,  # New field for inactive period
            'inactive_period_submissions': total_inactive_submissions
        }


class DashboardService:
    """Service for dashboard statistics and data visualization"""
    
    @staticmethod
    def get_dashboard_stats(company, user=None):
        """Get comprehensive dashboard statistics"""
        # Basic counts
        total_frameworks = company.companyframework_set.count()
        total_data_elements = CompanyChecklist.objects.filter(company=company).count()
        total_meters = Meter.objects.filter(company=company).count()
        active_meters = Meter.objects.filter(company=company, status='active').count()
        
        # Data completeness (for current year)
        current_year = datetime.now().year
        year_progress = DataCollectionService.calculate_progress(company, current_year, user=user)
        
        # Monthly data for charts
        monthly_data = []
        for month in range(1, 13):
            month_progress = DataCollectionService.calculate_progress(company, current_year, month, user=user)
            monthly_data.append({
                'month': datetime(current_year, month, 1).strftime('%b'),
                'data_progress': month_progress['data_progress'],
                'evidence_progress': month_progress['evidence_progress']
            })
        
        return {
            'total_frameworks': total_frameworks,
            'total_data_elements': total_data_elements,
            'total_meters': total_meters,
            'active_meters': active_meters,
            'data_completeness_percentage': year_progress['data_progress'],
            'evidence_completeness_percentage': year_progress['evidence_progress'],
            'monthly_data': monthly_data
        }