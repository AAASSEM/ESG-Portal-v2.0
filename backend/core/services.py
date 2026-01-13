"""
Business logic services for ESG application
"""
from django.db import transaction
from django.db.models import Count, Q
from datetime import datetime
from collections import defaultdict
import time
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
        
        # Dubai Energy Regulations is VOLUNTARY, not auto-assigned
        # Users can select it manually if needed
        
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
            obj, created = CompanyFramework.objects.get_or_create(
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': False}
            )

            print(f"✅ Assigned {framework_id} to {company.name}, created={created}")
            return True
        except Framework.DoesNotExist:
            print(f"❌ Framework {framework_id} not found")
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
        """
        Optimized version using bulk queries to eliminate N+1 problems.
        Target: < 2 seconds instead of 8.7 seconds.
        Event-based tasks (on_installation, on_purchase, etc.) are included in December.
        """
        try:
            print(f"🚀 DEBUG: Optimized get_data_collection_tasks called for company={company.name}, year={year}, month={month}")
            month_name = datetime(year, month, 1).strftime('%b')

            # Determine allowed cadences
            monthly_cadences = ['monthly', 'daily']
            annual_month = 12
            event_cadences = ['on_installation', 'on_purchase', 'on_change', 'on_menu_change', 'on_implementation']

            # In December, include both annual and event-based tasks
            if month == annual_month:
                allowed_cadences = monthly_cadences + ['annual'] + event_cadences
            else:
                allowed_cadences = monthly_cadences
            print(f"🔍 DEBUG: Month={month}, Allowed cadences={allowed_cadences}")

            # BULK QUERIES - Get all data at once upfront

            # 1. Get checklist items with element data in one query
            checklist_items = CompanyChecklist.objects.filter(
                company=company,
                cadence__in=allowed_cadences
            ).select_related('element')

            # 2. Get all active meters for this company in one query
            all_active_meters = Meter.objects.filter(
                company=company,
                status='active'
            ).select_related('company')

            # 3. Get all existing submissions for this company/month in one query
            existing_submissions = CompanyDataSubmission.objects.filter(
                company=company,
                reporting_year=year,
                reporting_period=month_name
            ).select_related('element', 'meter', 'assigned_to', 'assigned_by')

            # BUILD LOOKUP DICTIONARIES for O(1) access instead of repeated queries

            # Meter lookup: type -> [meters]
            meter_lookup = {}
            for meter in all_active_meters:
                meter_lookup.setdefault(meter.type, []).append(meter)

            # Submission lookup: (element_id, meter_id) -> submission
            submission_lookup = {}
            for submission in existing_submissions:
                element_id = submission.element.element_id if hasattr(submission, 'element') and submission.element else None
                meter_id = submission.meter.id if hasattr(submission, 'meter') and submission.meter else None

                if element_id:
                    key = (element_id, meter_id)
                    submission_lookup[key] = submission

            print(f"🔍 DEBUG: Built meter_lookup with {len(meter_lookup)} meter types")
            print(f"🔍 DEBUG: Built submission_lookup with {len(submission_lookup)} submissions")

            # Bulk fetch ElementAssignments to optimize assignment lookups
            from .models import ElementAssignment
            element_assignments = ElementAssignment.objects.filter(
                company=company,
                assignment_level='element'
            ).select_related('checklist_item', 'assigned_to', 'assigned_by')

            category_assignments = ElementAssignment.objects.filter(
                company=company,
                assignment_level='category'
            ).select_related('assigned_to', 'assigned_by')

            # Build assignment lookup dictionaries
            element_assignment_lookup = {ea.checklist_item.id: ea for ea in element_assignments}
            category_assignment_lookup = {ea.category: ea for ea in category_assignments}

            print(f"🔍 DEBUG: Built element_assignment_lookup with {len(element_assignment_lookup)} assignments")
            print(f"🔍 DEBUG: Built category_assignment_lookup with {len(category_assignment_lookup)} assignments")

            print(f"🔍 DEBUG: Found {len(checklist_items)} checklist items")
            print(f"🔍 DEBUG: Found {len(all_active_meters)} active meters")
            print(f"🔍 DEBUG: Found {len(existing_submissions)} existing submissions")

            # Debug: Show first few items
            if checklist_items:
                print(f"🔍 DEBUG: First checklist item: ID={checklist_items[0].id}, Element={checklist_items[0].element}, Cadence={checklist_items[0].cadence}")
            if all_active_meters:
                print(f"🔍 DEBUG: First meter: Type={all_active_meters[0].type}, Status={all_active_meters[0].status}")

            tasks = []
            for item in checklist_items:
                try:
                    element = item.element
                    element_lower = element.name.lower()

                    # Use optimized lookup instead of queries
                    element_assignment = element_assignment_lookup.get(item.id)
                    category_assignment = category_assignment_lookup.get(element.category) if element.category else None

                    # Determine assignment details
                    assigned_to = None
                    assigned_by = None
                    assigned_at = None

                    if element_assignment:
                        assigned_to = element_assignment.assigned_to
                        assigned_by = element_assignment.assigned_by
                        assigned_at = element_assignment.assigned_at
                    elif category_assignment:
                        assigned_to = category_assignment.assigned_to
                        assigned_by = category_assignment.assigned_by
                        assigned_at = category_assignment.assigned_at

                    if element.is_metered:
                        # Map element to meter types
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
                            meter_type = element.name

                        # Get meters using lookup instead of queries
                        meters = meter_lookup.get(meter_type, [])
                        print(f"🔍 DEBUG: Element '{element.name}' -> meter_type '{meter_type}' -> found {len(meters)} meters")

                        # Try flexible matching if no exact match
                        if not meters:
                            print(f"🔍 DEBUG: No exact match for '{meter_type}', trying flexible matching...")
                            for key, meter_list in meter_lookup.items():
                                if 'electricity' in element_lower and 'electricity' in key.lower():
                                    meters = meter_list
                                    print(f"🔍 DEBUG: Flexible match found: {key} -> {len(meters)} meters")
                                    break
                                elif 'water' in element_lower and 'water' in key.lower():
                                    meters = meter_list
                                    print(f"🔍 DEBUG: Flexible match found: {key} -> {len(meters)} meters")
                                    break
                                elif 'renewable' in element_lower and 'renewable' in key.lower():
                                    meters = meter_list
                                    print(f"🔍 DEBUG: Flexible match found: {key} -> {len(meters)} meters")
                                    break
                                elif 'water' in element_lower and 'water' in key.lower():
                                    meters = meter_list
                                    break
                                elif 'renewable' in element_lower and 'renewable' in key.lower():
                                    meters = meter_list
                                    break

                        # Auto-create meter if none found
                        if not meters:
                            meter = Meter.objects.create(
                                company=company,
                                type=meter_type,
                                name='Main',
                                status='active',
                                is_auto_created=True
                            )
                            meters = [meter]

                        # Process each meter
                        for meter in meters:
                            # Get submission using lookup instead of query
                            key = (element.element_id, meter.id)
                            submission = submission_lookup.get(key)

                            if not submission:
                                # Create new submission record
                                submission = CompanyDataSubmission.objects.create(
                                    user=user,
                                    company=company,
                                    element=element,
                                    meter=meter,
                                    reporting_year=year,
                                    reporting_period=month_name,
                                    assigned_to=assigned_to,
                                    assigned_by=assigned_by,
                                    assigned_at=assigned_at
                                )
                            else:
                                # Update existing submission if needed
                                if not submission.assigned_to and assigned_to:
                                    submission.assigned_to = assigned_to
                                    submission.assigned_by = assigned_by
                                    submission.assigned_at = assigned_at
                                    submission.save()

                            tasks.append({
                                'type': 'metered',
                                'element': element,
                                'meter': meter,
                                'submission': submission,
                                'cadence': item.cadence
                            })
                    else:
                        # Non-metered element - get submission using lookup
                        key = (element.element_id, None)
                        submission = submission_lookup.get(key)

                        if not submission:
                            # Create new submission record
                            submission = CompanyDataSubmission.objects.create(
                                user=user,
                                company=company,
                                element=element,
                                meter=None,
                                reporting_year=year,
                                reporting_period=month_name,
                                assigned_to=assigned_to,
                                assigned_by=assigned_by,
                                assigned_at=assigned_at
                            )
                        else:
                            # Update existing submission if needed
                            if not submission.assigned_to and assigned_to:
                                submission.assigned_to = assigned_to
                                submission.assigned_by = assigned_by
                                submission.assigned_at = assigned_at
                                submission.save()

                        tasks.append({
                            'type': 'non_metered',
                            'element': element,
                            'meter': None,
                            'submission': submission,
                            'cadence': item.cadence
                        })

                except Exception as e:
                    print(f"❌ ERROR processing checklist item {item.id}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    continue

            print(f"✅ Successfully generated {len(tasks)} tasks")
            return tasks

        except Exception as e:
            print(f"❌ CRITICAL ERROR in get_data_collection_tasks: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def calculate_annual_task_totals(company, year, user=None):
        """Calculate correct annual task totals accounting for cadence types including event-based tasks"""
        from .models import CompanyChecklist, Meter

        # Get all checklist items for this company
        checklist_items = CompanyChecklist.objects.filter(company=company)

        # Separate by cadence type
        monthly_daily_items = checklist_items.filter(cadence__in=['monthly', 'daily'])
        annual_items = checklist_items.filter(cadence='annual')
        event_items = checklist_items.filter(cadence__in=['on_installation', 'on_purchase', 'on_change', 'on_menu_change', 'on_implementation'])

        total_annual_tasks = 0

        # Process monthly/daily items (appear 12 times per year)
        for item in monthly_daily_items:
            if item.element.is_metered:
                # Count active meters for this element type
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 12 months × 2 (data + evidence)
                total_annual_tasks += active_meters.count() * 12 * 2
            else:
                # Non-metered: 12 months × 2 (data + evidence)
                total_annual_tasks += 12 * 2

        # Process annual items (appear once per year in December)
        for item in annual_items:
            if item.element.is_metered:
                # Count active meters for this element type
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 1 time × 2 (data + evidence)
                total_annual_tasks += active_meters.count() * 1 * 2
            else:
                # Non-metered: 1 time × 2 (data + evidence)
                total_annual_tasks += 1 * 2

        # Process event-based items (appear once per year in December - one-time tasks)
        for item in event_items:
            if item.element.is_metered:
                # Count active meters for this element type
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 1 time × 2 (data + evidence)
                total_annual_tasks += active_meters.count() * 1 * 2
            else:
                # Non-metered: 1 time × 2 (data + evidence)
                total_annual_tasks += 1 * 2

        return total_annual_tasks

    @staticmethod
    def calculate_monthly_task_totals(company, year, month, user=None):
        """Calculate correct monthly task totals - annual and event tasks only in December"""
        from .models import CompanyChecklist, Meter

        # Get checklist items appropriate for this month - use same logic as get_data_collection_tasks
        checklist_items = CompanyChecklist.objects.filter(company=company)

        # Monthly/daily tasks that appear every month
        monthly_cadences = ['monthly', 'daily']
        monthly_items = checklist_items.filter(cadence__in=monthly_cadences)

        # Annual and event-based tasks only appear in December (month 12)
        annual_month = 12  # December for annual reporting
        if month == annual_month:
            allowed_cadences = monthly_cadences + ['annual'] + ['on_installation', 'on_purchase', 'on_change', 'on_menu_change', 'on_implementation']
            annual_items = checklist_items.filter(cadence='annual')
            event_items = checklist_items.filter(cadence__in=['on_installation', 'on_purchase', 'on_change', 'on_menu_change', 'on_implementation'])
        else:
            allowed_cadences = monthly_cadences
            annual_items = checklist_items.none()  # Empty queryset for non-December months
            event_items = checklist_items.none()  # Empty queryset for non-December months

        total_monthly_tasks = 0

        # Process monthly/daily items (appear every month)
        for item in monthly_items:
            if item.element.is_metered:
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 1 month × 2 (data + evidence)
                total_monthly_tasks += active_meters.count() * 1 * 2
            else:
                # Non-metered: 1 month × 2 (data + evidence)
                total_monthly_tasks += 1 * 2

        # Process annual items (only in December)
        for item in annual_items:
            if item.element.is_metered:
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 1 time × 2 (data + evidence)
                total_monthly_tasks += active_meters.count() * 1 * 2
            else:
                # Non-metered: 1 time × 2 (data + evidence)
                total_monthly_tasks += 1 * 2

        # Process event-based items (only in December - one-time tasks)
        for item in event_items:
            if item.element.is_metered:
                active_meters = Meter.objects.filter(
                    company=company,
                    type=item.element.name,
                    status='active'
                )
                # Each meter × 1 time × 2 (data + evidence)
                total_monthly_tasks += active_meters.count() * 1 * 2
            else:
                # Non-metered: 1 time × 2 (data + evidence)
                total_monthly_tasks += 1 * 2

        return total_monthly_tasks

    @staticmethod
    def calculate_annual_task_totals_optimized(company, year, user=None):
        """
        SIMPLE OPTIMIZED version that avoids the 12 API calls.
        Target: < 1 second instead of 3-4 seconds.
        Event-based tasks are included in annual totals (shown in December).
        """
        print(f"🚀 DEBUG: SIMPLE OPTIMIZED annual task totals for {company.name} {year}")
        start_time = time.time()

        # Use the existing working function but avoid the 12 API calls
        # Just count tasks directly using bulk queries

        # Get all checklist items in one query
        checklist_items = CompanyChecklist.objects.filter(company=company).select_related('element')

        # Get all active meters in one query
        active_meters = Meter.objects.filter(company=company, status='active').count()

        print(f"🔍 DEBUG: Found {len(checklist_items)} checklist items, {active_meters} active meters")

        monthly_cadences = ['monthly', 'daily']
        event_cadences = ['on_installation', 'on_purchase', 'on_change', 'on_menu_change', 'on_implementation']
        total_tasks = 0

        # Count tasks by cadence - this is much faster than individual meter queries
        monthly_items = checklist_items.filter(cadence__in=monthly_cadences)
        annual_items = checklist_items.filter(cadence='annual')
        event_items = checklist_items.filter(cadence__in=event_cadences)

        # For simplicity, estimate based on average meter count per element
        # This is much faster than exact individual lookups
        if monthly_items.exists():
            # Monthly items appear 12 times per year
            monthly_count = monthly_items.count()
            total_tasks += monthly_count * 12 * 2  # ×12 months × 2 tasks (data + evidence)

        if annual_items.exists():
            # Annual items appear once per year (December)
            annual_count = annual_items.count()
            total_tasks += annual_count * 1 * 2  # ×1 time × 2 tasks (data + evidence)

        if event_items.exists():
            # Event-based tasks appear once per year (December) - one-time tasks
            event_count = event_items.count()
            total_tasks += event_count * 1 * 2  # ×1 time × 2 tasks (data + evidence)
            print(f"🔍 DEBUG: Added {event_count} event-based tasks to annual total")

        elapsed = (time.time() - start_time) * 1000
        print(f"✅ SIMPLE optimized annual task totals completed in {elapsed:.0f}ms: {total_tasks} total tasks")
        return total_tasks

    @staticmethod
    def calculate_progress_original(company, year, month=None, user=None):
        """Original calculate_progress function as fallback - SLOW BUT RELIABLE"""
        from django.db.models import Q
        filters = {'company': company, 'reporting_year': year}

        if month:
            month_name = datetime(year, month, 1).strftime('%b')
            # Create tasks for this specific month
            tasks = DataCollectionService.get_data_collection_tasks(company, year, month, user=user)
            # For monthly view: get submissions from current month only
            submissions = CompanyDataSubmission.objects.filter(
                company=company, reporting_year=year, reporting_period=month_name
            )
        else:
            # For yearly progress, ensure all tasks are created for all 12 months
            for month_num in range(1, 13):
                tasks = DataCollectionService.get_data_collection_tasks(company, year, month_num, user=user)
            # For yearly view: get ALL submissions
            submissions = CompanyDataSubmission.objects.filter(**filters)

        # Filter out submissions from inactive meters
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

        # Total tasks calculation
        if month:
            total_active_tasks = DataCollectionService.calculate_monthly_task_totals(company, year, month, user)
        else:
            total_active_tasks = DataCollectionService.calculate_annual_task_totals(company, year, user)

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

        result = {
            'data_progress': data_progress,
            'evidence_progress': evidence_progress,
            'overall_progress': overall_progress,
            'total_points': total_active_tasks,
            'completed_points': completed_tasks,
            'items_remaining': items_remaining,
            'total_submissions': total_active_submissions,
            'data_complete': data_complete,
            'evidence_complete': evidence_complete,
            'inactive_period_points': total_inactive_tasks,
            'inactive_period_submissions': total_inactive_submissions
        }

        return result

    @staticmethod
    def calculate_progress(company, year, month=None, user=None):
        """Calculate data collection progress - OPTIMIZED VERSION"""
        try:
            print(f"🚀 DEBUG: Optimized calculate_progress called for company={company.name}, year={year}, month={month}")
            start_time = time.time()

            from django.db.models import Q

            if month:
                # Monthly progress - simple case
                month_name = datetime(year, month, 1).strftime('%b')
                print(f"🔍 DEBUG: Monthly progress for {month_name} {year}")

                submissions = CompanyDataSubmission.objects.filter(
                    company=company,
                    reporting_year=year,
                    reporting_period=month_name
                ).select_related('meter').filter(
                    Q(meter__isnull=True) | Q(meter__status='active')
                )

                total_active_tasks = DataCollectionService.calculate_monthly_task_totals(company, year, month, user)

            else:
                # YEARLY progress - OPTIMIZED version
                print(f"🔍 DEBUG: YEARLY progress for {year} - OPTIMIZED")

                # Get ALL submissions at once (no 12 separate calls!)
                submissions = CompanyDataSubmission.objects.filter(
                    company=company,
                    reporting_year=year
                ).select_related('meter').filter(
                    Q(meter__isnull=True) | Q(meter__status='active')
                )

                # Use optimized annual totals calculation
                total_active_tasks = DataCollectionService.calculate_annual_task_totals_optimized(company, year, user)

            # Filter active period submissions
            active_period_submissions = submissions.exclude(value='INACTIVE_PERIOD')
            total_active_submissions = active_period_submissions.count()

            if total_active_submissions == 0:
                return {
                    'data_progress': 0,
                    'evidence_progress': 0,
                    'total_points': total_active_tasks,
                    'completed_points': 0,
                    'items_remaining': total_active_tasks,
                    'data_complete': 0,
                    'evidence_complete': 0,
                    'inactive_period_points': 0,
                    'inactive_period_submissions': 0
                }

            # Count completed tasks
            data_complete = active_period_submissions.exclude(value='').count()
            evidence_complete = active_period_submissions.exclude(evidence_file='').count()
            completed_tasks = data_complete + evidence_complete
            items_remaining = total_active_tasks - completed_tasks

            # Calculate percentages
            overall_progress = (completed_tasks / total_active_tasks) * 100 if total_active_tasks > 0 else 0
            data_progress = (data_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0
            evidence_progress = (evidence_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0

            elapsed = (time.time() - start_time) * 1000
            print(f"✅ Optimized calculate_progress completed in {elapsed:.0f}ms")

            return {
                'data_progress': data_progress,
                'evidence_progress': evidence_progress,
                'overall_progress': overall_progress,
                'total_points': total_active_tasks,
                'completed_points': completed_tasks,
                'items_remaining': items_remaining,
                'total_submissions': total_active_submissions,
                'data_complete': data_complete,
                'evidence_complete': evidence_complete,
                'inactive_period_points': 0,
                'inactive_period_submissions': 0
            }

        except Exception as e:
            print(f"❌ ERROR in optimized calculate_progress: {str(e)}")
            import traceback
            traceback.print_exc()
            print("🔄 Falling back to original function...")
            return DataCollectionService.calculate_progress_original(company, year, month, user)


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