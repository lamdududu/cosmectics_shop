from rest_framework import serializers
from .models import Cart, CartItem
from products.serializers import VariantSerializer
from products.models import Variant


class CartSerializer(serializers.ModelSerializer):

    class Meta:
        model = Cart
        fields = '__all__'


class CartItemSerializer(serializers.ModelSerializer):


    variant = VariantSerializer(read_only=True)

    variant_id = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.all(), source="variant", write_only=True, required=True)
    cart = serializers.PrimaryKeyRelatedField(queryset=Cart.objects.all(), write_only=True, required=True)

    class Meta:
        model = CartItem
        fields = ['id', 'variant', 'variant_id', 'quantity', 'cart']

