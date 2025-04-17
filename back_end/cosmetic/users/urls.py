from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet, AddressViewSet, CheckedUserDataAPIView, CustomTokenObtainPairView
from .views import LogoutView, RegisterView, CreationStaffAccountView, UpdatingStaffAccountView, ChangePasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')     # Dùng basename='user' để tránh xung đột với module 'users'
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    
    # Kiểm tra thông tin tài khoản tồn tại  
    path('check_user_data/', CheckedUserDataAPIView.as_view(), name='check_username'),


    # Đăng nhập (token)
    path('token/', CustomTokenObtainPairView.as_view(), name='token'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Đăng ký
    path('register/', RegisterView.as_view(), name='register'),
    path('create_staff_account/', CreationStaffAccountView.as_view(), name='create_staff_account'),

    # Update tài khoản staff
    path('update_staff_account/<int:pk>/', UpdatingStaffAccountView.as_view(), name='update_staff_account'),

    # Đăng xuất
    path('logout/', LogoutView.as_view(), name='logout'),

    # Thay đổi mật khẩu
    path('change_password/', ChangePasswordView.as_view(), name='change_password'),


] + router.urls

# Đặt riêng router để tránh xung đột urls hoặc lỗi với check-username