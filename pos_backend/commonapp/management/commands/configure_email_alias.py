"""
Management command to configure email settings with alias support.
This helps set up Google Workspace or other email providers where the login email
is different from the from_email (for aliases).
"""

from django.core.management.base import BaseCommand, CommandError
from commonapp.models import PlatformConfig
from commonapp.email_settings import reload_email_settings


class Command(BaseCommand):
    help = 'Configure email settings with alias support for Google Workspace and other providers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--host',
            type=str,
            help='SMTP server hostname (e.g., smtp.gmail.com)',
        )
        parser.add_argument(
            '--port',
            type=int,
            default=587,
            help='SMTP server port (default: 587)',
        )
        parser.add_argument(
            '--login-email',
            type=str,
            help='Email address for SMTP login (e.g., user@ttincnc.com)',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='SMTP password or app password',
        )
        parser.add_argument(
            '--from-email',
            type=str,
            help='Email address to use as sender (can be alias, e.g., contact@ttincnc.com)',
        )
        parser.add_argument(
            '--list-presets',
            action='store_true',
            help='List available email provider presets',
        )
        parser.add_argument(
            '--preset',
            type=str,
            choices=['gmail', 'outlook', 'yahoo', 'ovh', 'godaddy', 'zoho', 'sendgrid', 'mailgun'],
            help='Use preset configuration for popular email providers',
        )
        parser.add_argument(
            '--test-email',
            type=str,
            help='Send a test email to the specified address after configuration',
        )

    def handle(self, *args, **options):
        if options['list_presets']:
            self.list_presets()
            return

        if options['preset']:
            self.configure_preset(options['preset'], options)
        else:
            self.configure_manual(options)

        # Reload email settings to apply changes
        reload_email_settings()

        # Send test email if requested
        if options['test_email']:
            self.send_test_email(options['test_email'])

    def list_presets(self):
        """List available email provider presets."""
        from commonapp.email_settings import get_email_provider_presets
        
        presets = get_email_provider_presets()
        
        self.stdout.write(self.style.SUCCESS('Available email provider presets:'))
        self.stdout.write('')
        
        for name, config in presets.items():
            self.stdout.write(f"  {name}:")
            self.stdout.write(f"    Host: {config['email_host']}")
            self.stdout.write(f"    Port: {config['email_port']}")
            self.stdout.write(f"    TLS: {config['email_use_tls']}")
            self.stdout.write(f"    Description: {config['description']}")
            self.stdout.write('')
        
        self.stdout.write(self.style.WARNING('Usage examples:'))
        self.stdout.write('  # Configure Gmail with alias:')
        self.stdout.write('  python manage.py configure_email_alias --preset gmail \\')
        self.stdout.write('    --login-email user@ttincnc.com --password "app-password" \\')
        self.stdout.write('    --from-email contact@ttincnc.com')
        self.stdout.write('')

    def configure_preset(self, preset_name, options):
        """Configure email using a preset."""
        from commonapp.email_settings import get_email_provider_presets
        
        presets = get_email_provider_presets()
        preset = presets[preset_name]
        
        config = PlatformConfig.get_active()
        config.email_host = preset['email_host']
        config.email_port = preset['email_port']
        
        if options['login_email']:
            config.email_host_user = options['login_email']
        
        if options['password']:
            config.email_host_password = options['password']
        
        if options['from_email']:
            config.default_from_email = options['from_email']
        
        config.save()
        
        self.stdout.write(
            self.style.SUCCESS(f'Email configuration updated using {preset_name} preset:')
        )
        self.print_current_config(config)

    def configure_manual(self, options):
        """Configure email manually."""
        config = PlatformConfig.get_active()
        
        if options['host']:
            config.email_host = options['host']
        
        if options['port']:
            config.email_port = options['port']
        
        if options['login_email']:
            config.email_host_user = options['login_email']
        
        if options['password']:
            config.email_host_password = options['password']
        
        if options['from_email']:
            config.default_from_email = options['from_email']
        
        config.save()
        
        self.stdout.write(
            self.style.SUCCESS('Email configuration updated:')
        )
        self.print_current_config(config)

    def print_current_config(self, config):
        """Print current email configuration."""
        self.stdout.write('')
        self.stdout.write(f"  SMTP Host: {config.email_host}")
        self.stdout.write(f"  SMTP Port: {config.email_port}")
        self.stdout.write(f"  Login Email: {config.email_host_user}")
        self.stdout.write(f"  From Email: {config.default_from_email or config.email_host_user}")
        self.stdout.write(f"  Password: {'*' * len(config.email_host_password) if config.email_host_password else 'Not set'}")
        self.stdout.write('')
        
        if config.email_host_user and config.default_from_email and config.email_host_user != config.default_from_email:
            self.stdout.write(self.style.WARNING('📧 Alias configuration detected:'))
            self.stdout.write(f"   • Login with: {config.email_host_user}")
            self.stdout.write(f"   • Send as: {config.default_from_email}")
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('Make sure the alias is configured in your email provider:'))
            self.stdout.write('   • For Gmail: Settings → Accounts and Import → Send mail as')
            self.stdout.write('   • Add and verify the alias email address')
            self.stdout.write('')

    def send_test_email(self, test_email):
        """Send a test email."""
        try:
            from commonapp.email_service import send_notification_email
            
            subject = "Test Email - Configuration Successful"
            message = """
This is a test email to verify your email configuration is working correctly.

Your email settings have been configured successfully with the following:
- SMTP authentication is working
- Email delivery is functional
- Alias configuration (if applicable) is properly set up

If you received this email, your configuration is working properly!
            """.strip()
            
            success = send_notification_email(
                user_email=test_email,
                subject=subject,
                message=message
            )
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Test email sent successfully to {test_email}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to send test email to {test_email}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error sending test email: {e}')
            )
