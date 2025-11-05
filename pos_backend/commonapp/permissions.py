from rest_framework import permissions

class IsVendingCustomer(permissions.BasePermission):
    """
    Allow only users with role 'Vending Customer'.
    """

    def has_permission(self, request, view):
        return hasattr(request.user, 'role') and request.user.role == 'Vending Customer'


class IsAdminRole(permissions.BasePermission):
    """Allow only users with role 'Admin'."""

    def has_permission(self, request, view):
        return hasattr(request.user, 'role') and request.user.role == 'Admin'