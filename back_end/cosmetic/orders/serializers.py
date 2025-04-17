from datetime import datetime
from django.utils.timezone import now, make_aware
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from .models import PaymentMethod, Status, Order, OrderItem, OrderStatus, OrderAddress
from products.serializers import VariantSerializer
from products.models import Variant, Price
from discounts.models import Coupon, UserCouponHistory, Discount
from discounts.serializers import CouponSerializer
from users.models import User
from users.serializers import UserSerializer


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'

    def validate_name(self, name):
        if not name:
            raise ValidationError("Name is required")
        if PaymentMethod.objects.filter(name__iexact=name).exists():
            raise ValidationError("Payment method with this name already exists")
        return name
    

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = '__all__'

    def validate_name(self, name):
        if not name:
            raise ValidationError("Name is required")
        if Status.objects.filter(name__iexact=name).exists():
            raise ValidationError("Status with this name already exists")
        return name
    

class OrderAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderAddress
        fields = '__all__'
    
    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError("Name is required.")
        
        return value
    
    def validate_phone_number(self, value):
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        
        if len(value) != 10:
            raise serializers.ValidationError("Phone number must be 10 digits long.")
        
        if not (value.isdigit() or (value.startswith('+') and value[1:].isdigit())):
            raise serializers.ValidationError("Phone number must contain only digits.")
        
        return value
    

    def validate_province(self, value):
        if not value:
            raise serializers.ValidationError("Province is required.")
        
        return value

    def validate_district(self, value):
        if not value:
            raise serializers.ValidationError("District is required.")
        
        return value

    def validate_ward(self, value):    
        if not value:
            raise serializers.ValidationError("Ward is required.")
        
        return value


class OrderItemSerializer(serializers.ModelSerializer):

    variant_id = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.all(), source="variant", write_only=True, required=True)
    variant = VariantSerializer(read_only=True)

    price = serializers.SerializerMethodField(read_only=True)

    image = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'variant', 'variant_id', 'quantity', 'price', 'image']

    def get_image(self, obj):
        if obj.variant.product.image_set.exists():
            return obj.variant.product.image_set.first().image_file.url
        
        else:
            return None
            

    def validate_quantity(self, value):
        if not value:
            raise ValidationError("Quantity is required")
        
        if value < 1:
            raise ValidationError("Quantity must be at least 1")
        
        return value
    
    def get_price(self, obj):
        
        if not obj.variant or not obj.order:
            return None 
        
        discount = Discount.objects.filter(
            product_id=obj.variant.product,
            promotion__start_date__lte=obj.order.order_date,
            promotion__end_date__gte=obj.order.order_date
        ).order_by('-percentage').first()

        price = Price.objects.filter(
            variant=obj.variant,
            start_date__lte=obj.order.order_date,
        ).filter(
            Q(end_date__gte=obj.order.order_date) | Q(end_date__isnull=True)
        ).order_by('end_date').first()

        if not price:
            return None
        
        last_price = price.price if not discount else {
            'price': price.price,
            'sale_price': price.price * (1 - discount.percentage),
            'discount': discount.percentage if discount else 0
        }

        return last_price if last_price else None

class OrderStatusSerializer(serializers.ModelSerializer):
    # order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all(), write_only=True, required=True)

    # Giữ nguyên id truyền vào để không bị ánh xạ thành object (cách dùng PrimaryKeyRelatedField)
    # Vì được lồng vào OrderSerializer, nếu ánh xạ sẽ bị lỗi khi create object (tự động chuyển id sang object)
    status_id = serializers.IntegerField(write_only=True)

    status = StatusSerializer(read_only=True)

    class Meta:
        model = OrderStatus
        fields = ['id','status', 'status_id', 'updated_at']
        # extra_kwargs = {
        #     'updated_at': {'read_only': True}
        # }



class OrderSerializer(serializers.ModelSerializer):

    address_id = serializers.PrimaryKeyRelatedField(queryset=OrderAddress.objects.all(), source="address", write_only=True, required=True)
    payment_method_id = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all(), source="payment_method", write_only=True, required=True)
    coupon_ids = serializers.PrimaryKeyRelatedField(queryset=Coupon.objects.all(), source="coupons", many=True, write_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="user", write_only=True, required=True)

    user = UserSerializer(read_only=True)
    address = OrderAddressSerializer(read_only=True)
    payment_method = PaymentMethodSerializer(read_only=True)
    coupons = CouponSerializer(many=True, read_only=True)
    
    order_items = OrderItemSerializer(many=True)
    order_status = OrderStatusSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'address', 'payment_method', 'coupons', 'order_date',
            'delivery_fee', 'total_amount', 'is_paid', 'order_items', 'order_status',
            'address_id', 'payment_method_id', 'coupon_ids', 'user_id'
        ]
    
    def validate_total_amount(self, amount):
        if not amount:
            raise ValidationError("Total amount is required")
            
        if amount < 0:
            raise ValidationError("Total amount must be non-negative")
        
        return amount

    def create(self, validated_data):
        order_item_data = validated_data.pop('order_items')
        order_status_data = validated_data.pop('order_status')
        coupons = validated_data.pop('coupons')

        print("order_status:", order_status_data)

        try:
            with transaction.atomic():
                # Tạo đơn hàng với dữ liệu đã xác thực
                order = Order.objects.create(**validated_data)

                if coupons is not None:
                    # Thêm coupon vào đơn hàng
                    order.coupons.set(coupons)
                
                # Chuẩn bị danh sách sản phẩm
                if not order_item_data:
                    raise ValidationError("Order items are required")
                
                order_items = [OrderItem(order=order, **item) for item in order_item_data]

                # Thêm sản phẩm vào đơn hàng (bulk_create => thêm hàng loạt trong 1 câu lệnh INSERT duy nhẩ)
                OrderItem.objects.bulk_create(order_items)

                # Đặt trạng thái ban đầu cho đơn hàng
                order_status = OrderStatus.objects.create(order=order, status_id=1, updated_at=make_aware(datetime.now()))

            return order
        
        except Exception as e:
            raise ValidationError("Error occurred while creating order: %s" % str(e))
