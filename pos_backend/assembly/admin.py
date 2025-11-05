from django.contrib import admin
from .models import *


class AssemblyTicketAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "assigned_by",
        "created_at",
        "assigned_at",
        "completed_at",
        "flagged",
        "assembled_item_name",
    )
    search_fields = [
        "title",
        "assigned_by__email",
        "assembled_item_name",
    ]
    list_filter = ["assigned_by", "created_at", "flagged", "status"]
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


class AssemblyNotesAdmin(admin.ModelAdmin):
    list_display = (
        "assembly_ticket",
        "status",
        "created_by",
        "created_at",
    )
    search_fields = [
        "assembly_ticket__title",
        "created_by__email",
        "description",
    ]
    list_filter = ["status", "created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


admin.site.register(AssemblyTicket, AssemblyTicketAdmin)
admin.site.register(AssemblyNotes, AssemblyNotesAdmin)
