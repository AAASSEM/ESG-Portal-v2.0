import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import DataElement, ProfilingQuestion
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Import comprehensive ESG framework from Excel file (80 elements)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--excel-file',
            type=str,
            default='24sep-hospitality-ESG-DST-GK.xlsx',
            help='Path to Excel file with ESG framework data'
        )
        parser.add_argument(
            '--preserve-legacy',
            action='store_true',
            help='Keep legacy data elements for backward compatibility'
        )

    def handle(self, *args, **options):
        excel_file = options['excel_file']
        preserve_legacy = options['preserve_legacy']

        self.stdout.write(f'Importing comprehensive ESG framework from {excel_file}...')

        try:
            # Read Excel file
            df = pd.read_excel(excel_file)
            self.stdout.write(f'Loaded {len(df)} rows from Excel')

            with transaction.atomic():
                # Step 1: Backup existing elements if preserving legacy
                if preserve_legacy:
                    self.backup_legacy_elements()
                else:
                    self.clear_existing_elements()

                # Step 2: Import new 80 elements
                self.import_data_elements(df)

                # Step 3: Generate dynamic profiling questions
                self.generate_profiling_questions(df)

            self.stdout.write(self.style.SUCCESS('Successfully imported comprehensive ESG framework'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing framework: {str(e)}'))
            raise

    def backup_legacy_elements(self):
        """Backup existing elements by marking them as legacy"""
        self.stdout.write('Backing up legacy elements...')

        legacy_count = 0
        for element in DataElement.objects.filter(legacy_element_id__isnull=True):
            element.legacy_element_id = element.element_id
            element.element_id = f'LEGACY_{element.element_id}'
            element.save()
            legacy_count += 1

        self.stdout.write(f'Backed up {legacy_count} legacy elements')

    def clear_existing_elements(self):
        """Clear existing data elements and profiling questions"""
        self.stdout.write('Clearing existing elements...')

        # Delete profiling questions first (they reference elements)
        deleted_questions = ProfilingQuestion.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_questions} profiling questions')

        # Delete data elements
        deleted_elements = DataElement.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_elements} data elements')

    def import_data_elements(self, df):
        """Import 80 data elements from Excel"""
        self.stdout.write('Importing data elements...')

        created_count = 0

        for _, row in df.iterrows():
            try:
                # Map Excel columns to model fields
                element_data = {
                    'element_id': row['master_id'],  # Use master_id as primary key
                    'master_id': row['master_id'],
                    'name': row['Data Element Name'],
                    'description': row.get('prompt', ''),
                    'detailed_prompt': row.get('prompt', ''),

                    # ESG categorization
                    'esg_category': row['E/S/G'],
                    'requirement_type': row['must-have/conditional'],

                    # Framework and collection details
                    'frameworks': row.get('Frameworks (E/D/G)', ''),
                    'unit': row.get('unit', ''),
                    'cadence': self.normalize_cadence(row.get('cadence', '')),

                    # Metering and collection
                    'is_metered': row.get('Metered (M/NM)', '') == 'M',
                    'is_derived': row.get('Collection (C/D)', '') == 'D',
                    'ghg_scope': str(row.get('scopes', '')) if pd.notna(row.get('scopes')) else '',

                    # Conditional logic
                    'condition_logic': row.get('condition_logic', '') if pd.notna(row.get('condition_logic')) else '',
                    'wizard_question': row.get('wizard_question', '') if pd.notna(row.get('wizard_question')) else '',

                    # Legacy compatibility fields
                    'category': self.map_esg_to_legacy_category(row['E/S/G']),
                    'type': 'must_have' if row['must-have/conditional'] == 'must-have' else 'conditional',
                }

                # Create the data element
                element = DataElement.objects.create(**element_data)
                created_count += 1

                self.stdout.write(f'Created: {element.master_id} - {element.name}')

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error creating element {row.get("master_id", "UNKNOWN")}: {str(e)}'))
                continue

        self.stdout.write(f'Created {created_count} data elements')

    def generate_profiling_questions(self, df):
        """Generate dynamic profiling questions from conditional elements"""
        self.stdout.write('Generating profiling questions...')

        # Get conditional elements with wizard questions
        conditional_df = df[
            (df['must-have/conditional'] == 'conditional') &
            (df['wizard_question'].notna()) &
            (df['wizard_question'] != '')
        ]

        created_count = 0
        order = 1

        for _, row in conditional_df.iterrows():
            try:
                # Create profiling question
                question_data = {
                    'question_id': f'cond_{row["master_id"].lower().replace("-", "_")}',
                    'text': row['wizard_question'],
                    'activates_element_id': row['master_id'],
                    'order': order
                }

                question = ProfilingQuestion.objects.create(**question_data)
                created_count += 1
                order += 1

                self.stdout.write(f'Created question: {question.question_id}')

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error creating question for {row.get("master_id", "UNKNOWN")}: {str(e)}'))
                continue

        self.stdout.write(f'Created {created_count} profiling questions')

    def normalize_cadence(self, cadence_str):
        """Normalize cadence values from Excel"""
        if pd.isna(cadence_str):
            return 'annual'

        cadence_lower = str(cadence_str).lower().strip()

        # Map Excel values to standardized values
        cadence_mapping = {
            'monthly': 'monthly',
            'annual': 'annual',
            'annually': 'annual',
            'daily': 'daily',
            'on installation': 'on_installation',
            'on purchase': 'on_purchase',
            'on change': 'on_change',
            'on_change': 'on_change',
            'on implementation': 'on_implementation',
            'on menu change': 'on_menu_change',
        }

        return cadence_mapping.get(cadence_lower, 'annual')

    def map_esg_to_legacy_category(self, esg_category):
        """Map ESG category to legacy category format"""
        mapping = {
            'E': 'Environmental',
            'S': 'Social',
            'G': 'Governance'
        }
        return mapping.get(esg_category, 'Environmental')