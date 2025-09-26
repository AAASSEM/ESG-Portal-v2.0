"""
Management command to populate profiling questions in production database
"""
from django.core.management.base import BaseCommand
from core.models import ProfilingQuestion, DataElement


class Command(BaseCommand):
    help = 'Populate profiling questions for the wizard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing questions before creating new ones',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Deleting existing profiling questions...')
            ProfilingQuestion.objects.all().delete()

        # Profiling questions data
        questions_data = [
            {
                "question_id": "cond_hosp_e_003",
                "text": "Does your company use a district cooling service for air conditioning?",
                "activates_element": "HOSP-E-003",
                "order": 1
            },
            {
                "question_id": "cond_hosp_e_004",
                "text": "Do you use LPG (cooking gas or similar fuel) in your operations?",
                "activates_element": "HOSP-E-004",
                "order": 2
            },
            {
                "question_id": "cond_hosp_e_006",
                "text": "Do you segregate and recycle any of your waste (paper, plastic, etc.)?",
                "activates_element": "HOSP-E-006",
                "order": 3
            },
            {
                "question_id": "cond_hosp_e_007",
                "text": "Do you have petrol-fueled vehicles (company cars/fleet)?",
                "activates_element": "HOSP-E-007",
                "order": 4
            },
            {
                "question_id": "cond_hosp_e_008",
                "text": "Do your company vehicles use diesel fuel (e.g., trucks or generators on wheels)?",
                "activates_element": "HOSP-E-008",
                "order": 5
            },
            {
                "question_id": "cond_hosp_e_009",
                "text": "Does your company use diesel backup generators for power?",
                "activates_element": "HOSP-E-009",
                "order": 6
            },
            {
                "question_id": "cond_hosp_e_010",
                "text": "Do you have air conditioning or refrigeration units that require refrigerant (gas) top-ups or servicing?",
                "activates_element": "HOSP-E-010",
                "order": 7
            },
            {
                "question_id": "cond_hosp_e_017",
                "text": "Does your organization have significant value chain emissions that should be reported?",
                "activates_element": "HOSP-E-017",
                "order": 8
            },
            {
                "question_id": "cond_hosp_e_020",
                "text": "Does your company have suppliers or partners that significantly impact your environmental footprint?",
                "activates_element": "HOSP-E-020",
                "order": 9
            },
            {
                "question_id": "cond_hosp_s_005",
                "text": "Does your organization have diversity and inclusion policies or programs?",
                "activates_element": "HOSP-S-005",
                "order": 10
            },
            {
                "question_id": "cond_hosp_s_006",
                "text": "Does your organization conduct employee satisfaction or engagement surveys?",
                "activates_element": "HOSP-S-006",
                "order": 11
            },
            {
                "question_id": "cond_hosp_s_008",
                "text": "Does your organization offer learning and development programs for employees?",
                "activates_element": "HOSP-S-008",
                "order": 12
            },
            {
                "question_id": "cond_hosp_s_010",
                "text": "Does your organization have formal community engagement or support programs?",
                "activates_element": "HOSP-S-010",
                "order": 13
            },
            {
                "question_id": "cond_hosp_s_011",
                "text": "Does your organization make charitable donations or contributions to community causes?",
                "activates_element": "HOSP-S-011",
                "order": 14
            },
            {
                "question_id": "cond_hosp_s_012",
                "text": "Does your organization have customer satisfaction measurement systems?",
                "activates_element": "HOSP-S-012",
                "order": 15
            },
            {
                "question_id": "cond_hosp_s_013",
                "text": "Does your organization have a formal customer complaint handling process?",
                "activates_element": "HOSP-S-013",
                "order": 16
            },
            {
                "question_id": "cond_hosp_s_015",
                "text": "Does your organization conduct supplier assessments that include social criteria?",
                "activates_element": "HOSP-S-015",
                "order": 17
            },
            {
                "question_id": "cond_hosp_g_003",
                "text": "Does your board of directors include independent directors?",
                "activates_element": "HOSP-G-003",
                "order": 18
            },
            {
                "question_id": "cond_hosp_g_004",
                "text": "Does your organization have a formal risk management framework?",
                "activates_element": "HOSP-G-004",
                "order": 19
            },
            {
                "question_id": "cond_hosp_g_005",
                "text": "Does your organization conduct regular compliance audits?",
                "activates_element": "HOSP-G-005",
                "order": 20
            },
            {
                "question_id": "cond_hosp_g_006",
                "text": "Does your organization have a formal ethics and anti-corruption policy?",
                "activates_element": "HOSP-G-006",
                "order": 21
            },
            {
                "question_id": "cond_hosp_g_007",
                "text": "Does your organization have a whistleblowing mechanism or policy?",
                "activates_element": "HOSP-G-007",
                "order": 22
            }
        ]

        created_count = 0
        updated_count = 0

        for question_data in questions_data:
            try:
                # Check if the data element exists
                try:
                    element = DataElement.objects.get(element_id=question_data['activates_element'])
                except DataElement.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f'DataElement {question_data["activates_element"]} not found, skipping question {question_data["question_id"]}'
                        )
                    )
                    continue

                # Create or update profiling question
                question, created = ProfilingQuestion.objects.get_or_create(
                    question_id=question_data['question_id'],
                    defaults={
                        'text': question_data['text'],
                        'activates_element': element,
                        'order': question_data['order']
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(f'Created question: {question.question_id}')
                else:
                    # Update existing question
                    question.text = question_data['text']
                    question.activates_element = element
                    question.order = question_data['order']
                    question.save()
                    updated_count += 1
                    self.stdout.write(f'Updated question: {question.question_id}')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing question {question_data["question_id"]}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed profiling questions: {created_count} created, {updated_count} updated'
            )
        )