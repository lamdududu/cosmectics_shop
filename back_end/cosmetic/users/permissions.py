from rest_framework import permissions
from cosmetic.permissions import IsInGroup


class IsManager(IsInGroup):
    group_name = 'Manager'


class StandardUserPermission(permissions.BasePermission):

    def has_permission(self, request, view):

        if not request.user.is_authenticated:
            return False
        
        if request.method == 'GET' and view.action == 'list':
            return IsManager().has_permission(request, view)
        
        
        if request.method == 'POST':
            return True
        
        return True
    

    def has_object_permission(self, request, view, obj):

        if IsManager().has_permission(request, view):
            return True
        
        return obj == request.user
    

class ManagerPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        return IsManager().has_permission(request, view=None)

