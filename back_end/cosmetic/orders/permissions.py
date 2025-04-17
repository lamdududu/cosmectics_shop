from cosmetic.permissions import IsCustomer
from rest_framework import permissions


class OrderPermissions(permissions.BasePermission):

    def has_permission(self, request, view):
        
        if not request.user.is_authenticated:
            return False

        if request.method == 'POST':
            return IsCustomer().has_permission(request, view)
        
        return True
    