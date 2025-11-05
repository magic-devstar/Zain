from django.contrib import admin
from custom_user.models import *

admin.site.register(Account)
admin.site.register(StoreProfile)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "ip_address",
        "action",
        "path",
        "status_code",
        "timestamp",
    )  # Fields to display
    list_filter = (
        "user",
        "action",
        "status_code",
        "timestamp",
    )  # Filters to narrow down logs
    search_fields = ("user__username", "action", "path")  # Searchable fields


admin.site.register(AccessLog, AccessLogAdmin)
admin.site.register(UserPreference)
admin.site.register(UserFavorite)