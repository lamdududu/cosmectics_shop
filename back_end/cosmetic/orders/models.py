from django.db import models
from datetime import datetime
from django.utils.timezone import now
from django.core.validators import RegexValidator

class PaymentMethod(models.Model):
    name = models.CharField(max_length=255, blank=False, null=False)

class Status(models.Model):
    name = models.CharField(max_length=255, blank=False, null=False)

class OrderAddress(models.Model):
    # order = models.ForeignKey(Order, on_delete=models.CASCADE, null=False)
    name = models.CharField(max_length=255, blank=False, null=False)
    phone_number = models.CharField(
        max_length=10, 
        blank=False, 
        null=False,
        validators=[RegexValidator(r'^\d{10}$', 'Enter exactly 10 digits')]
    )
    email = models.EmailField(max_length=255, blank=True, null=True)
    province = models.CharField(max_length=100, blank=False, null=False)
    district = models.CharField(max_length=100, blank=False, null=False)
    ward = models.CharField(max_length=100, blank=False, null=False)
    detail_address = models.CharField(max_length=500, blank=True, null=True)

    def __str__(self):
        return self.name
    
    def get_full_address(self):
        return f"{self.province}, {self.district}, {self.ward}, {self.detail_address}"


class Order(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    address = models.ForeignKey(OrderAddress, on_delete=models.SET_NULL, null=True)
    order_date = models.DateTimeField(null=False, blank=True, default=now)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    is_paid = models.BooleanField(default=False, null=False, blank=False)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    coupons = models.ManyToManyField('discounts.Coupon', blank=True)


class OrderItem(models.Model):

    # đặt related_name để có thể truy xuất từ order_items
    # ví dụ trong OrderSerializer, có thể gọi `order_items = OrderItemSerializer(many=True)`
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=False, related_name='order_items')
    
    variant = models.ForeignKey('products.Variant', on_delete=models.CASCADE, null=False)
    quantity = models.PositiveIntegerField(null=False, blank=False)


class OrderStatus(models.Model):

    # đặt related_name để có thể truy xuất từ order_status
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=False, related_name='order_status')
    
    status = models.ForeignKey(Status, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(null=False, blank=True, default=now)       