from datetime import datetime
from django.utils.timezone import make_aware
from django.conf import settings
from django.db import transaction
from django.db.models import Q, OuterRef, Subquery, Sum, F
from rest_framework.decorators import APIView
from rest_framework.response import Response
from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from products.models import Image, Price
from discounts.models import Discount
from cosmetic.permissions import IsCustomer
from cosmetic.paginations import CustomPagination
from django.db import IntegrityError


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer

    def get_permissions(self):

        if self.action in ['destroy']:
            return [IsAuthenticated()]

        return super().get_permissions()



class CartItemViewSet(viewsets.ModelViewSet):
    
    serializer_class = CartItemSerializer
    pagination_class = CustomPagination


    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]

        if self.action in ['destroy', 'create', 'update', 'partial_update']:
            return [IsCustomer()]
        return super().get_permissions()
    
    # def get_object(self):
    #     return None

    def get_queryset(self):

        today = make_aware(datetime.now())

        price_subquery = Price.objects.filter(
            variant=OuterRef('variant__id'),
            start_date__lte=today
        ).filter(
            Q(end_date__gt=today) | Q(end_date__isnull=True)
        ).values('price')[:1]

        discount_subquery = Discount.objects.filter(
            product=OuterRef('variant__product__id'),
            promotion__start_date__lte=today,
            promotion__end_date__gte=today
        ).order_by('-percentage').values('percentage')[:1]

        image_subquery = Image.objects.filter(
            product=OuterRef('variant__product__id')
        ).order_by('id').values('image_file')[:1]

        return CartItem.objects.select_related(
            'variant__product'
        ).filter(
            cart__user=self.request.user
        ).annotate(
            price=Subquery(price_subquery),
            discount_percentage=Subquery(discount_subquery),
            image=Subquery(image_subquery),
            stock=Sum('variant__batchvariant__stock', filter=Q(variant__batchvariant__stock__gt=0))
        ).order_by(
            '-id'
        )

           # chỉ lấy giỏ hàng của user hiện tại
            # tránh việc user khác có thể truy cập vào giỏ hàng của mình

    def list(self, request, *args, **kwargs):

        # lấy cart id từ user đã đăng nhập
        cart_id = request.user.cart.id 

        if not cart_id:
            return Response([], status=status.HTTP_200_OK)

        try:
            cart_items = self.get_queryset()

            response_data = []

            paginated_items = self.paginate_queryset(cart_items)
            if paginated_items is None:
                return Response([], status=status.HTTP_200_OK)

            for item in paginated_items:
                price = item.price
                discount_percentage = item.discount_percentage
                sale_price = price * (1 - discount_percentage) if discount_percentage else None

                image = request.build_absolute_uri(settings.MEDIA_URL + item.image) if item.image else None

                response_data.append({
                    'id': item.id,
                    'quantity': item.quantity,
                    'variant': {
                        'id': item.variant.id,
                        'name': item.variant.name,
                        'stock': item.stock
                    },
                    'product': {
                        'id': item.variant.product.id,
                        'name': item.variant.product.name
                    },
                    'price': price,
                    'sale_price': sale_price,
                    'discount_percentage': discount_percentage,
                    'image': image
                })

            return self.get_paginated_response(response_data)

        except Exception as e:
            print('Error occurred while getting variants: ', e) 
            return Response({'error': 'Error occurred while getting variants'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

    # gán cart của user hiện tại để tránh bị thay đổi bằng cart_id
    def create(self, request):
        cart = self.request.user.cart

        data = request.data.copy()

        data['cart'] = cart.id

        if cart is None:
            return Response({'error': 'Cart not found'}, status=status.HTTP_404_NOT_FOUND)
        
        cartItem = CartItem.objects.filter(cart=cart, variant=request.data.get('variant_id')).first()

        # trong giỏ hàng đã có item với phân loại này
        if cartItem:

            # cập nhật cart item đã có sẵn
            serializer = self.get_serializer(cartItem, data=data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        # không có item được chọn trong giỏ hàng hiện tại
        else:       
            try:
                with transaction.atomic():
                    # tạo mới cart item

                    print(data)

                    serializer = self.get_serializer(data=data)

                    if not serializer.is_valid():
                        print('Error: ', serializer.errors)
                        raise serializers.ValidationError(serializer.errors)
                    else:
                        serializer.save()
                    
                    data = {
                        'total_items': cart.total_items + 1
                    }

                    print(data)

                    serializer = CartSerializer(instance=cart, data=data, partial=True)
                    if not serializer.is_valid():
                        print('Error: ', serializer.errors)
                        raise serializers.ValidationError(serializer.errors)
                    else:
                        serializer.save()

                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    def destroy(self, request, *args, **kwargs):
        
        try:
            with transaction.atomic():
                instance = self.get_object()

                self.perform_destroy(instance)

                cart = self.request.user.cart

                data = {
                    'total_items': cart.total_items - 1
                }

                serializer = CartSerializer(instance=cart, data=data, partial=True)

                if not serializer.is_valid():
                    print('Error: ', serializer.errors)
                    raise serializers.ValidationError(serializer.errors)
                
                serializer.save()

            return Response({'message': 'delete cart item successfully'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        
class UpdatePriceForCartItemViewSet(APIView):

    def post(self, request):
        variant = request.data.get('variant')

        try:
            today = make_aware(datetime.now())
            
            
            discount_subquery = Discount.objects.filter(
                product=OuterRef('variant__product__id'),
                promotion__start_date__lte=today,
                promotion__end_date__gte=today
            ).order_by('-percentage').values('percentage')[:1]


            price = Price.objects.filter(
                variant=variant,
                start_date__lte=today
            ).filter(
                Q(end_date__gt=today) | Q(end_date__isnull=True)
            ).annotate(
                discount = Subquery(discount_subquery)
            ).values('price', 'discount')[:1]


            if not price:
                return Response({'error': 'Price does not exist'}, status=status.HTTP_404_NOT_FOUND)
            
            if price[0]['discount']:
                price[0]['sale_price'] = price[0]['price'] * (1 - price[0]['discount'])

                return Response({
                    'price': price[0]['price'],
                    'sale_price': price[0]['sale_price'],
                    'discount': price[0]['discount'],
                }, status=status.HTTP_200_OK)

            return Response({'price': price[0]['price']}, status=status.HTTP_200_OK)

        except Price.DoesNotExist:
            return Response({'error': 'Price does not exist'}, status=status.HTTP_404_NOT_FOUND)