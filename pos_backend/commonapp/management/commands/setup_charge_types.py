from django.core.management.base import BaseCommand
from commonapp.models import InvoiceChargeType
from decimal import Decimal


class Command(BaseCommand):
    help = 'Set up default invoice charge types'

    def handle(self, *args, **options):
        charge_types = [
            {
                'name': 'Service Charge',
                'charge_type': 'FIXED',
                'value': Decimal('10.00'),
                'is_compulsory': True,
                'description': 'Standard service charge applied to all invoices'
            },
            {
                'name': 'Tax',
                'charge_type': 'PERCENTAGE',
                'value': Decimal('8.5'),
                'is_compulsory': True,
                'description': 'Sales tax applied to all invoices'
            },
            {
                'name': 'Delivery Fee',
                'charge_type': 'FIXED',
                'value': Decimal('25.00'),
                'is_compulsory': False,
                'description': 'Optional delivery fee for remote locations'
            },
            {
                'name': 'Rush Processing',
                'charge_type': 'PERCENTAGE',
                'value': Decimal('15.0'),
                'is_compulsory': False,
                'description': 'Additional charge for rush processing'
            }
        ]

        for charge_data in charge_types:
            charge_type, created = InvoiceChargeType.objects.get_or_create(
                name=charge_data['name'],
                defaults=charge_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created charge type: {charge_type.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Charge type already exists: {charge_type.name}')
                )

        self.stdout.write(
            self.style.SUCCESS('Successfully set up invoice charge types')
        ) 