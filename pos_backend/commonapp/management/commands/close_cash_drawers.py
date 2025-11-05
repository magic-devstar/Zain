from django.core.management.base import BaseCommand
from django.utils import timezone
from commonapp.models import CashDrawer
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Close all open cash drawers at midnight'

    def handle(self, *args, **options):
        try:
            # Get all open cash drawers
            open_drawers = CashDrawer.objects.filter(status="open")
            
            if not open_drawers.exists():
                self.stdout.write(
                    self.style.SUCCESS('No open cash drawers found.')
                )
                return
            
            closed_count = 0
            for drawer in open_drawers:
                try:
                    if drawer.close_drawer():
                        closed_count += 1
                        self.stdout.write(
                            f'Closed cash drawer {drawer.id} for user {drawer.user.username}'
                        )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error closing cash drawer {drawer.id}: {str(e)}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully closed {closed_count} cash drawer(s).')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error in close_cash_drawers command: {str(e)}')
            ) 