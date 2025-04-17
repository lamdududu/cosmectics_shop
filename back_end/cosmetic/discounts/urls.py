from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CouponViewSet, CheckCouponViewSet, DiscountViewSet, PromotionViewSet


router = DefaultRouter()

router.register(r'promotions', PromotionViewSet, basename='promotions')
router.register(r'discounts', DiscountViewSet, basename='discounts')
router.register(r'coupons', CouponViewSet, basename='coupons')

urlpatterns = [
    path('check_coupons/', CheckCouponViewSet.as_view(), name='check_coupons'),
] + router.urls
