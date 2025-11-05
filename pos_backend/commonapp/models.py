from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.db.models import Sum
from io import BytesIO
import qrcode
from django.core.files import File
import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from PIL import Image
import os
from custom_user.models import StoreProfile

User = get_user_model()


class SliderSlide(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    image = models.ImageField(upload_to='slider_images/')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['order', 'created_at']


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("OPEN", "OPEN"),
        ("IN PROGRESS", "IN PROGRESS"),
        ("PARTIALLY CLOSED", "PARTIALLY CLOSED"),
        ("PENDING APPROVAL", "PENDING APPROVAL"),
        ("CLOSED", "CLOSED"),
    ]
    status = models.CharField(max_length=100, default="OPEN", choices=STATUS_CHOICES)
    title = models.CharField(max_length=1000)
    description = models.TextField()
    deadline = models.DateField(null=True, blank=True)
    assigned_to = models.ManyToManyField(User, related_name="assigned_tickets")
    assigned_by = models.ForeignKey(
        User,
        related_name="ticket_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        User, related_name="created_tickets", on_delete=models.CASCADE
    )
    store = models.ForeignKey(
        StoreProfile,
        related_name="store_tickets",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Store for which this ticket is created"
    )
    items = models.ManyToManyField("InventoryItem", related_name="tickets", blank=True)
    item_usages = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="JSON field storing item IDs used in the ticket, e.g., {'1': true, '2': true}",
    )
    defective_items = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="JSON field storing defective item IDs, e.g., {'1': true, '2': true}",
    )
    charges = models.JSONField(
        default=list,
        blank=True,
        null=True,
        help_text="JSON field storing ticket charges, e.g., [{'amount': 100.00, 'description': 'Service fee'}]",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    flagged = models.BooleanField(default=False)
    payable = models.BooleanField(default=False)
    paid = models.BooleanField(default=False)
    representativeName = models.CharField(max_length=1000, null=True, blank=True)
    representativePhone = models.CharField(max_length=1000, null=True, blank=True)
    attachments = GenericRelation("Attachment")

    def __str__(self):
        return f"{self.title} ({self.created_by.email})"

    class Meta:
        ordering = ["title"]


class TicketNotes(models.Model):
    STATUS_CHOICES = [
        ("Service Customer", "Service Customer"),
        ("Technician", "Technician"),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="notes")
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_by = models.ForeignKey(
        User,
        related_name="created_ticket_notes",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note for Ticket #{self.ticket.id} - {self.status}"

    class Meta:
        ordering = ["-created_at"]


class SupportTicket(models.Model):
    TYPE_CHOICES = [
        ("ISSUE", "ISSUE"),
        ("FEATURE REQUEST", "FEATURE REQUEST"),
        ("GENERAL INQUIRY", "GENERAL INQUIRY"),
    ]
    type = models.CharField(max_length=100, default="OPEN", choices=TYPE_CHOICES)
    title = models.CharField(max_length=1000)
    description = models.TextField()

    created_by = models.ForeignKey(
        User,
        related_name="created_support_tickets",
        on_delete=models.CASCADE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    attachments = GenericRelation("Attachment")

    def __str__(self):
        return f"{self.title} ({self.created_by.email})"

    class Meta:
        ordering = ["title"]


class Attachment(models.Model):
    file = models.FileField(upload_to="attachments/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    attachment_type = models.CharField(max_length=20, blank=True, null=True, help_text="e.g., 'pickup' or 'return' for VehicleUsage")

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey()

    def __str__(self):
        return f"Attachment {self.id} for {self.content_object}"

    class Meta:
        ordering = ["-uploaded_at"]


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("INFO", "INFO"),
        ("SUCCESS", "SUCCESS"),
        ("WARNING", "WARNING"),
        ("ERROR", "ERROR"),
    ]

    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=10, choices=NOTIFICATION_TYPES, default="INFO"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.title}"


class Warehouse(models.Model):
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=10,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active",
    )

    class Meta:
        permissions = [
            ("can_delete_warehouse", "Can delete warehouse"),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    class Meta:
        ordering = ["name"]


class WarehouseManager(models.Model):
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.CASCADE, related_name="warehouse_managers"
    )
    manager = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role__in": ["Warehouse Manager"]},
    )

    def __str__(self):
        return f"{self.manager.username} manages {self.warehouse.name}"

    class Meta:
        ordering = ["-id"]


class InventoryCategory(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


def inventory_qr_path(instance, filename):
    return f"qr_codes/inventory_{instance.upc}.png"


class Inventory(models.Model):
    name = models.CharField(max_length=550)
    upc = models.CharField(max_length=550, unique=True)
    category = models.ForeignKey(
        InventoryCategory,
        on_delete=models.CASCADE,
        related_name="inventories",
        null=True,
        blank=True,
    )
    unit_price = models.CharField(max_length=550)
    price = models.CharField(max_length=550)
    description = models.TextField(null=True, blank=True)
    low_stock_threshold = models.PositiveIntegerField(default=10)
    serial_number_required = models.BooleanField(default=False)
    qr_code = models.ImageField(upload_to=inventory_qr_path, blank=True, null=True)
    attachments = GenericRelation("Attachment")
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        regenerate_qr = False

        if self.pk:
            try:
                old = Inventory.objects.get(pk=self.pk)
                if old.upc != self.upc:
                    regenerate_qr = True
            except Inventory.DoesNotExist:
                regenerate_qr = True
        else:
            regenerate_qr = True

        if regenerate_qr:
            qr_content = f"{self.upc}"
            qr = qrcode.make(qr_content)
            buffer = BytesIO()
            qr.save(buffer, format="PNG")
            filename = f"qr_{self.upc}.png"
            self.qr_code.save(filename, File(buffer), save=False)

        super().save(*args, **kwargs)

    @property
    def total_quantity(self):
        return self.items.count()

    @property
    def available_quantity(self):
        return self.items.filter(status="available").count()

    def check_low_stock(self):
        available_qty = self.items.filter(status="available").count()
        return available_qty <= self.low_stock_threshold

    def __str__(self):
        return f"{self.name} - {self.upc}"

    class Meta:
        ordering = ["name"]


class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("in_use", "In Use"),
        ("consumed", "Consumed"),
        ("in_repair", "In Repair"),
    ]

    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="items"
    )
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.CASCADE, related_name="inventory_items"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="available"
    )
    attributes = models.JSONField(default=dict, blank=True, null=True)
    store = models.ForeignKey(
        StoreProfile,
        on_delete=models.SET_NULL,
        related_name="store_inventory_items",
        null=True,
        blank=True,
        help_text="Store that owns this item (when status is consumed)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.inventory.name} - Item {self.id} - {self.status}"


class InventoryLocation(models.Model):
    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="locations"
    )
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    aisle = models.CharField(max_length=550, blank=True, null=True)
    shelf = models.CharField(max_length=550, blank=True, null=True)
    bay = models.CharField(max_length=550, blank=True, null=True)

    class Meta:
        unique_together = ("inventory", "warehouse")
        ordering = ["warehouse__name"]

    def __str__(self):
        return f"{self.inventory.name} at {self.warehouse.name}"


class Vendor(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]

from django.core.exceptions import ValidationError

class Transfer(models.Model):
    TRANSFER_TYPES = [
        ("VENDOR_TO_WAREHOUSE", "Vendor to Warehouse"),
        ("WAREHOUSE_TO_WAREHOUSE", "Warehouse to Warehouse"),
        ("WAREHOUSE_TO_STORE", "Warehouse to Store"),
        ("STORE_TO_WAREHOUSE", "Store to Warehouse"),
        ("WAREHOUSE_TO_CUSTOMER", "Warehouse to Customer"),  # Legacy support
        ("CUSTOMER_TO_WAREHOUSE", "Customer to Warehouse"),  # Legacy support
    ]

    transfer_type = models.CharField(max_length=50, choices=TRANSFER_TYPES)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_transfers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reference_number = models.CharField(max_length=255, blank=True, null=True)
    
    # Generic relation for source
    source_content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        related_name="source_transfers"
    )
    source_object_id = models.PositiveIntegerField()
    source = GenericForeignKey('source_content_type', 'source_object_id')

    # Generic relation for destination
    destination_content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        related_name="destination_transfers"
    )
    destination_object_id = models.PositiveIntegerField()
    destination = GenericForeignKey('destination_content_type', 'destination_object_id')

    # ManyToManyField to link InventoryItems
    items = models.ManyToManyField("InventoryItem", related_name="transfers", blank=True)

    def process_transfer(self, transfer_data):
        """
        Process the transfer by creating or updating InventoryItem records.
        For WAREHOUSE_TO_CUSTOMER, move specified InventoryItems to consumed status without requiring inventory_id.
        For other transfers to warehouses, ensure InventoryLocation exists.
        transfer_data: List of dictionaries with quantity, optional attributes, and item_ids.
        Example for WAREHOUSE_TO_CUSTOMER:
        [
            {
                "quantity": 2,
                "attributes": [],
                "item_ids": [32, 35]
            }
        ]
        """
        for data in transfer_data:
            quantity = data.get('quantity', 1)
            attributes_list = data.get('attributes', [])
            item_ids = data.get('item_ids', [])

            if self.transfer_type == "WAREHOUSE_TO_CUSTOMER":
                # Move specified InventoryItems to consumed status
                if not item_ids:
                    raise ValidationError("Item IDs required for WAREHOUSE_TO_CUSTOMER transfer")
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"Number of item IDs ({len(item_ids)}) must match quantity ({quantity})"
                    )
                for item_id in item_ids:
                    try:
                        item = InventoryItem.objects.get(id=item_id)
                        if item.warehouse_id != self.source_object_id:
                            raise ValidationError(
                                f"Item {item_id} is not in source warehouse {self.source_object_id}"
                            )
                        item.status = "consumed"
                        item.save()
                        self.items.add(item)
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")

            # Removed redundant early branch for VENDOR/WAREHOUSE/STORE → WAREHOUSE
            # The complete handling for these transfer types is implemented below
            
            elif self.transfer_type == "WAREHOUSE_TO_STORE":
                if self.destination_content_type.model != 'storeprofile':
                    raise ValidationError("Destination must be a store profile for WAREHOUSE_TO_STORE transfers")
                
                store = self.destination
                inventory_id = data.get('inventory_id')
                if not inventory_id:
                    raise ValidationError("Inventory ID is required for this transfer type")
                try:
                    inventory = Inventory.objects.get(id=inventory_id)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Inventory ID {inventory_id} does not exist")
                
                # For WAREHOUSE_TO_STORE, we need to move items from warehouse to store
                if item_ids:
                    # Use provided item_ids
                    if len(item_ids) != quantity:
                        raise ValidationError(
                            f"For {inventory.name}, number of item IDs ({len(item_ids)}) "
                            f"must match quantity ({quantity})"
                        )
                    for item_id in item_ids:
                        try:
                            item = InventoryItem.objects.get(id=item_id)
                            if item.inventory_id != inventory.id:
                                raise ValidationError(
                                    f"Item {item_id} does not belong to inventory {inventory.name}"
                                )
                            if item.warehouse_id != self.source_object_id:
                                raise ValidationError(
                                    f"Item {item_id} is not in source warehouse {self.source_object_id}"
                                )
                            # Move item to store (set store field and mark as consumed)
                            item.store = store
                            item.status = "consumed"
                            item.save()
                            self.items.add(item)
                        except InventoryItem.DoesNotExist:
                            raise ValidationError(f"Item ID {item_id} does not exist")
                else:
                    # Select available items from source warehouse
                    source_warehouse = Warehouse.objects.get(id=self.source_object_id)
                    available_items = InventoryItem.objects.filter(
                        inventory=inventory,
                        warehouse=source_warehouse,
                        status="available"
                    )[:quantity]
                    if len(available_items) < quantity:
                        raise ValidationError(
                            f"Not enough available items for {inventory.name} in source warehouse {source_warehouse.name}. "
                            f"Requested: {quantity}, Available: {len(available_items)}"
                        )
                    for item in available_items:
                        # Move item to store (set store field and mark as consumed)
                        item.store = store
                        item.status = "consumed"
                        item.save()
                        self.items.add(item)
                        
            elif self.transfer_type in ["VENDOR_TO_WAREHOUSE", "WAREHOUSE_TO_WAREHOUSE"]:
                warehouse = self.destination
                inventory_id = data.get('inventory_id')
                if not inventory_id:
                    raise ValidationError("Inventory ID is required for this transfer type")
                try:
                    inventory = Inventory.objects.get(id=inventory_id)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Inventory ID {inventory_id} does not exist")

                # Check for InventoryLocation and create if needed
                inventory_location, _ = InventoryLocation.objects.get_or_create(
                    inventory=inventory,
                    warehouse=warehouse,
                    defaults={
                        'aisle': '',
                        'shelf': '',
                        'bay': ''
                    }
                )
                if not inventory_location.aisle and not inventory_location.shelf and not inventory_location.bay:
                    # Try to copy location data from another warehouse
                    existing_location = InventoryLocation.objects.filter(
                        inventory=inventory
                    ).exclude(warehouse=warehouse).first()
                    if existing_location:
                        inventory_location.aisle = existing_location.aisle
                        inventory_location.shelf = existing_location.shelf
                        inventory_location.bay = existing_location.bay
                        inventory_location.save()

                if self.transfer_type == "WAREHOUSE_TO_WAREHOUSE":
                    # Move existing items to the destination warehouse
                    if item_ids:
                        # Use provided item_ids
                        if len(item_ids) != quantity:
                            raise ValidationError(
                                f"For {inventory.name}, number of item IDs ({len(item_ids)}) "
                                f"must match quantity ({quantity})"
                            )
                        for item_id in item_ids:
                            try:
                                item = InventoryItem.objects.get(id=item_id)
                                if item.inventory_id != inventory.id:
                                    raise ValidationError(
                                        f"Item {item_id} does not belong to inventory {inventory.name}"
                                    )
                                if item.warehouse_id != self.source_object_id:
                                    raise ValidationError(
                                        f"Item {item_id} is not in source warehouse {self.source_object_id}"
                                    )
                                item.warehouse = warehouse
                                item.status = "available"
                                item.save()
                                self.items.add(item)
                            except InventoryItem.DoesNotExist:
                                raise ValidationError(f"Item ID {item_id} does not exist")
                    else:
                        # Select available items from source warehouse
                        source_warehouse = Warehouse.objects.get(id=self.source_object_id)
                        available_items = InventoryItem.objects.filter(
                            inventory=inventory,
                            warehouse=source_warehouse,
                            status="available"
                        )[:quantity]
                        if len(available_items) < quantity:
                            raise ValidationError(
                                f"Not enough available items for {inventory.name} in source warehouse {source_warehouse.name}. "
                                f"Requested: {quantity}, Available: {len(available_items)}"
                            )
                        for item in available_items:
                            item.warehouse = warehouse
                            item.status = "available"
                            item.save()
                            self.items.add(item)

                else:  # VENDOR_TO_WAREHOUSE
                    # For serialized items, create one InventoryItem per attribute set
                    if inventory.serial_number_required:
                        if len(attributes_list) != quantity:
                            raise ValidationError(
                                f"Number of attribute sets ({len(attributes_list)}) must match quantity ({quantity}) for {inventory.name}"
                            )
                        for attributes in attributes_list:
                            # Ensure required attributes are present
                            required_attributes = ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number']
                            if not all(attr in attributes for attr in required_attributes):
                                raise ValidationError(f"Missing required attributes for {inventory.name}")
                            item = InventoryItem.objects.create(
                                inventory=inventory,
                                warehouse=warehouse,
                                status="available",
                                attributes=attributes
                            )
                            self.items.add(item)
                    else:
                        # For non-serialized items, create multiple InventoryItems with empty attributes
                        for _ in range(quantity):
                            item = InventoryItem.objects.create(
                                inventory=inventory,
                                warehouse=warehouse,
                                status="available",
                                attributes={} 
                            )
                            self.items.add(item)


            elif self.transfer_type == "CUSTOMER_TO_WAREHOUSE":
                # Move specified InventoryItems to the destination warehouse
                if not item_ids:
                    raise ValidationError("Item IDs required for CUSTOMER_TO_WAREHOUSE transfer")
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"Number of item IDs ({len(item_ids)}) must match quantity ({quantity})"
                    )
                warehouse = Warehouse.objects.get(id=self.destination_object_id)
                for item_id in item_ids:
                    try:
                        item = InventoryItem.objects.get(id=item_id)
                        # Create or get InventoryLocation for the item's inventory
                        inventory_location, _ = InventoryLocation.objects.get_or_create(
                            inventory=item.inventory,
                            warehouse=warehouse,
                            defaults={
                                'aisle': '',
                                'shelf': '',
                                'bay': ''
                            }
                        )
                        if not inventory_location.aisle and not inventory_location.shelf and not inventory_location.bay:
                            # Copy location data from another warehouse if available
                            existing_location = InventoryLocation.objects.filter(
                                inventory=item.inventory
                            ).exclude(warehouse=warehouse).first()
                            if existing_location:
                                inventory_location.aisle = existing_location.aisle
                                inventory_location.shelf = existing_location.shelf
                                inventory_location.bay = existing_location.bay
                                inventory_location.save()
                        item.warehouse = warehouse
                        item.status = "available"
                        item.save()
                        self.items.add(item)
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")

            elif self.transfer_type == "WAREHOUSE_TO_STORE":
                # Move specified InventoryItems to consumed status and assign to store
                if not item_ids:
                    raise ValidationError("Item IDs required for WAREHOUSE_TO_STORE transfer")
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"Number of item IDs ({len(item_ids)}) must match quantity ({quantity})"
                    )
                # Get the store from destination
                from custom_user.models import StoreProfile
                store = StoreProfile.objects.get(id=self.destination_object_id)
                for item_id in item_ids:
                    try:
                        item = InventoryItem.objects.get(id=item_id)
                        if item.warehouse_id != self.source_object_id:
                            raise ValidationError(
                                f"Item {item_id} is not in source warehouse {self.source_object_id}"
                            )
                        item.status = "consumed"
                        item.store = store  # Assign the store
                        item.save()
                        self.items.add(item)
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")

            elif self.transfer_type == "STORE_TO_WAREHOUSE":
                # Move specified InventoryItems from store back to warehouse
                if not item_ids:
                    raise ValidationError("Item IDs required for STORE_TO_WAREHOUSE transfer")
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"Number of item IDs ({len(item_ids)}) must match quantity ({quantity})"
                    )
                warehouse = Warehouse.objects.get(id=self.destination_object_id)
                for item_id in item_ids:
                    try:
                        item = InventoryItem.objects.get(id=item_id)
                        # Ensure item currently belongs to the source store
                        if item.store_id != self.source_object_id:
                            raise ValidationError(
                                f"Item {item_id} is not in source store {self.source_object_id}"
                            )
                        # Create or get InventoryLocation for the item's inventory
                        inventory_location, _ = InventoryLocation.objects.get_or_create(
                            inventory=item.inventory,
                            warehouse=warehouse,
                            defaults={
                                'aisle': '',
                                'shelf': '',
                                'bay': ''
                            }
                        )
                        if not inventory_location.aisle and not inventory_location.shelf and not inventory_location.bay:
                            # Copy location data from another warehouse if available
                            existing_location = InventoryLocation.objects.filter(
                                inventory=item.inventory
                            ).exclude(warehouse=warehouse).first()
                            if existing_location:
                                inventory_location.aisle = existing_location.aisle
                                inventory_location.shelf = existing_location.shelf
                                inventory_location.bay = existing_location.bay
                                inventory_location.save()
                        item.warehouse = warehouse
                        item.status = "available"
                        item.store = None  # Remove store association
                        item.save()
                        self.items.add(item)
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")
        
        # Auto-create invoice for warehouse-to-customer transfers
        if self.transfer_type == "WAREHOUSE_TO_CUSTOMER":
            # Invoice creation is now handled by signals
            pass

    def __str__(self):
        return f"Transfer {self.id} - {self.transfer_type} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-created_at"]



class Repair(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REPAIRED", "Repaired"),
    ]

    inventory_items = models.ManyToManyField(
        "InventoryItem",
        related_name="repairs",
        help_text="The inventory items under repair"
    )
    vendor = models.ForeignKey(
        "Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="repairs",
        help_text="The vendor assigned to handle the repair, if any"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        help_text="Status of the repair ticket"
    )
    information = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Additional repair information stored in JSON format"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_repairs",
        help_text="User who created the repair ticket"
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_repairs",
        help_text="User who approved the repair ticket"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Repair #{self.id} - {self.status}"

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Ensure information has required keys
        if not isinstance(self.information, dict):
            self.information = {}
        self.information.setdefault("notes", "")
        self.information.setdefault("tracking_number", "")
        self.information.setdefault("reference_number", "")
        # Set approved_at when status changes to APPROVED
        if self.status == "APPROVED" and self.approved_at is None:
            self.approved_at = timezone.now()
        elif self.status == "PENDING":
            self.approved_at = None
            self.approved_by = None
        super().save(*args, **kwargs)



# /////////  Reconcilation ////////////////// 

class Reconciliation(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SUBMITTED", "Submitted"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.CASCADE,
        related_name="reconciliations",
        help_text="Warehouse being reconciled"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reconciliations",
        help_text="Warehouse Manager who created the reconciliation"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        help_text="Status of the reconciliation"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_reconciliations",
        limit_choices_to={"role": "Admin"},
        help_text="Admin who approved the reconciliation"
    )

    def __str__(self):
        return f"Reconciliation #{self.id} - {self.warehouse.name} - {self.status}"

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.status == "SUBMITTED" and self.submitted_at is None:
            self.submitted_at = timezone.now()
        elif self.status == "APPROVED" and self.approved_at is None:
            self.approved_at = timezone.now()
        elif self.status in ["PENDING", "REJECTED"]:
            self.submitted_at = None
            self.approved_at = None
            self.approved_by = None
        super().save(*args, **kwargs)

class ReconciliationReport(models.Model):
    reconciliation = models.OneToOneField(
        "Reconciliation",
        on_delete=models.CASCADE,
        related_name="report",
        help_text="Associated reconciliation session"
    )
    warehouse = models.ForeignKey(
        "Warehouse",
        on_delete=models.CASCADE,
        help_text="Warehouse where reconciliation occurred"
    )
    items = models.JSONField(
        default=list,
        help_text="List of items with UPC, name, expected_quantity, actual_quantity, discrepancy_type, attributes, and action"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for Reconciliation #{self.reconciliation.id} - {self.warehouse.name}"

    class Meta:
        ordering = ["-created_at"]


# ==============================================================================================

class VendingCustomerLocation(models.Model):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
    )

    name = models.CharField(max_length=1000)
    location = models.CharField(max_length=1000)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="inactive")
    vending_customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="vending_locations"
    )
    assigned_to = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="assigned_locations", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.vending_customer.username})"

    class Meta:
        ordering = ["name"]



class LocationPermission(models.Model):
    """Model to store user location permissions and assignment details"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="location_permissions",
        help_text="User who is assigned to the location"
    )
    location = models.ForeignKey(
        VendingCustomerLocation,
        on_delete=models.CASCADE,
        related_name="user_permissions",
        help_text="Location the user is assigned to"
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_location_permissions",
        help_text="User who assigned this permission"
    )
    assigned_at = models.DateTimeField(
        default=timezone.now,
        help_text="Timestamp when the permission was assigned"
    )

    def __str__(self):
        return f"{self.user.username} - {self.location.name} (Assigned by {self.assigned_by.username if self.assigned_by else 'Unknown'})"

    class Meta:
        unique_together = ['user', 'location']  # Prevent duplicate assignments
        ordering = ['-assigned_at']
        verbose_name = "Location Permission"
        verbose_name_plural = "Location Permissions"



class Reading(models.Model):
    profit_amount = models.CharField(max_length=1000)
    vending_location = models.ForeignKey(
        VendingCustomerLocation, related_name="readings", on_delete=models.CASCADE
    )
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="readings_taken"
    )
    reading_date = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True)
    attachments = GenericRelation(Attachment)

    def __str__(self):
        return f"Reading at {self.vending_location.name} on {self.reading_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-reading_date"]


# Vehicles

class Vehicle(models.Model):
    name = models.CharField(max_length=255)
    vin = models.CharField(max_length=17, unique=True, help_text="Vehicle Identification Number")
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=[("available", "Available"), ("in_use", "In Use"), ("in_maintenance", "In Maintenance"), ("retired", "Retired")],
        default="available"
    )
    current_mileage = models.PositiveBigIntegerField(default=0, help_text="Current odometer reading in miles")
    attachments = GenericRelation("Attachment")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.make} {self.model} ({self.vin})"

    class Meta:
        ordering = ["name"]

class VehicleUsage(models.Model):
    vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.CASCADE,
        related_name="usages",
        help_text="Vehicle being used"
    )
    secondary_vehicles = models.ManyToManyField(
        'Vehicle',
        related_name="secondary_usages",
        blank=True,
        help_text="Additional vehicles taken along with the primary vehicle"
    )
    # New field to track if this is a secondary vehicle usage
    is_secondary_usage = models.BooleanField(
        default=False,
        help_text="Whether this usage is for a secondary vehicle"
    )
    # New field to link secondary vehicle usages to their primary usage
    primary_usage = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="secondary_vehicle_usages",
        help_text="Reference to the primary vehicle usage if this is a secondary vehicle usage"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vehicle_usages",
        help_text="User who picked up/returned the vehicle"
    )
    pickup_time = models.DateTimeField(default=timezone.now, help_text="Time when vehicle was picked up")
    return_time = models.DateTimeField(null=True, blank=True, help_text="Time when vehicle was returned")
    pickup_mileage = models.PositiveBigIntegerField(help_text="Odometer reading at pickup")
    return_mileage = models.PositiveBigIntegerField(null=True, blank=True, help_text="Odometer reading at return")
    pickup_notes = models.TextField(blank=True, null=True, help_text="Notes at pickup")
    return_notes = models.TextField(blank=True, null=True, help_text="Notes at return")
    attachments = GenericRelation(
        'Attachment',
        help_text="Images and files for this usage"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.return_time and self.return_mileage:
            # Update vehicle's current mileage on return
            self.vehicle.current_mileage = self.return_mileage
            self.vehicle.status = "available"
            self.vehicle.save()
            
            # Note: Secondary vehicle returns are now handled in the serializer
            # to ensure proper mileage validation and user input
        elif self.pk is None:
            # On creation, set vehicle status to in_use
            self.vehicle.status = "in_use"
            self.vehicle.save()
            
            # For new instances, we can't access secondary_vehicles.all() yet
            # This will be handled in the serializer after the instance is saved
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Usage of {self.vehicle} by {self.user} on {self.pickup_time}"

    class Meta:
        ordering = ["-pickup_time"]


class Shift(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="shifts",
        help_text="The user who this shift belongs to."
    )
    start_time = models.DateTimeField(default=timezone.now, help_text="The time when the shift started.")
    end_time = models.DateTimeField(null=True, blank=True, help_text="The time when the shift ended.")
    duration = models.DurationField(null=True, blank=True, help_text="The total duration of the shift.")

    def __str__(self):
        return f"Shift for {self.user.username} started at {self.start_time}"

    class Meta:
        ordering = ["-start_time"]

    def save(self, *args, **kwargs):
        # Calculate duration based on start_time and end_time
        if self.start_time and self.end_time:
            self.duration = self.end_time - self.start_time
        else:
            # If either start_time or end_time is missing, set duration to None
            self.duration = None
        super().save(*args, **kwargs)
        
    
class Tutorial(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    content = models.TextField()
    attachments = GenericRelation(Attachment)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='tutorials'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tutorial'
        verbose_name_plural = 'Tutorials' 

class Group(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    users = models.ManyToManyField(User, related_name='custom_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name = 'Group'
        verbose_name_plural = 'Groups' 

class VehicleMaintenance(models.Model):
    MAINTENANCE_TYPE_CHOICES = [
        ('repair', 'Repair'),
        ('scheduled', 'Scheduled Maintenance'),
        ('inspection', 'Inspection'),
        ('other', 'Other'),
    ]

    vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.CASCADE,
        related_name='maintenance_records',
        help_text="Vehicle being maintained"
    )
    maintenance_type = models.CharField(
        max_length=20,
        choices=MAINTENANCE_TYPE_CHOICES,
        help_text="Type of maintenance performed"
    )
    description = models.TextField(help_text="Description of maintenance/repair work")
    cost = models.DecimalField(
        max_digits=1000,
        decimal_places=2,
        help_text="Cost of maintenance/repair"
    )
    service_provider = models.CharField(
        max_length=255,
        help_text="Name of service provider or mechanic"
    )
    start_date = models.DateTimeField(help_text="When maintenance/repair started")
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When maintenance/repair was completed"
    )
    mileage_at_maintenance = models.PositiveIntegerField(
        help_text="Vehicle mileage when maintenance was performed"
    )
    next_maintenance_date = models.DateField(
        null=True,
        blank=True,
        help_text="Scheduled date for next maintenance"
    )
    next_maintenance_mileage = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Mileage at which next maintenance is recommended"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    attachments = GenericRelation('Attachment', related_query_name='maintenance')

    def __str__(self):
        return f"{self.get_maintenance_type_display()} for {self.vehicle} on {self.start_date}"

    class Meta:
        ordering = ['-start_date'] 

class CashDrawer(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("closed", "Closed"),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cash_drawers",
        null=True,
        blank=True,
        help_text="User who opened the cash drawer"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="open",
        help_text="Current status of the cash drawer"
    )
    opening_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Amount when cash drawer was opened"
    )
    current_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Current amount in cash drawer"
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Cash Drawer - {self.user.username} ({self.status})"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
    
    def close_drawer(self, closed_by_user=None):
        """Close the cash drawer and create a closing entry, then transfer to vault"""
        if self.status == "closed":
            return False
        
        self.status = "closed"
        self.closed_at = timezone.now()
        self.save()
        
        # Create closing entry
        CashEntry.objects.create(
            cash_drawer=self,
            entry_type="closing",
            amount=self.current_amount,
            description="Cash drawer closed",
            created_by=closed_by_user or self.user
        )
        
        # Transfer amount to vault
        vault, created = Vault.objects.get_or_create(id=1)  # Single vault instance
        
        # Capture vault amount BEFORE the transaction
        vault_amount_before = vault.total_amount
        
        vault.add_amount(self.current_amount)
        
        # Create vault entry for the transfer with vault amount at time of creation
        VaultEntry.objects.create(
            vault=vault,
            entry_type="deposit",
            amount=self.current_amount,
            vault_amount_at_time=vault_amount_before,  # Vault amount before this transaction
            description=f"Transfer from cash drawer #{self.id} - {self.user.username}",
            created_by=closed_by_user or self.user
        )
        
        return True
    
    def add_entry(self, entry_type, amount, description, created_by_user=None, store=None, invoice=None):
        """Add an entry to the cash drawer and update current amount"""
        if self.status == "closed":
            raise ValidationError("Cannot add entry to closed cash drawer.")
        
        # Convert amount to Decimal to ensure type consistency
        amount_decimal = Decimal(str(amount))
        
        # Create entry
        entry = CashEntry.objects.create(
            cash_drawer=self,
            entry_type=entry_type,
            amount=amount_decimal,
            description=description,
            created_by=created_by_user,
            store=store,
            invoice=invoice
        )
        
        # Update cash drawer current amount
        if entry_type in ["sale", "fill"]:
            self.current_amount = Decimal(str(self.current_amount)) + amount_decimal
        elif entry_type in ["refund", "adjustment", "bleed", "withdrawal", "closing"]:
            self.current_amount = Decimal(str(self.current_amount)) - amount_decimal
        self.save()
        return entry
    
    
    class Meta:
        ordering = ["-opened_at"]


class CashEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ("opening", "Opening"),
        ("sale", "Sale"),
        ("fill", "Fill"),
        ("refund", "Refund"),
        ("adjustment", "Adjustment"),
        ("withdrawal", "Withdrawal"),
        ("bleed", "Bleed"),
        ("closing", "Closing"),
    ]
    
    cash_drawer = models.ForeignKey(
        CashDrawer,
        on_delete=models.CASCADE,
        related_name="entries",
        help_text="Associated cash drawer"
    )
    entry_type = models.CharField(
        max_length=20,
        choices=ENTRY_TYPE_CHOICES,
        help_text="Type of cash entry"
    )
    amount = models.DecimalField(
        max_digits=100,
        decimal_places=20,
        help_text="Amount of the entry"
    )
    description = models.CharField(
        max_length=255,
        help_text="Description of the entry"
    )
    store = models.ForeignKey(
        StoreProfile,
        on_delete=models.SET_NULL,
        related_name="store_cash_entries",
        null=True,
        blank=True,
        help_text="Store associated with this entry (optional)"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cash_entries_created",
        null=True,
        blank=True,
        help_text="User who created this entry"
    )
    invoice = models.ForeignKey(
        "Invoice",
        on_delete=models.SET_NULL,
        related_name="cash_entries",
        null=True,
        blank=True,
        help_text="Associated invoice (optional)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    attachments = GenericRelation("Attachment")
    
    def __str__(self):
        return f"{self.entry_type} - ${self.amount} - {self.description}"
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Cash Entry"
        verbose_name_plural = "Cash Entries"


class Vault(models.Model):
    """Vault model to store total vault amount"""
    total_amount = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        default=0.00,
        help_text="Total amount in the vault"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Vault - ${self.total_amount}"
    
    def add_amount(self, amount):
        """Add amount to vault"""
        self.total_amount += Decimal(str(amount))
        self.save()
    
    def subtract_amount(self, amount):
        """Subtract amount from vault (allows negative amounts)"""
        self.total_amount -= Decimal(str(amount))
        self.save()
        return True
    
    class Meta:
        verbose_name = "Vault"
        verbose_name_plural = "Vaults"


class VaultEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ("deposit", "Deposit"),
        ("withdrawal", "Withdrawal"),
        ("transfer", "Transfer"),
    ]
    
    vault = models.ForeignKey(
        Vault,
        on_delete=models.CASCADE,
        related_name="entries",
        help_text="Associated vault"
    )
    entry_type = models.CharField(
        max_length=20,
        choices=ENTRY_TYPE_CHOICES,
        help_text="Type of vault entry"
    )
    amount = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        help_text="Amount of the entry"
    )
    vault_amount_at_time = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount in vault at the time this vault entry was created"
    )
    description = models.CharField(max_length=255,
        help_text="Description of the entry"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vault_entries",
        help_text="User who created this entry"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.entry_type} - ${self.amount} - {self.description}"
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Vault Entry"
        verbose_name_plural = "Vault Entries" 


class InvoiceChargeType(models.Model):
    """Model to define types of charges that can be applied to invoices"""
    CHARGE_TYPE_CHOICES = [
        ("FIXED", "Fixed Amount"),
        ("PERCENTAGE", "Percentage"),
        ("MANUAL", "Manual"),
    ]
    
    name = models.CharField(max_length=255, help_text="Name of the charge type (e.g., Service Charge, Tax)")
    charge_type = models.CharField(
        max_length=20,
        choices=CHARGE_TYPE_CHOICES,
        help_text="Whether this is a fixed amount or percentage"
    )
    value = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        help_text="Fixed amount or percentage value"
    )
    is_compulsory = models.BooleanField(
        default=False,
        help_text="Whether this charge is automatically applied to all invoices"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this charge type is currently active"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Description of when and why this charge is applied"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_charge_type_display()})"
    
    class Meta:
        ordering = ['name']
        verbose_name = "Invoice Charge Type"
        verbose_name_plural = "Invoice Charge Types"


class PriceMatrix(models.Model):
    """Model to define price matrix with tax percentage ranges"""
    name = models.CharField(
        max_length=255, 
        help_text="Name of the price matrix (e.g., Standard Tax Matrix)"
    )
    min_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Minimum amount for this tax bracket"
    )
    max_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum amount for this tax bracket (null for unlimited)"
    )
    tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Tax percentage to apply (e.g., 10.00 for 10%)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this price matrix rule is currently active"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Description of when this tax bracket applies"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        max_display = f" to {self.max_amount}" if self.max_amount else " and above"
        return f"{self.name}: {self.min_amount}{max_display} - {self.tax_percentage}%"
    
    class Meta:
        ordering = ['min_amount']
        verbose_name = "Price Matrix"
        verbose_name_plural = "Price Matrices"
        unique_together = ['min_amount', 'max_amount']
    
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.min_amount and self.max_amount and self.min_amount >= self.max_amount:
            raise ValidationError("Minimum amount must be less than maximum amount")
    
    @classmethod
    def get_tax_percentage_for_amount(cls, amount):
        """Get the applicable tax percentage for a given amount"""
        try:
            # Ensure amount is a Decimal
            if not isinstance(amount, Decimal):
                amount = Decimal(str(amount))
            
            # Log the query attempt
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Looking up tax percentage for amount: {amount}")
            
            matrix = cls.objects.filter(
                min_amount__lte=amount,
                is_active=True
            ).filter(
                models.Q(max_amount__isnull=True) | models.Q(max_amount__gte=amount)
            ).order_by('min_amount').first()
            
            if matrix:
                logger.info(f"Found price matrix rule: {matrix.name} with tax_percentage: {matrix.tax_percentage}")
                return matrix.tax_percentage
            else:
                logger.warning(f"No price matrix rule found for amount: {amount}, returning 0%")
                return Decimal('0.00')
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in get_tax_percentage_for_amount: {str(e)}", exc_info=True)
            return Decimal('0.00')
    
    @classmethod
    def calculate_sale_price(cls, unit_price):
        """Calculate sale price based on unit price using price matrix"""
        try:
            # Ensure unit_price is a Decimal
            if not isinstance(unit_price, Decimal):
                unit_price = Decimal(str(unit_price))
            
            # Log the calculation attempt
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Calculating sale price for unit_price: {unit_price}")
            
            tax_percentage = cls.get_tax_percentage_for_amount(unit_price)
            tax_amount = unit_price * (tax_percentage / Decimal('100'))
            sale_price = unit_price + tax_amount
            
            logger.info(f"Sale price calculation: {unit_price} + {tax_amount} = {sale_price}")
            return sale_price
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in calculate_sale_price: {str(e)}", exc_info=True)
            return unit_price


class Invoice(models.Model):
    """Model to store invoice information"""
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("OVERDUE", "Overdue"),
        ("CANCELLED", "Cancelled"),
    ]
    
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique invoice number"
    )
    store = models.ForeignKey(
        StoreProfile,
        on_delete=models.CASCADE,
        related_name="store_invoices",
        null=True,
        blank=True,
        help_text="Store for which the invoice is created"
    )
    transfer = models.ForeignKey(
        Transfer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
        help_text="Associated transfer (if created from transfer)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
        help_text="Current status of the invoice"
    )
    issue_date = models.DateField(
        auto_now_add=True,
        help_text="Date when invoice was issued"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Due date for payment"
    )
    subtotal = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        default=0.00,
        help_text="Subtotal before charges and taxes"
    )
    total_charges = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        default=0.00,
        help_text="Total of all additional charges"
    )
    total_amount = models.DecimalField(
        max_digits=21,
        decimal_places=2,
        default=0.00,
        help_text="Total amount including all charges"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes for the invoice"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_invoices",
        help_text="User who created the invoice"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        customer_name = self.store.customer.username if self.store and self.store.customer else "Unknown Customer"
        return f"Invoice {self.invoice_number} - {customer_name}"
    
    def save(self, *args, **kwargs):
        # Log entry into save method
        print("Entering save method for invoice %s (pk=%s, status=%s)", 
                     self.invoice_number or "new", self.pk, self.status)

        # Check if this is an existing instance by checking pk
        is_new = self.pk is None
        previous_status = None

        if not is_new:
            try:
                # Get previous state from database
                previous = Invoice.objects.get(pk=self.pk)
                previous_status = previous.status
                print("Previous status for invoice %s: %s", 
                             self.invoice_number, previous_status)
            except Invoice.DoesNotExist:
                print("Previous instance not found for invoice %s", 
                               self.invoice_number)

        # Generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
            print("Generated invoice number: %s", self.invoice_number)

        # Save the instance first to assign a primary key
        super().save(*args, **kwargs)
        
        # Calculate totals after saving
        self.calculate_totals()

        # Handle cash drawer entry if status changed to PAID
        if not is_new and previous_status != 'PAID' and self.status == 'PAID':
            try:
                # Find an open cash drawer
                open_drawer = CashDrawer.objects.filter(status='open').first()
                if not open_drawer:
                    print("No open cash drawer found for invoice %s, creating new", 
                                   self.invoice_number)
                    # Use invoice's created_by or fallback to a default user
                    drawer_user = self.created_by
                    if not drawer_user:
                        print("No created_by user for invoice %s, using system user", 
                                       self.invoice_number)
                        drawer_user = User.objects.filter(is_superuser=True).first()
                        if not drawer_user:
                            print("No system user found to open cash drawer for invoice %s", 
                                         self.invoice_number)
                            return

                    # Create new cash drawer
                    open_drawer = CashDrawer.objects.create(
                        user=drawer_user,
                        status='open',
                        opening_amount=0.00,
                        current_amount=0.00,
                        opened_at=timezone.now()
                    )
                    print("Created new cash drawer #%s for user %s", 
                                open_drawer.id, drawer_user.username)

                # Add sale entry to cash drawer
                amount = Decimal(str(self.total_amount))
                open_drawer.add_entry(
                    entry_type='sale',
                    amount=amount,
                    description=f"Payment for invoice {self.invoice_number}",
                )
                print("Created cash drawer entry for invoice %s: amount=%s", 
                            self.invoice_number, amount)
            except Exception as e:
                print("Failed to create cash drawer entry for invoice %s: %s", 
                             self.invoice_number, str(e))

        # Update totals in the database without calling save again
        if not is_new:
            Invoice.objects.filter(pk=self.pk).update(
                subtotal=self.subtotal,
                total_charges=self.total_charges,
                total_amount=self.total_amount
            )
        
        print("Exiting save method for invoice %s", self.invoice_number)
    
    def generate_invoice_number(self):
        """Generate a unique invoice number"""
        import datetime
        today = datetime.date.today()
        year = today.year
        month = today.month
        
        # Get the last invoice number for this year/month
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=f"INV-{year}{month:02d}"
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            # Extract the sequence number and increment
            try:
                last_sequence = int(last_invoice.invoice_number.split('-')[-1])
                sequence = last_sequence + 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1
        
        return f"INV-{year}{month:02d}-{sequence:04d}"
    
    def calculate_totals(self):
        """Calculate subtotal, charges, and total amount"""
        # Calculate subtotal from invoice items
        subtotal = sum(item.total_price for item in self.items.all())
        self.subtotal = subtotal
        
        # Calculate total charges
        total_charges = sum(charge.amount for charge in self.charges.all())
        self.total_charges = total_charges
        
        # Calculate total amount
        self.total_amount = self.subtotal + self.total_charges
    
    def apply_compulsory_charges(self, base_amount=None):
        """Apply all compulsory charges to this invoice"""
        # Calculate totals first to ensure subtotal is up-to-date
        self.calculate_totals()
        
        compulsory_charges = InvoiceChargeType.objects.filter(
            is_compulsory=True,
            is_active=True
        )
        
        for charge_type in compulsory_charges:
            # Check if this charge type is already applied
            if not self.charges.filter(charge_type=charge_type).exists():
                amount = charge_type.value
                if charge_type.charge_type == "PERCENTAGE":
                    # Use base_amount if provided (for invoice creation), otherwise use subtotal
                    calculation_base = base_amount if base_amount is not None else self.subtotal
                    amount = (calculation_base * charge_type.value) / 100
                
                InvoiceCharge.objects.create(
                    invoice=self,
                    charge_type=charge_type,
                    amount=amount,
                )
        
        # Recalculate totals and update in database without calling save
        self.calculate_totals()
        if self.pk:
            Invoice.objects.filter(pk=self.pk).update(
                subtotal=self.subtotal,
                total_charges=self.total_charges,
                total_amount=self.total_amount
            )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"


class InvoiceItem(models.Model):
    """Model to store individual items in an invoice"""
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Associated invoice"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="invoice_items",
        help_text="Associated inventory item"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Quantity of the item"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Unit price of the item"
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Total price for this item (quantity * unit_price)"
    )
    description = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Additional description for this item"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.inventory_item.inventory.name} x {self.quantity} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Calculate total price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Invoice Item"
        verbose_name_plural = "Invoice Items"


class InvoiceCharge(models.Model):
    """Model to store additional charges applied to invoices"""
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="charges",
        help_text="Associated invoice"
    )
    charge_type = models.ForeignKey(
        InvoiceChargeType,
        on_delete=models.CASCADE,
        related_name="invoice_charges",
        help_text="Type of charge being applied"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount of the charge"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.charge_type.name} - {self.amount} - {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.invoice.calculate_totals()
        if self.invoice.pk:
            Invoice.objects.filter(pk=self.invoice.pk).update(
                subtotal=self.invoice.subtotal,
                total_charges=self.invoice.total_charges,
                total_amount=self.invoice.total_amount
            )

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        super().delete(*args, **kwargs)
        invoice.calculate_totals()
        if invoice.pk:
            Invoice.objects.filter(pk=invoice.pk).update(
                subtotal=invoice.subtotal,
                total_charges=invoice.total_charges,
                total_amount=invoice.total_amount
            )

    class Meta:
        ordering = ['created_at']
        verbose_name = "Invoice Charge"
        verbose_name_plural = "Invoice Charges" 

class PartnerCustomerLink(models.Model):
    """Model to link partners with vending customers"""
    partner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_links",
        limit_choices_to={'role': 'Partner'},
        help_text="Partner user who is linked to the vending customer"
    )
    vending_customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="partner_links",
        limit_choices_to={'role': 'Vending Customer'},
        help_text="Vending customer who is linked to the partner"
    )
    store = models.ForeignKey(
        StoreProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="partner_customer_links",
        help_text="Store associated with this link"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the link was created"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_partner_links",
        help_text="User who created this link"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this link is currently active"
    )

    class Meta:
        unique_together = ['partner', 'vending_customer']
        ordering = ['-created_at']
        verbose_name = "Partner Customer Link"
        verbose_name_plural = "Partner Customer Links"

    def __str__(self):
        return f"{self.partner.username} - {self.vending_customer.username}" 


# ----------------------------------------------------------------------------
# Platform configuration
# ----------------------------------------------------------------------------

class PlatformConfig(models.Model):
    """Singleton-style configuration for platform-wide settings.

    Stores configurable email lists for tracking and maintenance notifications.
    Use comma-separated emails for simplicity; the API will normalize spacing.
    """

    tracking_emails = models.JSONField(
        blank=True,
        default=list,
        help_text="List of tracking/notification recipient emails"
    )
    maintenance_emails = models.JSONField(
        blank=True,
        default=list,
        help_text="List of vehicle maintenance notification emails"
    )
    
    # Email provider configuration (these change between providers)
    email_host = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP server hostname (e.g., smtp.gmail.com, smtp.ovh.com, smtp.godaddy.com)"
    )
    email_port = models.IntegerField(
        default=587,
        help_text="SMTP server port number (587 for TLS, 465 for SSL, 25 for non-TLS)"
    )
    email_host_user = models.EmailField(
        blank=True,
        help_text="SMTP login username/email address (e.g., user@ttincnc.com for Google Workspace)"
    )
    email_host_password = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP password or app password"
    )
    default_from_email = models.EmailField(
        blank=True,
        help_text="Default sender email address (can be alias like contact@ttincnc.com)"
    )
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform Configuration"
        verbose_name_plural = "Platform Configuration"

    def __str__(self):
        return "Platform Configuration"

    @classmethod
    def get_active(cls):
        """Return the single config row, creating if missing."""
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
    
    @classmethod
    def get_email_settings(cls):
        """Get email settings with sensible defaults."""
        config = cls.get_active()
        return {
            'EMAIL_HOST': config.email_host or 'localhost',
            'EMAIL_PORT': config.email_port or 587,
            'EMAIL_HOST_USER': config.email_host_user or '',
            'EMAIL_HOST_PASSWORD': config.email_host_password or '',
            'DEFAULT_FROM_EMAIL': config.default_from_email or config.email_host_user or '',
        }
    
    def save(self, *args, **kwargs):
        """Override save to set default_from_email to email_host_user only if not provided."""
        # Only set default_from_email to email_host_user if it's not already set
        if self.email_host_user and not self.default_from_email:
            self.default_from_email = self.email_host_user
        
        super().save(*args, **kwargs)


# ----------------------------------------------------------------------------
# Preferred Software Options (Global)
# ----------------------------------------------------------------------------

class PreferredSoftwareOptions(models.Model):
    """Singleton-style storage for preferred software selection options.

    Stored as a JSON list of strings. Exposed via a public read-only API so
    registration and other public flows can fetch without authentication.
    """

    options = models.JSONField(
        default=list,
        blank=True,
        help_text="List of preferred software option labels"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Preferred Software Options"
        verbose_name_plural = "Preferred Software Options"

    def __str__(self):
        return "Preferred Software Options"

    @classmethod
    def get_active(cls):
        """Return the single options row, creating with sensible defaults if missing."""
        defaults = {
            "options": [
                "Standup",
                "Fish Table",
                "Frontier",
                "Stampede",
                "Golden Dragon (Kiosk and online only)",
                "Fire Dragon (Online)",
                "Fortune 2 Go (Online)",
                "Fortune",
                "Frontier 2.0",
                "River (Online)",
                "Kiosk (Physical Machine to play online games, Golden Dragon and Magic City Only)",
                "ATM",
            ]
        }
        obj, _ = cls.objects.get_or_create(id=1, defaults=defaults)
        return obj