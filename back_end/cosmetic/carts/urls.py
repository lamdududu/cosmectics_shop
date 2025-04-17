from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartItemViewSet, CartViewSet, UpdatePriceForCartItemViewSet

router = DefaultRouter()

router.register(r'carts ', CartViewSet, basename='carts')
router.register(r'cart_items', CartItemViewSet, basename='cart_items')

urlpatterns = [
    path('update_price_for_cart_item/', UpdatePriceForCartItemViewSet.as_view(), name='update_price_for_cart_item'),
] + router.urls
