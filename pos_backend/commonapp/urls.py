from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'tickets-review', TicketReviewViewSet, basename='ticket-feedback')
router.register(r'support-tickets', SupportTicketViewSet, basename='support-ticket')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-items')
router.register(r'transfer', TransferViewSet, basename='transfer')
router.register(r'attachments', AttachmentViewSet, basename='attachments')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')

router.register(r'inventory-categories', InventoryCategoryViewSet, basename='inventory-category')
router.register(r'InventorySimple', InventorySimpleViewSet, basename='InventorySimple')

router.register(r'repairs', RepairViewSet, basename='repairs')

router.register(r'reconciliations', ReconciliationViewSet, basename='reconcilation')

router.register(r'customer-dashboard', CustomerDashboardViewSet, basename='customer-dashboard')

router.register(r'technician-dashboard', TechnicianDashboardViewSet, basename='technician-dashboard')

router.register(r'vending-customer-dashboard', VendingCustomerDashboardViewSet, basename='vending-customer-dashboard')
router.register(r'vending-customer-locations', VendingCustomerLocationViewSet, basename='vending-customer-locations')
router.register(r'readings-basic', ReadingBasicViewSet, basename='readings-basic')
router.register(r'readings-attachments', ReadingWithAttachmentsViewSet, basename='reading-attachments')

router.register(r'reporter-dashboard', ReporterDashboardViewSet, basename='reporter-dashboard')

router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'vehicles/(?P<vehicle_id>\d+)/usages', VehicleUsageViewSet, basename='vehicle-usages-per-vehicle')
router.register(r'vehicle-usages', VehicleUsageViewSet, basename='vehicle-usages')
router.register(r'vehicle-maintenance', VehicleMaintenanceViewSet, basename='vehicle-maintenance')

# Platform configuration (admin-only)
router.register(r'platform-config', PlatformConfigViewSet, basename='platform-config')
router.register(r'preferred-software-options', PreferredSoftwareOptionsViewSet, basename='preferred-software-options')

router.register(r'shifts', ShiftViewSet, basename='shift')

router.register(r'tutorials', TutorialViewSet, basename='tutorial')

router.register(r'groups', GroupViewSet, basename='group')

router.register(r'cash-drawers', CashDrawerViewSet, basename='cash-drawer')
router.register(r'cash-entries', CashEntryViewSet, basename='cash-entry')
router.register(r'vault', VaultViewSet, basename='vault')
router.register(r'vault-entries', VaultEntryViewSet, basename='vault-entry')

# Invoice-related URLs
router.register(r'invoice-charge-types', InvoiceChargeTypeViewSet, basename='invoice-charge-type')
router.register(r'price-matrix', PriceMatrixViewSet, basename='price-matrix')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'invoice-items', InvoiceItemViewSet, basename='invoice-item')
router.register(r'invoice-charges', InvoiceChargeViewSet, basename='invoice-charge')
router.register(r'invoice-from-transfer', InvoiceFromTransferViewSet, basename='invoice-from-transfer')

router.register(r"location-permissions", LocationPermissionViewSet, basename="location-permissions")

router.register(r'partner-customer-links', PartnerCustomerLinkViewSet, basename='partner-customer-links')

# Slider slides endpoint
router.register(r'slider-slides', SliderSlideViewSet, basename='slider-slides')

# Global search endpoint
router.register(r'global-search', GlobalSearchViewSet, basename='global-search')

urlpatterns = router.urls
