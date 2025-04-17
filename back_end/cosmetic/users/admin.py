from django.contrib import admin

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Address

class CustomUserAdmin(UserAdmin):
    model = User
    # Các trường hiển thị trong giao diện admin
    list_display = ['username', 'email', 'first_name', 'last_name', 'phone_number', 'is_staff', 'is_active']
    list_filter = ['is_staff', 'is_active']
    search_fields = ['username', 'email']
    ordering = ['username']

    # Các trường cho phép chỉnh sửa trong giao diện admin
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'email', 'first_name', 'last_name', 'phone_number', 'is_active', 'is_staff')
        }),
    )
    # Tùy chỉnh cách mật khẩu được mã hóa
    def save_model(self, request, obj, form, change):
        if not change:
            obj.set_password(obj.password)  # Đảm bảo mật khẩu được mã hóa khi tạo mới
        obj.save()

# Đăng ký User model với admin
admin.site.register(User, CustomUserAdmin)
admin.site.register(Address)