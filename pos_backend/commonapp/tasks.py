from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives
from .models import *
from custom_user.models import Account
from .email_service import send_email_with_db_config, create_email_message, send_email_message
import base64
import logging
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from twilio.rest import Client
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(queue='priority')
def send_invoice_email(invoice_id):
    """
    Send invoice email to store owner and customer
    Avoids sending duplicate emails if both emails are the same
    """
    try:
        invoice = Invoice.objects.select_related('store', 'store__customer').get(pk=invoice_id)
        
        # Get recipient emails
        recipient_emails = set()  # Use set to avoid duplicates
        
        # Add store owner email if available
        if invoice.store and invoice.store.owner_email:
            recipient_emails.add(invoice.store.owner_email)
        
        # Add customer email if available
        if invoice.store and invoice.store.customer and invoice.store.customer.email:
            recipient_emails.add(invoice.store.customer.email)
        
        # If no emails found, log and return
        if not recipient_emails:
            logger.warning(f"No recipient emails found for invoice {invoice_id}")
            return
        
        # Prepare email content
        subject = f"Invoice #{invoice.invoice_number} - {invoice.store.store_name if invoice.store else 'Store'}"
        
        # Create context for email template
        context = {
            'invoice': invoice,
            'store': invoice.store,
            'customer': invoice.store.customer if invoice.store else None,
            'items': invoice.items.all(),
            'charges': invoice.charges.all(),
            'total_amount': invoice.total_amount,
            'due_date': invoice.due_date,
            'issue_date': invoice.issue_date,
        }
        
        # Render HTML email (you can create a template later)
        html_message = render_to_string('emails/invoice_notification.html', context)
        plain_message = strip_tags(html_message)
        
        # Get fresh email settings from database
        try:
            config = PlatformConfig.get_active()
            from_email = config.default_from_email or config.email_host_user or settings.DEFAULT_FROM_EMAIL
        except Exception:
            from_email = settings.DEFAULT_FROM_EMAIL

        # Send email to all recipients
        for email_address in recipient_emails:
            try:
                email = create_email_message(
                    subject=subject,
                    body=plain_message,
                    to=[email_address],
                    html_body=html_message
                )
                send_email_message(email)
                logger.info(f"Invoice email sent to {email_address} for invoice {invoice.invoice_number}")
            except Exception as e:
                logger.error(f"Failed to send invoice email to {email_address}: {e}")
        
        logger.info(f"Invoice email sent for invoice {invoice.invoice_number} to {len(recipient_emails)} recipients")
        
    except Invoice.DoesNotExist:
        logger.error(f"Invoice {invoice_id} not found")
    except Exception as e:
        logger.error(f"Error sending invoice email for invoice {invoice_id}: {e}")


@shared_task(queue='priority')
def send_email_notification(user_id, formatted_title, message):
    print("inn emaik")
    user = Account.objects.get(id=user_id)
    
    # Use centralized email service
    send_email_with_db_config(
        subject=formatted_title,
        message=message,
        recipient_list=[user.email]
    )


@shared_task(queue='priority')
def send_whatsapp_notification(user_id, formatted_title, message):
    print("innwwdsasdasd")
    user = Account.objects.get(id=user_id)
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        whatsapp_message = f"{formatted_title}\n{message}"
        client.messages.create(
            from_='whatsapp:+14155238886',
            body=whatsapp_message,
            to=f"whatsapp:{user.phone_number}",
        )
    except Exception as e:
        print(f"WhatsApp notification failed: {e}")  # Logs error but continues
        
    

@shared_task(queue='priority')
def send_ticket_review_email(ticket_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        user = ticket.created_by

        # Encode the ticket ID
        ticket_id_bytes = str(ticket.pk).encode('utf-8')
        encoded_ticket_id = base64.urlsafe_b64encode(ticket_id_bytes).decode('utf-8')

        # Construct frontend URL
        frontend_url = f"{settings.FRONTEND_BASE_URL}/review/{encoded_ticket_id}"

        # Render HTML email


        # Determine primary recipient: store's billing email preferred over ticket creator
        primary_email = None
        try:
            if ticket.store and ticket.store.store_billing_email:
                primary_email = ticket.store.store_billing_email
        except Exception:
            primary_email = None
        if not primary_email:
            primary_email = user.email
            
        # Include store manager information in template context
        try:
            store_manager = None
            if ticket.store:
                store_manager = {
                    'name': ticket.store.store_name,
                    'email': ticket.store.store_billing_email,
                    'phone': ticket.store.store_phone
                }
        except Exception:
            store_manager = None

        context = {'user': store_manager, 'ticket': ticket, 'frontend_url': frontend_url}
        html_message = render_to_string('emails/ticket_review.html', context)
        plain_message = strip_tags(html_message)

        # Get fresh email settings from database
        try:
            config = PlatformConfig.get_active()
            from_email = config.default_from_email or config.email_host_user or settings.DEFAULT_FROM_EMAIL
            print(f"📧 [Celery] Ticket review using email from database: Login={config.email_host_user}, From={from_email}")
            print(f"📧 [Celery] SMTP Host: {config.email_host}")
        except Exception as e:
            from_email = settings.DEFAULT_FROM_EMAIL
            print(f"📧 [Celery] Ticket review using fallback email: {from_email}")
            print(f"📧 [Celery] Error getting DB config: {e}")

        # Send email to primary recipient
        email = create_email_message(
            subject="Action Required: Ticket Approval",
            body=plain_message,
            to=[primary_email],
            html_body=html_message
        )
        send_email_message(email)

        # Send to tracking emails from DB (fallback to settings.TRACKING_EMAIL)
        try:
            config = PlatformConfig.get_active()
            tracking_emails = list(config.tracking_emails or [])
        except Exception:
            tracking_emails = []
        if not tracking_emails and getattr(settings, 'TRACKING_EMAIL', None):
            tracking_emails = [settings.TRACKING_EMAIL]
        for tracking_email in tracking_emails:
            try:
                tracking_email_msg = create_email_message(
                    subject="Customer Ticket Pending Approval",
                    body=f"Ticket #{ticket.pk} by '{user.username}' is now pending approval. Please review it.",
                    to=[tracking_email]
                )
                send_email_message(tracking_email_msg)
            except Exception as e:
                logger.error(f"Failed to send tracking email to {tracking_email}: {e}")
        
    except Exception as e:
        print(f"[Celery Task Error] send_ticket_review_email: {e}")


@shared_task(queue='priority')
def send_vehicle_maintenance_notification(maintenance_id, recipient_email=None):
    """
    Send email notification when a vehicle maintenance record is created
    """
    try:
        maintenance = VehicleMaintenance.objects.select_related('vehicle').get(pk=maintenance_id)
        

        # Get list of maintenance notification emails from DB-config with fallback
        try:
            config = PlatformConfig.get_active()
            db_emails = list(config.maintenance_emails or [])
        except Exception:
            db_emails = []
        maintenance_emails = db_emails if db_emails else [e.strip() for e in getattr(settings, 'MAINTENANCE_EMAILS', []) if isinstance(e, str) and e.strip()]
        recipient_name = "Vehicle Management Team"
        
        # Render HTML email
        context = {
            'maintenance': maintenance,
            'recipient_name': recipient_name,
            'generated_date': timezone.now().strftime("%F %T")
        }
        html_message = render_to_string('emails/vehicle_maintenance_notification.html', context)
        plain_message = strip_tags(html_message)

        # Get fresh email settings from database
        try:
            config = PlatformConfig.get_active()
            from_email = config.default_from_email or config.email_host_user or settings.DEFAULT_FROM_EMAIL
        except Exception:
            from_email = settings.DEFAULT_FROM_EMAIL

        # Send email to each recipient
        for email_address in maintenance_emails:
            email_address = email_address.strip()  # Remove any whitespace
            if email_address:  # Only send if email is not empty
                try:
                    email = create_email_message(
                        subject=f"Vehicle Maintenance Record Created - {maintenance.vehicle.name}",
                        body=plain_message,
                        to=[email_address],
                        html_body=html_message
                    )
                    send_email_message(email)
                    logger.info(f"Vehicle maintenance notification sent to {email_address}")
                except Exception as e:
                    logger.error(f"Failed to send email to {email_address}: {e}")
        
        logger.info(f"Vehicle maintenance notification sent for maintenance ID {maintenance_id} to {len(maintenance_emails)} recipients")
        
    except VehicleMaintenance.DoesNotExist:
        logger.error(f"Vehicle maintenance record with ID {maintenance_id} not found")
    except Exception as e:
        logger.error(f"[Celery Task Error] send_vehicle_maintenance_notification: {e}")
        print(f"[Celery Task Error] send_vehicle_maintenance_notification: {e}")


@shared_task(queue='default')
def close_expired_cash_drawers():
    """
    Close cash drawers that were opened on a previous date.
    Runs every 4 hours to check for drawers that should be closed when a new date starts.
    """
    try:
        # Get current date in the server's timezone
        current_date = timezone.now().date()
        logger.info(f"Running close_expired_cash_drawers task at {timezone.now()}")

        # Find a system user for closing drawers (fallback to first superuser or drawer's user)
        try:
            system_user = Account.objects.filter(is_superuser=True).first()
            if not system_user:
                logger.warning("No superuser found for closing drawers. Using drawer user as fallback.")
        except Exception as e:
            logger.error(f"Error fetching system user: {str(e)}")
            system_user = None

        # Query open cash drawers
        open_drawers = CashDrawer.objects.filter(status="open")
        closed_count = 0

        for drawer in open_drawers:
            # Check if the drawer's opened_at date is before the current date
            drawer_date = drawer.opened_at.date()
            if drawer_date < current_date:
                try:
                    with transaction.atomic():
                        # Close the drawer, using system_user or drawer's user
                        success = drawer.close_drawer(closed_by_user=system_user or drawer.user)
                        if success:
                            logger.info(
                                f"Closed cash drawer #{drawer.id} for user {drawer.user.username}, "
                                f"opened on {drawer_date}"
                            )
                            closed_count += 1
                        else:
                            logger.warning(
                                f"Failed to close cash drawer #{drawer.id} (already closed or error)"
                            )
                except Exception as e:
                    logger.error(
                        f"Error closing cash drawer #{drawer.id} for user {drawer.user.username}: {str(e)}"
                    )
            else:
                logger.debug(
                    f"Cash drawer #{drawer.id} opened on {drawer_date} is not yet expired"
                )

        logger.info(f"Task completed. Closed {closed_count} cash drawer(s).")
        return f"Closed {closed_count} cash drawer(s)."

    except Exception as e:
        logger.error(f"Unexpected error in close_expired_cash_drawers task: {str(e)}")
        raise