from django.contrib import admin
from .models import *


class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "assigned_by",
        "created_at",
        "assigned_at",
        "completed_at",
        "flagged",
    )
    search_fields = [
        "title",
        "assigned_by__email",
    ]
    list_filter = ["assigned_by", "created_at", "flagged"]
    date_hierarchy = "created_at"
    readonly_fields = (
        "created_at",
        "assigned_at",
        "completed_at",
    )

    def save_model(self, request, obj, form, change):
        if not obj.assigned_by:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)


class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("file", "uploaded_at", "content_type", "object_id")
    search_fields = ["file"]
    list_filter = ["content_type"]


class SliderSlideAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'order', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'description')
    list_editable = ('is_active', 'order')
    ordering = ('order', 'created_at')


@admin.register(InventoryCategory)
class InventoryCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

# Registering models with the admin site
admin.site.register(Ticket, TicketAdmin)
admin.site.register(TicketNotes)
admin.site.register(Inventory)
admin.site.register(Warehouse)
admin.site.register(WarehouseManager)
admin.site.register(Attachment, AttachmentAdmin)
admin.site.register(VendingCustomerLocation)
admin.site.register(SliderSlide, SliderSlideAdmin)
admin.site.register(Reading)
admin.site.register(Notification)
admin.site.register(SupportTicket)
admin.site.register(Vendor)
admin.site.register(InventoryLocation)
admin.site.register(InventoryItem)
admin.site.register(Transfer)
admin.site.register(Repair)
admin.site.register(Reconciliation)
admin.site.register(ReconciliationReport)
admin.site.register(Vehicle)
admin.site.register(VehicleUsage)
admin.site.register(Shift)
admin.site.register(Tutorial)
admin.site.register(Invoice)
admin.site.register(PartnerCustomerLink)
admin.site.register(LocationPermission)
admin.site.register(InvoiceChargeType)
admin.site.register(InvoiceCharge)
admin.site.register(InvoiceItem)

# Platform configuration
@admin.register(PlatformConfig)
class PlatformConfigAdmin(admin.ModelAdmin):
    list_display = ["id", "updated_at", "email_host", "email_host_user", "default_from_email"]
    readonly_fields = ["updated_at"]
    
    fieldsets = (
        ('Email Lists', {
            'fields': ('tracking_emails', 'maintenance_emails'),
            'description': 'Configure email lists for notifications'
        }),
        ('Email Provider Settings', {
            'fields': ('email_host', 'email_port', 'email_host_user', 'email_host_password', 'default_from_email'),
            'description': 'Configure SMTP settings for your email provider (Gmail, OVH, GoDaddy, etc.)'
        }),
    )

# Register any remaining models not yet registered
admin.site.register(Group)
admin.site.register(VehicleMaintenance)
admin.site.register(Vault)
admin.site.register(VaultEntry)

@admin.register(CashDrawer)
class CashDrawerAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'opening_amount', 'current_amount', 'opened_at', 'closed_at']
    list_filter = ['status', 'opened_at', 'closed_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['opened_at', 'closed_at']
    date_hierarchy = 'opened_at'
    
    def has_add_permission(self, request):
        return False  # Cash drawers should only be created through the API


@admin.register(CashEntry)
class CashEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'cash_drawer', 'entry_type', 'amount', 'description', 'store', 'created_by', 'created_at']
    list_filter = ['entry_type', 'created_at', 'store__customer__role']
    search_fields = ['description', 'created_by__username', 'cash_drawer__user__username', 'store__store_name', 'store__customer__username']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Cash entries should only be created through the API



@admin.register(PriceMatrix)
class PriceMatrixAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_amount', 'max_amount', 'tax_percentage', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['min_amount']
    fieldsets = (
        (None, {
            'fields': ('name', 'description')
        }),
        ('Amount Range', {
            'fields': ('min_amount', 'max_amount'),
            'description': 'Set the amount range for this tax bracket. Leave max_amount empty for unlimited.'
        }),
        ('Tax Settings', {
            'fields': ('tax_percentage', 'is_active'),
            'description': 'Set the tax percentage to apply for this amount range.'
        }),
    )

    def has_view_permission(self, request, obj=None):
        # Only allow Admin, Manager, and Warehouse Manager to view
        return request.user.role in ["Admin", "Manager", "Warehouse Manager"]

    def has_add_permission(self, request):
        # Only allow Admin, Manager, and Warehouse Manager to add
        return request.user.role in ["Admin", "Manager", "Warehouse Manager"]

    def has_change_permission(self, request, obj=None):
        # Only allow Admin, Manager, and Warehouse Manager to change
        return request.user.role in ["Admin", "Manager", "Warehouse Manager"]

    def has_delete_permission(self, request, obj=None):
        # Only allow Admin, Manager, and Warehouse Manager to delete
        return request.user.role in ["Admin", "Manager", "Warehouse Manager"]

