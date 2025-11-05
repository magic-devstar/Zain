from django.apps import AppConfig
from django.db.utils import OperationalError, ProgrammingError


class CommonappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'commonapp'

    def ready(self):
        import commonapp.signals  
        from .models import InventoryCategory

        # Avoid issues during migrations or if DB isn't ready
        try:
            default_categories = ["Atm Machine", "Kiosk", "Server"]
            for category_name in default_categories:
                InventoryCategory.objects.get_or_create(name=category_name)
        except (OperationalError, ProgrammingError):
            # Database tables might not be ready yet
            pass
        
        # Configure email settings from database
        try:
            from .email_settings import configure_email_settings
            configure_email_settings()
        except (OperationalError, ProgrammingError):
            # Database tables might not be ready yet
            pass