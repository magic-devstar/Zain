from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class MyAccountManager(BaseUserManager):
    def create_user(self, email, username, role="User", password=None):
        if not email:
            raise ValueError("Users must have an email address")
        if not username:
            raise ValueError("Users must have a username")

        user = self.model(
            email=self.normalize_email(email),
            username=username,
            role=role,  # Default role set here
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None):
        user = self.create_user(
            email=email,
            username=username,
            password=password,
            role="Admin",  # Superuser is always Admin
        )
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class Account(AbstractBaseUser):

    ROLE_CHOICE = (
        ("Admin", "Admin"),
        ("Manager", "Manager"),
        ("Technician", "Technician"),
        ("Warehouse Manager", "Warehouse Manager"),
        ("Warehouse Technician", "Warehouse Technician"),
        ("Vending Customer", "Vending Customer"),
        ("Service Customer", "Service Customer"),
        ("Reporter", "Reporter"),
        ("External User", "External User"),
        ("Deactivated", "Deactivated"),
        ("Partner", "Partner"),
        ("Employee", "Employee")
    )

    username = models.CharField(max_length=130)
    email = models.EmailField(verbose_name="email", max_length=130, unique=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICE)
    phone_number = models.CharField(max_length=30, null=True, blank=True)
    pay_rate = models.CharField(max_length=300, null=True, blank=True)

    date_joined = models.DateTimeField(verbose_name="date joined", auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    check_in_required = models.BooleanField(default=False)
    is_broker = models.BooleanField(default=False)
    profile_image = models.ImageField(
        upload_to="profile_images/", null=True, blank=True
    )
    license = models.FileField(
        upload_to="license_images/", null=True, blank=True
    )
    first_login_completed_at = models.DateTimeField(null=True, blank=True)
    # Stores a list of numeric permission codes for the user
    permissions = models.JSONField(default=list, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = MyAccountManager()

    def __str__(self):
        return self.username

    # For checking permissions. to keep it simple all admin have ALL permissons
    def has_perm(self, perm, obj=None):
        return self.is_admin

    # Does this user have permission to view this app? (ALWAYS YES FOR SIMPLICITY)
    def has_module_perms(self, app_label):
        return True
    
    class Meta:
        ordering = ["username"]



class StoreProfile(models.Model):
    customer = models.ForeignKey('Account', on_delete=models.CASCADE, related_name='store_profiles')
    
    # Store information
    store_name = models.CharField(max_length=555, null=True, blank=True)
    store_address = models.CharField(max_length=500, null=True, blank=True)
    store_city = models.CharField(max_length=555, null=True, blank=True)
    store_zip_code = models.CharField(max_length=550, null=True, blank=True)
    store_billing_email = models.EmailField(null=True, blank=True)
    store_phone = models.CharField(max_length=550, null=True, blank=True)
    
    # Owner information
    owner_name = models.CharField(max_length=555, null=True, blank=True)
    owner_email = models.EmailField(null=True, blank=True)
    owner_phone = models.CharField(max_length=550, null=True, blank=True)
    
    # Distributor information
    distributor_name = models.CharField(max_length=555, null=True, blank=True)
    distributor_email = models.EmailField(null=True, blank=True)
    distributor_phone = models.CharField(max_length=550, null=True, blank=True)
    
    # Manager information
    manager_name = models.CharField(max_length=555, null=True, blank=True)
    manager_email = models.EmailField(null=True, blank=True)
    manager_phone = models.CharField(max_length=550, null=True, blank=True)

    open = models.TimeField(null=True, blank=True)
    close = models.TimeField(null=True, blank=True)

    preferred_software = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True, help_text="Whether the store is active or deactivated")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Store Profile: {self.store_name} for {self.customer.username}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Store Profile"
        verbose_name_plural = "Store Profiles"


class AccessLog(models.Model):
    user = models.ForeignKey(
        "custom_user.Account", on_delete=models.SET_NULL, null=True, blank=True
    )
    ip_address = models.GenericIPAddressField()
    action = models.CharField(
        max_length=100
    )  # Action performed (e.g., 'login', 'viewed page', etc.)
    path = models.CharField(max_length=255)  # URL path
    status_code = models.IntegerField()  # HTTP status code
    timestamp = models.DateTimeField(
        auto_now_add=True
    )  # Time when the action was performed

    def __str__(self):
        return f"Log {self.id} - {self.user} - {self.action} - {self.timestamp}"


class UserPreference(models.Model):
    user = models.OneToOneField('Account', on_delete=models.CASCADE, related_name='preference')
    receive_email_notifications = models.BooleanField(default=True)
    receive_whatsapp_notifications = models.BooleanField(default=False)

    def __str__(self):
        return f"Preferences for {self.user.username}"


class UserFavorite(models.Model):
    """Model to store user's favorite URLs/pages"""
    user = models.ForeignKey(
        'Account', 
        on_delete=models.CASCADE, 
        related_name='favorites',
        help_text="User who created this favorite"
    )
    title = models.CharField(
        max_length=255,
        help_text="Display name for the favorite"
    )
    url = models.CharField(
        max_length=500,
        help_text="URL path of the favorite page"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this favorite was created"
    )

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'url']  # Prevent duplicate URLs per user
        verbose_name = "User Favorite"
        verbose_name_plural = "User Favorites"

    def __str__(self):
        return f"{self.user.username} - {self.title}"
