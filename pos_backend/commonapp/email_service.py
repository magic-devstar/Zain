"""
Centralized email service that always reads fresh settings from the database.
This ensures all emails use the latest configuration without needing to restart services.
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from .models import PlatformConfig
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def get_email_config():
    """
    Get fresh email configuration from database.
    Returns a dictionary with all email settings.
    """
    try:
        config = PlatformConfig.get_active()
        return {
            'host': config.email_host,
            'port': config.email_port,
            'username': config.email_host_user,  # Login credentials
            'password': config.email_host_password,
            'from_email': config.default_from_email or config.email_host_user,  # From email (can be alias)
            'use_tls': True if config.email_port in [465, 587] else False
        }
    except Exception as e:
        logger.warning(f"Failed to get email config from database: {e}")
        # Fallback to Django settings
        return {
            'host': getattr(settings, 'EMAIL_HOST', 'localhost'),
            'port': getattr(settings, 'EMAIL_PORT', 587),
            'username': getattr(settings, 'EMAIL_HOST_USER', ''),
            'password': getattr(settings, 'EMAIL_HOST_PASSWORD', ''),
            'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', '') or getattr(settings, 'EMAIL_HOST_USER', ''),
            'use_tls': getattr(settings, 'EMAIL_USE_TLS', True)
        }


def send_email_direct_smtp(subject, message, recipient_list, from_email=None, 
                          html_message=None, fail_silently=False):
    """
    Send email directly via SMTP, bypassing Django's email backend completely.
    This ensures fresh settings are used every time.
    """
    try:
        config = get_email_config()
        
        # Use database config if available, otherwise use provided from_email
        if not from_email:
            from_email = config['from_email']
        
        logger.info(f"📧 Sending email directly via SMTP: Login={config['username']}, From={from_email} via {config['host']}:{config['port']}")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = ', '.join(recipient_list)
        
        # Add text and HTML parts
        text_part = MIMEText(message, 'plain')
        msg.attach(text_part)
        
        if html_message:
            html_part = MIMEText(html_message, 'html')
            msg.attach(html_part)
        
        # Connect to SMTP server
        if config['use_tls']:
            server = smtplib.SMTP(config['host'], config['port'])
            server.starttls()
        else:
            server = smtplib.SMTP(config['host'], config['port'])
        
        # Login
        server.login(config['username'], config['password'])
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        logger.info(f"✅ Email sent successfully to {len(recipient_list)} recipients")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send email via direct SMTP: {e}")
        if not fail_silently:
            raise
        return False


def send_email_with_db_config(subject, message, recipient_list, from_email=None, 
                            html_message=None, fail_silently=False, **kwargs):
    """
    Send email using fresh database configuration.
    This is a wrapper around Django's send_mail that ensures fresh settings.
    """
    try:
        config = get_email_config()
        
        # Use database config if available, otherwise use provided from_email
        if not from_email:
            from_email = config['from_email']
        
        logger.info(f"📧 Sending email using DB config: Login={config['username']}, From={from_email} via {config['host']}")
        
        # Force Django to use fresh settings by temporarily overriding them
        old_host = getattr(settings, 'EMAIL_HOST', None)
        old_port = getattr(settings, 'EMAIL_PORT', None)
        old_user = getattr(settings, 'EMAIL_HOST_USER', None)
        old_password = getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        
        try:
            # Temporarily override Django settings
            setattr(settings, 'EMAIL_HOST', config['host'])
            setattr(settings, 'EMAIL_PORT', config['port'])
            setattr(settings, 'EMAIL_HOST_USER', config['username'])
            setattr(settings, 'EMAIL_HOST_PASSWORD', config['password'])
            setattr(settings, 'EMAIL_USE_TLS', config['use_tls'])
            
            # Send email
            result = send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=fail_silently,
                **kwargs
            )
            
            return result
            
        finally:
            # Restore original settings
            if old_host is not None:
                setattr(settings, 'EMAIL_HOST', old_host)
            if old_port is not None:
                setattr(settings, 'EMAIL_PORT', old_port)
            if old_user is not None:
                setattr(settings, 'EMAIL_HOST_USER', old_user)
            if old_password is not None:
                setattr(settings, 'EMAIL_HOST_PASSWORD', old_password)
        
    except Exception as e:
        logger.error(f"Failed to send email with DB config: {e}")
        if not fail_silently:
            raise


def create_email_message(subject, body, from_email=None, to=None, html_body=None):
    """
    Create EmailMultiAlternatives message with fresh database configuration.
    """
    try:
        config = get_email_config()
        
        # Use database config if available, otherwise use provided from_email
        if not from_email:
            from_email = config['from_email']
        
        logger.info(f"📧 Creating email message using DB config: Login={config['username']}, From={from_email} via {config['host']}")
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=from_email,
            to=to or []
        )
        
        if html_body:
            email.attach_alternative(html_body, "text/html")
        
        return email
        
    except Exception as e:
        logger.error(f"Failed to create email message with DB config: {e}")
        raise


def send_email_message(email_message, fail_silently=False):
    """
    Send an EmailMultiAlternatives message with fresh database configuration.
    """
    try:
        config = get_email_config()
        logger.info(f"📧 Sending email message using DB config: Login={config['username']} via {config['host']}")
        
        # Use direct SMTP to bypass Django's backend caching
        return send_email_direct_smtp(
            subject=email_message.subject,
            message=email_message.body,
            recipient_list=email_message.to,
            from_email=email_message.from_email,
            html_message=email_message.alternatives[0][0] if email_message.alternatives else None,
            fail_silently=fail_silently
        )
        
    except Exception as e:
        logger.error(f"Failed to send email message with DB config: {e}")
        if not fail_silently:
            raise


# Convenience functions for common email types
def send_notification_email(user_email, subject, message, html_message=None):
    """Send notification email with fresh config."""
    return send_email_direct_smtp(
        subject=subject,
        message=message,
        recipient_list=[user_email],
        html_message=html_message
    )


def send_password_reset_email(user_email, subject, message, html_message=None):
    """Send password reset email with fresh config."""
    return send_email_direct_smtp(
        subject=subject,
        message=message,
        recipient_list=[user_email],
        html_message=html_message
    )


def send_ticket_email(recipient_email, subject, message, html_message=None):
    """Send ticket-related email with fresh config."""
    return send_email_direct_smtp(
        subject=subject,
        message=message,
        recipient_list=[recipient_email],
        html_message=html_message
    )
