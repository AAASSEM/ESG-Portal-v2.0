"""
Management command to create missing DataElements needed for profiling questions
"""
from django.core.management.base import BaseCommand
from core.models import DataElement


class Command(BaseCommand):
    help = 'Create missing DataElements needed for all 22 profiling questions'

    def handle(self, *args, **options):
        # Missing DataElements that profiling questions reference
        missing_elements = [
            {
                'element_id': 'HOSP-S-005',
                'name': 'Diversity and Inclusion Policies',
                'description': 'Diversity and inclusion policies or programs',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-006',
                'name': 'Employee Satisfaction Surveys',
                'description': 'Employee satisfaction or engagement surveys',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-008',
                'name': 'Learning and Development Programs',
                'description': 'Learning and development programs for employees',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-010',
                'name': 'Community Engagement Programs',
                'description': 'Formal community engagement or support programs',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-011',
                'name': 'Charitable Donations',
                'description': 'Charitable donations or contributions to community causes',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-013',
                'name': 'Customer Complaint Handling',
                'description': 'Formal customer complaint handling process',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-S-015',
                'name': 'Supplier Social Assessments',
                'description': 'Supplier assessments that include social criteria',
                'category': 'Social',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'S',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-G-003',
                'name': 'Independent Directors',
                'description': 'Board of directors includes independent directors',
                'category': 'Governance',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'G',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-G-004',
                'name': 'Risk Management Framework',
                'description': 'Formal risk management framework',
                'category': 'Governance',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'G',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-G-005',
                'name': 'Compliance Audits',
                'description': 'Regular compliance audits',
                'category': 'Governance',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'G',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-G-006',
                'name': 'Ethics and Anti-corruption Policy',
                'description': 'Formal ethics and anti-corruption policy',
                'category': 'Governance',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'G',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            },
            {
                'element_id': 'HOSP-G-007',
                'name': 'Whistleblowing Mechanism',
                'description': 'Whistleblowing mechanism or policy',
                'category': 'Governance',
                'type': 'conditional',
                'unit': '',
                'is_metered': False,
                'esg_category': 'G',
                'requirement_type': 'conditional',
                'frameworks': 'E',
                'cadence': 'annual'
            }
        ]

        created_count = 0
        for element_data in missing_elements:
            element, created = DataElement.objects.get_or_create(
                element_id=element_data['element_id'],
                defaults=element_data
            )

            if created:
                created_count += 1
                self.stdout.write(f'Created DataElement: {element.element_id}')
            else:
                self.stdout.write(f'DataElement already exists: {element.element_id}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully processed {len(missing_elements)} DataElements: {created_count} created')
        )