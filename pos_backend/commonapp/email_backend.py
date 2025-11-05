"""
Custom email backend that always reads settings from the database.
This ensures email settings are always up-to-date without needing to reload Django settings.
"""

from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.conf import settings
from .models import PlatformConfig


class DatabaseSMTPBackend(SMTPBackend):
    """
    SMTP email backend that reads configuration from the database.
    This ensures email settings are always current without server restart.
    """
    
    def __init__(self, *args, **kwargs):
        # Get fresh settings from database
        try:
            config = PlatformConfig.get_active()
            
            # Override any provided kwargs with database values
            if config.email_host:
                kwargs['host'] = config.email_host
            if config.email_port:
                kwargs['port'] = config.email_port
            if config.email_host_user:
                kwargs['username'] = config.email_host_user
            if config.email_host_password:
                kwargs['password'] = config.email_host_password
            # Set from_email to default_from_email (can be alias) or fallback to email_host_user
            if config.default_from_email:
                kwargs['from_email'] = config.default_from_email
            elif config.email_host_user:
                kwargs['from_email'] = config.email_host_user
                
        except Exception as e:
            # Fall back to Django settings if database is not available
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to load email config from database: {e}")
        
        # Always use TLS for security
        kwargs['use_tls'] = True
        
        super().__init__(*args, **kwargs)
    
    def send_messages(self, email_messages):
        """
        Override send_messages to ensure fresh settings for each email.
        """
        # Reload settings from database before sending
        try:
            config = PlatformConfig.get_active()
            
            # Update connection settings
            if config.email_host:
                self.host = config.email_host
            if config.email_port:
                self.port = config.email_port
            if config.email_host_user:
                self.username = config.email_host_user
            if config.email_host_password:
                self.password = config.email_host_password
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to reload email config before sending: {e}")
        
        return super().send_messages(email_messages)
