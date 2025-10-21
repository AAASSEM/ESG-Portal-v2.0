#!/usr/bin/env python3
import os
import sys
import django

# Set up Django environment
sys.path.append('/mnt/c/Users/20100/thefinal/vsim2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import CompanyDataSubmission, DataElement, Company

def analyze_task_structure():
    try:
        # Get Dubai Luxury Hotel company
        company = Company.objects.get(name__icontains='Dubai Luxury Hotel')
        print(f"📊 Analyzing task structure for {company.name}")

        # Get all submissions
        submissions = CompanyDataSubmission.objects.filter(company=company)
        print(f"Total submissions: {submissions.count()}")

        # Group by element and count submissions per element
        from django.db.models import Count
        element_counts = submissions.values('element__name').annotate(count=Count('id')).order_by('element__name')

        print(f"\n🔍 Task breakdown by element:")
        annual_tasks = []
        monthly_tasks = []

        for element in element_counts:
            element_name = element['element__name']
            count = element['count']

            # Check if this is annual or monthly based on count
            if count == 1:
                annual_tasks.append(element_name)
                print(f"  📅 ANNUAL: {element_name}: {count} submission")
            elif count == 12:
                monthly_tasks.append(element_name)
                print(f"  📆 MONTHLY: {element_name}: {count} submissions")
            else:
                print(f"  ❌ IRREGULAR: {element_name}: {count} submissions (should be 1 or 12)")

        print(f"\n📋 Summary:")
        print(f"  Annual tasks: {len(annual_tasks)}")
        print(f"  Monthly tasks: {len(monthly_tasks)}")
        print(f"  Expected total: {len(annual_tasks) * 1 + len(monthly_tasks) * 12}")
        print(f"  Actual total: {submissions.count()}")

        # Show details of annual tasks
        print(f"\n📅 Annual Tasks (should have 1 submission each):")
        for task_name in annual_tasks:
            task = submissions.filter(element__name=task_name).first()
            print(f"  {task_name}: \"{task.value}\" ({task.reporting_period})")

        # Check for meter tasks specifically
        print(f"\n🔍 Checking for meter tasks:")
        meter_tasks = submissions.filter(meter__isnull=False)
        print(f"Total meter tasks: {meter_tasks.count()}")

        if meter_tasks.exists():
            meter_elements = meter_tasks.values('element__name', 'meter__name').distinct()
            for item in meter_elements:
                count = meter_tasks.filter(element__name=item['element__name'], meter__name=item['meter__name']).count()
                print(f"  {item['element__name']} - {item['meter__name']}: {count} submissions")

                # Show sample values
                sample = meter_tasks.filter(element__name=item['element__name'], meter__name=item['meter__name']).first()
                print(f"    Sample: {sample.value} ({sample.reporting_period})")
        else:
            print("  ❌ No meter tasks found!")

        # Identify tasks with wrong counts
        print(f"\n❌ Tasks with incorrect submission counts:")
        irregular_tasks = submissions.values('element__name').annotate(count=Count('id')).filter(count__in=[2,3,4,5,6,7,8,9,10,11])

        for task in irregular_tasks:
            element_name = task['element__name']
            count = task['count']
            print(f"  {element_name}: {count} submissions (should be 1 or 12)")

            # Show all submissions for this problematic element
            element_submissions = submissions.filter(element__name=element_name).order_by('reporting_period')
            for sub in element_submissions:
                print(f"    {sub.reporting_period}: \"{sub.value}\"")

        return {
            'annual_tasks': annual_tasks,
            'monthly_tasks': monthly_tasks,
            'irregular_tasks': list(irregular_tasks),
            'meter_tasks_count': meter_tasks.count()
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    analyze_task_structure()