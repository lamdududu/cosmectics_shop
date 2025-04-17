from django.db import models
from datetime import datetime
from django.utils.timezone import now, make_aware
from django.core.exceptions import ValidationError
from rest_framework import serializers
from .models import Promotion, Discount, Coupon, UserCouponHistory
from products.models import Product
from products.serializers import ProductSerializer
from users.models import User

class PromotionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Promotion
        fields = '__all__'

    def validate_start_date(self, value):
        if not value:
            raise serializers.ValidationError("Start date is required.")
        
        # if value < make_aware(datetime.now()):
        #     raise serializers.ValidationError("Start date cannot be in the past.")

        return value
    
    def validate_end_date(self, value):
        if not value:
            raise serializers.ValidationError("End date is required.")
        
        # if value < make_aware(datetime.now()):
        #     raise serializers.ValidationError("End date cannot be in the past.")
        
        return value


class DiscountSerializer(serializers.ModelSerializer):

    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product', write_only=True, required=True)
    promotion_id = serializers.PrimaryKeyRelatedField(queryset=Promotion.objects.all(), source='promotion', write_only=True, required=True)

    product = ProductSerializer(read_only=True)
    # promotion = PromotionSerializer(read_only=True)

    class Meta:
        model = Discount
        fields = [
            'id', 'product', 'percentage',
            'product_id', 'promotion_id',
        ]

    def validate_percentage(self, value):
        if not value:
            raise serializers.ValidationError("Percentage is required.")
        
        if value < 0 or value > 1:
            raise serializers.ValidationError("Percentage must be a value between 0 and 1.")
        
        return value


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'


    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if end_date is not None and (start_date and end_date and end_date < start_date):
            raise serializers.ValidationError("End date cannot be before start date")
        

        limits = data.get('usage_limits')
        count = data.get('usage_count', 0)

        if limits is not None and (count > limits):
            raise serializers.ValidationError("Coupon usage limit reached")
        return data


    def validate_code(self, code):
        if not code:
            raise serializers.ValidationError("Code is required")
        # if Coupon.objects.filter(code__iexact=code).exists():
        #     raise serializers.ValidationError("Coupon with this code already exists")
        return code
    
    def validate_start_date(self, date):
        if not date:
            raise serializers.ValidationError("Start date is required")

        return date

    def validate_end_date(self, date):
        if not date:
            return None
        
        if date < make_aware(datetime.now()):
            raise serializers.ValidationError("End date cannot be in the past")
        
        return date

    def validate_percentage(self, percent):
        if not percent:
            raise serializers.ValidationError("Percentage is required")
            
        if percent < 0 or percent > 1:
            raise serializers.ValidationError("Percentage must be between 0 and 100")
        
        return percent
    

    def validate_max_discount(self, value):
   
        if value is not None and value < 0:
            raise serializers.ValidationError("Max discount must be non-negative")
        
        return value
    

    def validate_min_amount(self, value):
        
        if value is not None and value < 0:
            raise serializers.ValidationError("Min amount must be non-negative")
        
        return value
    

    def validate_usage_limit(self, limit):
        
        if limit is not None and limit < 0:
            raise serializers.ValidationError("Usage limit must be non-negative")
        
        return limit
    

    def validate_usage_count(self, count):
        
        if not count:
            count = 0
            
        if count < 0:
            raise serializers.ValidationError("Usage count must be non-negative")

        return count
    


class UserCouponHistorySerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=True)
    coupon = serializers.PrimaryKeyRelatedField(queryset=Coupon.objects.all(), required=True)

    class Meta:
        model = UserCouponHistory
        fields = '__all__'