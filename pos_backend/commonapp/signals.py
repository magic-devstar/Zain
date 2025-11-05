from django.db.models.signals import pre_delete, pre_save, post_save
from django.dispatch import receiver
from .models import *
from django.db.models.signals import post_delete
import os
import base64
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from custom_user.models import Account, UserPreference
from .tasks import *
from django.utils import timezone
from decimal import Decimal
import logging
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PlatformConfig

# Celery/Redis connection errors are now handled by catching Exception
# This prevents registration and other critical operations from failing when Redis is unavailable


logger = logging.getLogger(__name__)



# Delete Attachments of ticket
@receiver(pre_delete, sender=Ticket)
def delete_ticket_attachments(sender, instance, **kwargs):
    for attachment in instance.attachments.all():
        attachment.delete()


# Delete Attachment files
@receiver(post_delete, sender=Attachment)
def delete_attachment_file(sender, instance, **kwargs):
    if instance.file:
        if os.path.isfile(instance.file.path):
            os.remove(instance.file.path)


# Send Customer and Email to give review
@receiver(pre_save, sender=Ticket)
def notify_customer_on_pending_approval(sender, instance, **kwargs):
    if not instance.pk:
        return  # Skip for newly created tickets

    previous = Ticket.objects.get(pk=instance.pk)
    if previous.status != "PENDING APPROVAL" and instance.status == "PENDING APPROVAL":
        user = instance.created_by
        if hasattr(user, 'role'):
            try:
                send_ticket_review_email.delay(instance.pk)
            except Exception as e:
                # Gracefully handle ANY Celery/Redis connection errors
                logger.warning(f"Failed to queue ticket review email task (Celery/Redis may be unavailable): {e}")
 
        # ✅ Notify Admins, Managers, Warehouse Managers
        roles_to_notify = ["Admin", "Manager", "Warehouse Manager"]
        notify_users = Account.objects.filter(role__in=roles_to_notify)

        for notify_user in notify_users:
            Notification.objects.create(
                recipient=notify_user,
                title="Ticket Pending Approval",
                message=f"Ticket #{instance.pk} by '{user.username}' is pending approval. Please review it.",
                notification_type="INFO",
                link=f"/tickets/{instance.pk}"
            )


@receiver(post_save, sender=Ticket)
def send_status_update_notification(sender, instance, created, **kwargs):
    # If the ticket is newly created, skip the logic
    if created:
        return

    # Check if the created_by user exists and is a "Customer"
    if instance.created_by :
        user = instance.created_by
        # Check if the user's role is "Service Customer" or "Vending Customer"
        if user and user.role in ["Service Customer", "Vending Customer"]:
            # Send notification to the created_by user about the new status
            Notification.objects.create(
                title="Ticket Status Update",
                message=f"Your ticket ID #{instance.id}, titled '{instance.title}' is now '{instance.status}'.",
                notification_type="INFO",
                recipient=instance.created_by,
                link=f"/tickets/{instance.id}"
            )
            

# Send Notifications
@receiver(post_save, sender=Notification)
def send_notification_alert(sender, instance, created, **kwargs):
    if not created:
        return

    user = instance.recipient
    preferences = UserPreference.objects.filter(user=user).first()

    if not preferences:
        return  # If no preferences found, do nothing
    
    formatted_title = instance.title.replace("_", " ").title()
    
    # Send Email Notification if the preference is enabled
    if preferences.receive_email_notifications:
        try:
            send_email_notification.delay(user.id, formatted_title, instance.message)
        except Exception as e:
            # Gracefully handle ANY Celery/Redis connection errors to prevent registration failure
            # This catches kombu.exceptions.OperationalError, redis.exceptions.ConnectionError, etc.
            logger.warning(f"Failed to queue email notification task (Celery/Redis may be unavailable): {e}")
    
    # Send WhatsApp Notification if the preference is enabled
    if preferences.receive_whatsapp_notifications:
        try:
            send_whatsapp_notification.delay(user.id, formatted_title, instance.message)
        except Exception as e:
            # Gracefully handle ANY Celery/Redis connection errors to prevent registration failure
            logger.warning(f"Failed to queue WhatsApp notification task (Celery/Redis may be unavailable): {e}")

# Automatically create invoices when warehouse-to-customer or warehouse-to-store transfers are created or updated
@receiver(post_save, sender=Transfer)
def create_invoice_on_transfer(sender, instance, created, **kwargs):
    if instance.transfer_type in ["WAREHOUSE_TO_CUSTOMER", "WAREHOUSE_TO_STORE"]:
        # Use transaction.on_commit to ensure this runs after the transfer is fully committed
        transaction.on_commit(lambda: _check_and_create_invoice_for_transfer(instance.id))

# Signal for when items are added to transfers (ManyToMany relationship)
@receiver(post_save, sender=Transfer.items.through)
def create_invoice_when_items_added(sender, instance, created, **kwargs):
    if created:  # Only when items are added (not removed)
        transfer = instance.transfer
        if transfer.transfer_type in ["WAREHOUSE_TO_CUSTOMER", "WAREHOUSE_TO_STORE"]:
            # Use transaction.on_commit to ensure this runs after the item is fully committed
            transaction.on_commit(lambda: _check_and_create_invoice_for_transfer(transfer.id))


def _check_and_create_invoice_for_transfer(transfer_id):
    """Helper function to check and create invoice for a transfer"""
    try:
        with transaction.atomic():  # Ensure all operations are atomic
            # Get the transfer with fresh data
            transfer = Transfer.objects.select_related('created_by').prefetch_related('items').get(id=transfer_id)
            
            # Check if transfer is warehouse-to-customer or warehouse-to-store
            if transfer.transfer_type not in ["WAREHOUSE_TO_CUSTOMER", "WAREHOUSE_TO_STORE"]:
                logger.info(f"Transfer {transfer.id} is not WAREHOUSE_TO_CUSTOMER or WAREHOUSE_TO_STORE, skipping invoice creation")
                return
            
            # Check if invoice already exists for this transfer
            if Invoice.objects.filter(transfer=transfer).exists():
                logger.info(f"Invoice already exists for transfer {transfer.id}")
                return
            
            # Check if transfer has items
            if not transfer.items.exists():
                logger.info(f"Transfer {transfer.id} has no items yet, skipping invoice creation")
                return
            
            # Get store or customer from transfer destination
            store = None
            customer = None
            
            if transfer.transfer_type == "WAREHOUSE_TO_STORE":
                try:
                    from custom_user.models import StoreProfile
                    store = StoreProfile.objects.get(id=transfer.destination_object_id)
                    customer = store.customer  # Get customer from store
                except StoreProfile.DoesNotExist:
                    logger.error(f"Store not found for transfer {transfer.id}")
                    return
            else:  # WAREHOUSE_TO_CUSTOMER
                try:
                    customer = User.objects.get(id=transfer.destination_object_id)
                except User.DoesNotExist:
                    logger.error(f"Customer not found for transfer {transfer.id}")
                    return
            
            # Set due date to 5 days from now
            due_date = timezone.now().date() + timezone.timedelta(days=5)
            
            # Create invoice
            invoice = Invoice(
                store=store,
                transfer=transfer,
                status='DRAFT',
                due_date=due_date,
                notes=f'Generated from transfer # {transfer.reference_number or transfer.id}',
                created_by=transfer.created_by
            )
            invoice.save()  # Save to assign primary key
            
            # Add items to the invoice
            for item in transfer.items.all():
                try:
                    unit_price = Decimal(item.inventory.unit_price)
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        inventory_item=item,
                        quantity=1,
                        unit_price=unit_price,
                        description=f'Item from transfer {transfer.reference_number or transfer.id}'
                    )
                except Exception as e:
                    logger.error(f"Failed to create InvoiceItem for transfer {transfer.id}, item {item.id}: {str(e)}")
                    raise  # Roll back transaction if item creation fails
            
            # Apply compulsory charges and calculate totals
            invoice.apply_compulsory_charges()  # This will also call calculate_totals() and save()
            
            logger.info(f"Successfully created invoice {invoice.invoice_number} for transfer {transfer.id}")
            
    except Exception as e:
        logger.error(f"Failed to create invoice for transfer {transfer_id}: {str(e)}")
        raise  # Re-raise to ensure the error is visible for debugging
    
# Delete associated invoice when warehouse-to-customer or warehouse-to-store transfer is deleted
@receiver(pre_delete, sender=Transfer)
def delete_invoice_on_transfer(sender, instance, **kwargs):
    if instance.transfer_type in ["WAREHOUSE_TO_CUSTOMER", "WAREHOUSE_TO_STORE"]:
        try:
            # Find and delete associated invoice
            invoice = Invoice.objects.filter(transfer=instance).first()
            if invoice:
                invoice.delete()
                logger.info(f"Deleted invoice {invoice.invoice_number} for transfer {instance.id}")
        except Exception as e:
            logger.error(f"Failed to delete invoice for transfer {instance.id}: {str(e)}")


@receiver(post_save, sender=PlatformConfig)
def reload_email_settings_on_save(sender, instance, created, **kwargs):
    """
    Automatically reload email settings when PlatformConfig is updated.
    This allows email configuration changes to take effect without server restart.
    """
    print(f"🔔 PlatformConfig signal triggered! Created: {created}, Updated: {not created}")
    logger.info(f"PlatformConfig signal triggered! Created: {created}, Updated: {not created}")
    
    try:
        from .email_settings import reload_email_settings
        print("🔄 Reloading email settings...")
        email_config = reload_email_settings()
        print(f"✅ Email settings reloaded: {email_config}")
        logger.info(f"Email settings reloaded successfully: {email_config}")
    except Exception as e:
        # Log error but don't break the save operation
        print(f"❌ Failed to reload email settings: {e}")
        logger.warning(f"Failed to reload email settings after PlatformConfig save: {e}")
            