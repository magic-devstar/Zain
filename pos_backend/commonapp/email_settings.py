"""
Dynamic email settings loader for Django.

This module provides functions to load email configuration from the database
with fallbacks to environment variables or default settings.
"""

import os
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

try:
    from .models import PlatformConfig
except ImportError:
    # During migrations, models might not be available
    PlatformConfig = None


def get_email_settings():
    """
    Get email settings from database with fallbacks.
    
    Returns a dictionary of email settings that can be used to configure
    Django's email backend.
    
    Fallback priority:
    1. Database configuration (PlatformConfig)
    2. Environment variables
    3. Default values
    """
    
    # Default email settings
    default_settings = {
        'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'EMAIL_HOST': 'localhost',
        'EMAIL_PORT': 587,
        'EMAIL_USE_TLS': True,
        'EMAIL_HOST_USER': '',
        'EMAIL_HOST_PASSWORD': '',
        'DEFAULT_FROM_EMAIL': '',
    }
    
    # Try to get settings from database
    if PlatformConfig is not None:
        try:
            db_settings = PlatformConfig.get_email_settings()
            # Update defaults with database values
            for key, value in db_settings.items():
                if value:  # Only override if value is not empty
                    default_settings[key] = value
        except Exception as e:
            # Log error but continue with fallbacks
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to load email settings from database: {e}")
    
    # Override with environment variables if they exist
    env_mapping = {
        'EMAIL_HOST': 'EMAIL_HOST',
        'EMAIL_PORT': 'EMAIL_PORT',
        'EMAIL_HOST_USER': 'EMAIL_HOST_USER',
        'EMAIL_HOST_PASSWORD': 'EMAIL_HOST_PASSWORD',
        'DEFAULT_FROM_EMAIL': 'DEFAULT_FROM_EMAIL',
    }
    
    for setting_key, env_key in env_mapping.items():
        env_value = os.environ.get(env_key)
        if env_value:
            if setting_key == 'EMAIL_PORT':
                try:
                    default_settings[setting_key] = int(env_value)
                except ValueError:
                    pass  # Keep default if invalid port
            else:
                default_settings[setting_key] = env_value
    
    # Ensure EMAIL_USE_TLS is set based on port
    if default_settings['EMAIL_PORT'] in [465, 587]:
        default_settings['EMAIL_USE_TLS'] = True
    elif default_settings['EMAIL_PORT'] == 25:
        default_settings['EMAIL_USE_TLS'] = False
    
    return default_settings


def reload_email_settings():
    """
    Reload email settings from database and update Django settings.
    
    This function can be called after updating email configuration
    to apply changes without restarting the server.
    """
    print("🔄 Starting email settings reload...")
    try:
        email_config = get_email_settings()
        print(f"📧 Got email config from DB: {email_config}")
        
        # Update Django settings
        for key, value in email_config.items():
            old_value = getattr(settings, key, 'NOT_SET')
            setattr(settings, key, value)
            if key == 'EMAIL_HOST_USER':
                print(f"🔄 Updated {key} (login): {old_value} → {value}")
            elif key == 'DEFAULT_FROM_EMAIL':
                print(f"🔄 Updated {key} (from): {old_value} → {value}")
            else:
                print(f"🔄 Updated {key}: {old_value} → {value}")
        
        # Also update the EMAIL_USE_TLS based on port
        if email_config['EMAIL_PORT'] in [465, 587]:
            old_tls = getattr(settings, 'EMAIL_USE_TLS', 'NOT_SET')
            setattr(settings, 'EMAIL_USE_TLS', True)
            print(f"🔄 Updated EMAIL_USE_TLS: {old_tls} → True")
        elif email_config['EMAIL_PORT'] == 25:
            old_tls = getattr(settings, 'EMAIL_USE_TLS', 'NOT_SET')
            setattr(settings, 'EMAIL_USE_TLS', False)
            print(f"🔄 Updated EMAIL_USE_TLS: {old_tls} → False")
        
        print("✅ Email settings reload completed successfully!")
        return email_config
    except Exception as e:
        print(f"❌ Error in reload_email_settings: {e}")
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to reload email settings: {e}")
        return None


def configure_email_settings():
    """
    Configure Django's email settings dynamically.
    
    This function should be called in your Django app's ready() method
    or in a management command to update the global email settings.
    """
    return reload_email_settings()


def get_email_provider_presets():
    """
    Get common email provider configurations for easy setup.
    
    Returns a dictionary of preset configurations for popular email providers.
    """
    return {
        'gmail': {
            'email_host': 'smtp.gmail.com',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'Gmail SMTP with App Password'
        },
        'outlook': {
            'email_host': 'smtp-mail.outlook.com',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'Outlook/Hotmail SMTP'
        },
        'yahoo': {
            'email_host': 'smtp.mail.yahoo.com',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'Yahoo Mail SMTP'
        },
        'ovh': {
            'email_host': 'smtp.ovh.com',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'OVH Email SMTP'
        },
        'godaddy': {
            'email_host': 'smtpout.secureserver.net',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'GoDaddy Email SMTP'
        },
        'zoho': {
            'email_host': 'smtp.zoho.com',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'Zoho Mail SMTP'
        },
        'sendgrid': {
            'email_host': 'smtp.sendgrid.net',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'SendGrid SMTP'
        },
        'mailgun': {
            'email_host': 'smtp.mailgun.org',
            'email_port': 587,
            'email_use_tls': True,
            'description': 'Mailgun SMTP'
        }
    }
