from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, DeliveryFeeViewSet, PaymentMethodViewSet, StatusViewSet, OrderStatusUpdatingViewSet, OrderSearchingViewSet, RevenueView, ListProductView
router = DefaultRouter()

router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'payment_methods', PaymentMethodViewSet, basename='payment_methods')
router.register(r'order_status', StatusViewSet, basename='status')

urlpatterns = [

    # Tính phí vận chuyển
    path('delivery_fee/', DeliveryFeeViewSet.as_view(), name='delivery_fee'),

    # Cập nhật trạng thái đơn hàng
    path('order_status_updating/', OrderStatusUpdatingViewSet.as_view(), name='order_status_updating'),

    # Tìm kiếm đơn hàng
    path('searching/', OrderSearchingViewSet.as_view(), name='order_searching'),

    # Doanh thu
    path('revenue/', RevenueView.as_view(), name='revenue'),


    path('list_products/', ListProductView.as_view(), name="list_product")

] + router.urls
