from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericRelation
from django.utils import timezone
from commonapp.models import InventoryItem, Inventory, InventoryCategory

User = get_user_model()


class AssemblyTicket(models.Model):
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
    assigned_to = models.ManyToManyField(User, related_name="assigned_assembly_tickets")
    assigned_by = models.ForeignKey(
        User,
        related_name="assembly_ticket_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        User, related_name="created_assembly_tickets", on_delete=models.CASCADE
    )
    items = models.ManyToManyField(InventoryItem, related_name="assembly_tickets", blank=True)
    item_usages = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="JSON field storing item IDs used in the assembly ticket, e.g., {'1': true, '2': true}",
    )
    defective_items = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="JSON field storing defective item IDs, e.g., {'1': true, '2': true}",
    )
    assembled_items = models.JSONField(
        default=list,
        blank=True,
        null=True,
        help_text="List of assembled item dicts for this ticket (name, upc, category, unit_price, serial_number_required, quantity, attributes_list)"
    )
    assembled_item_name = models.CharField(max_length=1000, null=True, blank=True)
    assembled_item_upc = models.CharField(max_length=100, null=True, blank=True)
    assembled_item_category = models.ForeignKey(
        InventoryCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="assembly_tickets"
    )
    assembled_item_unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    assembled_item_serial_number_required = models.BooleanField(default=False)
    assembled_item_attributes = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Attributes for the assembled item (serial_number, mac_address, etc.)",
    )
    assembly_notes = models.TextField(blank=True, null=True, help_text="Main assembly notes for the ticket")
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    flagged = models.BooleanField(default=False)
    attachments = GenericRelation("commonapp.Attachment")

    def __str__(self):
        return f"{self.title} ({self.created_by.username if self.created_by else 'Unknown'})"

    class Meta:
        ordering = ["title"]


class AssemblyNotes(models.Model):
    STATUS_CHOICES = [
        ("Technician", "Technician"),
        ("Manager", "Manager"),
    ]

    assembly_ticket = models.ForeignKey(AssemblyTicket, on_delete=models.CASCADE, related_name="notes")
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_by = models.ForeignKey(
        User,
        related_name="created_assembly_notes",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note for Assembly Ticket #{self.assembly_ticket.id if self.assembly_ticket else 'Unknown'} - {self.status}"

    class Meta:
        ordering = ["-created_at"]
