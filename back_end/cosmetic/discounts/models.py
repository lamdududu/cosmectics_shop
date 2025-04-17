from django.db import models
from datetime import datetime
from products.models import Product

# Create your models here.
class Promotion(models.Model):
    name = models.CharField(max_length=255, null=True)
    start_date = models.DateTimeField(null=False, blank=False)
    end_date = models.DateTimeField(null=False, blank=False)
    
    def __str__(self):
        return self.name
    

class Discount(models.Model):
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, null=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=False)
    percentage = models.DecimalField(blank=False, max_digits=3, decimal_places=2, null=False)

    def __str__(self):
        return self.percentage
    

class Coupon(models.Model):
    code = models.CharField(max_length=255, blank=False, null=False, unique=True)
    start_date = models.DateTimeField(default=datetime.now(), blank=False, null=False)
    end_date = models.DateTimeField(blank=False, null=True)
    percentage = models.DecimalField(decimal_places=2, max_digits=3, null=False, blank=False)
    min_amount = models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)
    max_discount = models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)
    is_stackable = models.BooleanField(null=False, blank=False, default=False)
    usage_count = models.IntegerField(null=True, blank=True)
    usage_limits = models.IntegerField(null=True, blank=True)
    is_hidden = models.BooleanField(null=False, blank=False, default=False)
    description = models.CharField(max_length=255, blank=False, null=False)


class UserCouponHistory(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE)
    used_at = models.DateTimeField(auto_now_add=True)