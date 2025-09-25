#!/usr/bin/env python3
"""
Test script to verify framework-based element filtering is working correctly
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import Company, DataElement, ProfilingQuestion


def test_framework_filtering():
    print("=== Framework-Based Element Filtering Test ===\n")

    companies = Company.objects.all()
    total_elements = DataElement.objects.exclude(element_id__startswith='LEGACY_').count()

    print(f"Total elements in system: {total_elements}")
    print(f"Total companies: {companies.count()}\n")

    for company in companies:
        print(f"Company: {company.name}")
        print(f"  Location: {company.emirate}")
        print(f"  Sector: {company.sector}")
        print(f"  Active frameworks: {company.active_frameworks}")
        print(f"  Has Green Key: {company.has_green_key}")

        # Test available elements
        available_elements = company.get_available_elements()
        must_have = available_elements.filter(requirement_type='must-have')
        conditional = available_elements.filter(requirement_type='conditional')

        print(f"  Available elements: {available_elements.count()}")
        print(f"    - Must-have: {must_have.count()}")
        print(f"    - Conditional: {conditional.count()}")

        # Test profiling questions
        from core.services import ProfilingService
        questions = ProfilingService.get_profiling_questions(company)
        print(f"  Profiling questions: {questions.count()}")

        # Show framework breakdown
        framework_breakdown = {}
        for element in available_elements:
            if element.frameworks:
                frameworks = element.frameworks
                if frameworks not in framework_breakdown:
                    framework_breakdown[frameworks] = 0
                framework_breakdown[frameworks] += 1

        print(f"  Framework breakdown:")
        for fw, count in framework_breakdown.items():
            print(f"    {fw}: {count} elements")

        print()

    print("=== Expected Behavior ===")
    print("- E-only companies (Abu Dhabi Tech): ~30-35 elements")
    print("- E+D companies (Dubai hotels): ~55-60 elements")
    print("- E+D+G companies (with Green Key): ~80 elements")
    print("- Profiling questions should match available conditional elements")


if __name__ == "__main__":
    test_framework_filtering()