from rest_framework.permissions import BasePermission, AllowAny

class IsInGroup(BasePermission):

    group_name = None

    def has_permission(self, request, view):

        if not self.group_name:
            return False

        return request.user.is_authenticated and request.user.groups.filter(name=self.group_name).exists()

class IsCustomer(IsInGroup):
    group_name = 'Customer'


class IsStaff(IsInGroup):
    group_name = 'Staff'


class IsManager(IsInGroup):
    group_name = 'Manager'


class IsInGroups(BasePermission):

    allowed_groups = []

    def has_permission(self, request, view):
        
        return request.user.is_authenticated and request.user.groups.filter(name__in=self.allowed_groups).exists()
    

class IsAdmin(IsInGroups):
    allowed_groups = ['Manager', 'Staff']


class StandardActionPermission(BasePermission):
    def has_permission(self, request, view):

        if view.action in ['list', 'retrieve']:
            return [AllowAny()]             # Cho phép bất kì ai cũng có thể xem danh sách/chi tiết
        else:
            # chỉ Manager hoặc Staff mới có quyền thêm, sửa, xóa
            return IsAdmin().has_permission(request, view)