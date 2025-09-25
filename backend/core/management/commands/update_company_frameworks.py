from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Company


class Command(BaseCommand):
    help = 'Update existing companies with active frameworks based on location and sector'

    def handle(self, *args, **options):
        self.stdout.write('Updating company frameworks...')

        with transaction.atomic():
            companies = Company.objects.all()

            for company in companies:
                # Update active frameworks based on company profile
                old_frameworks = company.active_frameworks.copy() if company.active_frameworks else []
                new_frameworks = company.update_active_frameworks()

                self.stdout.write(
                    f'Company: {company.name} ({company.emirate}, {company.sector})'
                )
                self.stdout.write(f'  Old frameworks: {old_frameworks}')
                self.stdout.write(f'  New frameworks: {new_frameworks}')
                self.stdout.write('')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {companies.count()} companies')
        )