from django.db.models.signals import post_save
from django.dispatch import receiver
from commonapp.models import Notification
from .models import StoreProfile, Account, UserPreference

@receiver(post_save, sender=Account)
def create_or_update_store_profile(sender, instance, created, **kwargs):
    if created:
        # Create the profile when a new user is created with a customer role
        if instance.role in ["Vending Customer", "Service Customer"]:
            StoreProfile.objects.get_or_create(customer=instance)
    else:
        # Handle profile creation/updating when an existing user's role changes
        if instance.role in ["Vending Customer", "Service Customer"]:
            # Create the profile if not already exists
            if not hasattr(instance, 'store_profiles'):
                StoreProfile.objects.get_or_create(customer=instance)


@receiver(post_save, sender=Account)
def notify_admin_on_deactivated_account(sender, instance, created, **kwargs):
    if created and instance.role == "Deactivated":
        # Fetch all admin users
        admin_users = Account.objects.filter(role="Admin")

        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                title="New Customer Registration",
                message=f"A new customer '{instance.username}' has registered. Kindly review their profile.",
                notification_type="INFO",
            )

@receiver(post_save, sender=Account)
def create_user_preference(sender, instance, created, **kwargs):
    if created:
        UserPreference.objects.get_or_create(user=instance)