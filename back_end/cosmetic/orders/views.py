import json
import os
import requests
from collections import defaultdict, OrderedDict
from datetime import datetime, timedelta
from django.utils.timezone import now
from decouple import config
from django.utils.timezone import make_aware
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models.expressions import Func, Value
from django.db import transaction
from django.db.models import Q, OuterRef, JSONField, F, Subquery, Sum
from django.db.models.functions import ExtractWeek, ExtractYear, ExtractDay, ExtractMonth
from rest_framework.decorators import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import PaymentMethod, Status, Order, OrderItem, OrderStatus, OrderAddress
from .serializers import PaymentMethodSerializer
from .serializers import StatusSerializer, OrderSerializer, OrderAddressSerializer
from .permissions import OrderPermissions
from carts.models import CartItem
from discounts.models import UserCouponHistory, Coupon, Discount
from discounts.serializers import UserCouponHistorySerializer
from products.models import Price, Variant, Image, Product
from products.serializers import BatchVariantSerializer
from users.models import Address
from cosmetic.permissions import IsManager, IsAdmin, StandardActionPermission
from cosmetic.paginations import CustomPagination




class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [StandardActionPermission]
    pagination_class = None


# Tính phí vận chuyển
def get_delivery_fee(province, district, ward, value_of_order):

    token = config('GHN_TOKEN')
    shop_id = int(config('SHOP_ID'))
    from_district_id = int(config('DISTRICT_ID'))
    from_ward_code = config('WARD_CODE')

    province_url = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/province'
    district_url = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/district'
    ward_url = 'https://online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id'

    province_id = None
    district_id = None
    ward_code = None
    service_type = 2        # Mặc định đặt cho hàng nhẹ (vì chưa có quản lý trọng lượng trong DB)

    response = get_address_for_delivery_fee(api=province_url, token=token)

    if not response or not response.get('data'):
        print('Province address not found')
        return {
            'error_type': 'address',
            'error': 'Province address not found'
        }
    
    # lấy province id
    else:
        province_list = response.get('data')
        for prov in province_list:
        
            if prov.get('ProvinceName').casefold() == province.casefold():  # casefold() để so sánh không phân biệt hoa thường
                                                                            # dùng tốt cho unicode hơn lower()
                province_id = prov.get('ProvinceID')
                break

            for name in prov.get('NameExtension'):
                if name.casefold() == province.casefold():
                    province_id = prov.get('ProvinceID')
                    break

            if province_id:
                break

        if not province_id:
            print('ProvinceID not found')
            return False
        
    response = get_address_for_delivery_fee(api=district_url, token=token, param_name='province_id', id=province_id)     

    if not response or not response.get('data'):
        print('District address not found')
        return {
            'error_type': 'address',
            'error': 'District address not found'
        }
    
    # lấy district id
    else:
        district_list = response.get('data')
        for dist in district_list:
            if dist.get('DistrictName').casefold() == district.casefold():
                district_id = dist.get('DistrictID')
                break

            for name in dist.get('NameExtension'):  
                if name.casefold() == district.casefold():
                    district_id = dist.get('DistrictID')
                    break
            
            if district_id:
                break
        
        if not district_id:
            print('DistrictID not found')
            return False
    
    # lấy service type
    response = get_service_type(token=token, shop_id=shop_id, from_district_id=from_district_id, to_district_id=district_id)

    # kiểm tra có dịch vụ giao hàng từ cửa hàng đến địa chỉ được cung cấp hay không
    if not response or not response.get('data'):
        print('Service type not found')
        return {
            'error_type': 'service',
            'error': 'Service type not found'
        }
    
    # hiện tại chưa quản lý trọng lượng (weight trên 1 sản phẩm, không phải dung tích) của sản phẩm
    # nên không cần lấy service type, mặc định dùng service type cho hàng nhẹ
    # else:
    #     service_type_list = response.get('data')
    #     str = 'Hàng nhẹ'
    #     for service in service_type_list:
    #         if service.get('short_name').casefold() == 'Hàng nhẹ':
    #             service_type = service.get('service_type_id')
    #             break

    response = get_address_for_delivery_fee(api=ward_url, token=token, param_name='district_id', id=district_id)

    if not response or not response.get('data'):
        print('Ward address not found')
        return {
            'error_type': 'address',
            'error': 'Ward address not found'
        }
    
    # lấy ward code
    else:
        ward_list = response.get('data')
        for ward_api in ward_list:
            if ward_api.get('WardName').casefold() == ward.casefold():
                ward_code = ward_api.get('WardCode')
                break

            for name in ward_api.get('NameExtension'):
                if name.casefold() == ward.casefold():
                    ward_code = ward_api.get('WardCode')
                    break

            if ward_code:
                break
        
        if not ward_code:
            print('WardCode not found')
            return False
    
    calculate_fee_url = 'https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee'

    headers = {
        'Content-Type': 'application/json',
        'Token': token,
        'ShopId': str(shop_id)
    }

    # vì chưa có chức năng quản lý kích thước và trọng lượng sản phẩm/đơn hàng
    # nên các giá trị length/width/height/weight được đặt mặc định ở đây
    # có thể thay đổi sau này
    # giá trị coupon cũng được đặt mặc định là None (đây là mã giảm giá từ bên phía nhà vận chuyển)
    body = {
        'service_type_id': service_type,
        'from_district_id': from_district_id,
        'from_ward_code': from_ward_code,
        'to_district_id': district_id,
        'to_ward_code': ward_code,
        'insurance_value': int(value_of_order),    # giá trị của đơn hàng (để tính khoản đền bù cho các trường hợp xấu do bên vận chuyển)
        'coupon': None,         # mã giảm giá
        "length": 30,           # đơn vị cm, tối đa 200 cm, là kích thước dài nhất
        "width": 30,            # đơn vị cm, tối đa 200 cm
        "height": 20,           # đơn vị cm, tối đa 200 cm, là kích thước nhỏ nhất
        "weight": 1000,          # đơn vị gram, tối đa 1.600.000 gram
    }

    print(body)

    response = requests.post(calculate_fee_url, json=body, headers=headers)

    print(response.text)

    if response.status_code == 200:
        return response.json()
    else:
        return {
            'error_type': 'fee',
            'error': f'Error occurred while fetching delivery fee: {response.status_code}'
        }


# Lấy mã địa chỉ
def get_address_for_delivery_fee(api, token, param_name=None, id=None):

    headers = {
        'Content-Type': 'application/json',
        'Token': token
    }

    body = { param_name: id } if param_name is not None else {}
        
    try:
        response = requests.post(api, json=body, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            return False
        
    except requests.exceptions.RequestException as e:
        print(f'Error occurred while fetching address: {e}')
        return False


# Lấy dịch vụ giao hàng   
def get_service_type(token, shop_id, from_district_id, to_district_id):

    service_type_url = 'https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/available-services'

    headers = {
        'Token': token,
        'Content-Type': 'application/json'
    }

    body = {
        'shop_id': shop_id,
        'from_district': from_district_id,
        'to_district': to_district_id
    }

    try:
        response = requests.post(service_type_url, json=body, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            return False
    except requests.exceptions.RequestException as e:
        print(f'Error occurred while fetching service type: {e}')
        return False


class DeliveryFeeViewSet(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        address = Address.objects.filter(id=request.data.get('address')).first()
        
        print('address', address.province, address.district, address.ward)

        if not address:
            print('Address not found')
            return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
        
        delivery_fee = get_delivery_fee(
            address.province, address.district, address.ward,
            request.data.get('total_amount')
        )

        if delivery_fee:
            return Response(delivery_fee.get('data'), status=status.HTTP_200_OK)
        
        return Response({'error': 'Cannot get delivery fee'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('user', 'address', 'payment_method').prefetch_related('coupons').order_by('-id')
    serializer_class = OrderSerializer
    permission_classes = [OrderPermissions]
    pagination_class = CustomPagination
    
    def get_queryset(self):

        if IsAdmin().has_permission(self.request, []):
            return super().get_queryset()
        
        return Order.objects.filter(user=self.request.user)
    

    def get_object(self):

        if IsManager().has_permission(self.request, self):
            return get_object_or_404(Order, id=self.kwargs["pk"])
        return get_object_or_404(Order, id=self.kwargs["pk"], user=self.request.user)


    def create(self, request, *args, **kwargs):

        # lấy thông tin đơn đặt hàng
        order_data = request.data.get('order').copy()
        print('Order data:', order_data)

        # lấy danh sách cart items (để xóa khỏi giỏ hàng sau khi đặt hàng thành công)
        cart_items = request.data.get('cart_items')

        order_items = CartItem.objects.filter(id__in=cart_items).values('variant_id', 'quantity')
        
        # lấy instance địa chỉ
        address_data = Address.objects.get(id=request.data.get('address'))

        # tạo địa chỉ nhận hàng
        order_address_data = {
            'name': address_data.name,
            'phone_number': address_data.phone_number,
            'email': address_data.email if address_data.email else None,
            'district': address_data.district,
            'province': address_data.province,
            'ward': address_data.ward,
            'detail_address': address_data.detail_address,
        }

        # tính tổng giá trị sản phẩm trong đơn đặt hàng
        total_amount = calculate_amount(order_items=order_items)
        if not total_amount:
            return Response({'error': 'Total amount cannot be zero'}, status=status.HTTP_400_BAD_REQUEST)
        
        # lấy phí vận chuyển
        delivery_fee = get_delivery_fee(address_data.province, address_data.district, address_data.ward, total_amount)
        if delivery_fee.get('error') is not None:
            return Response(delivery_fee.get('error'), status=status.HTTP_400_BAD_REQUEST)
        
        print('Delivery fee:', delivery_fee)

        # tính thành tiền cuối cùng
        total_amount = calculate_final_amount(
            total_amount=total_amount,
            delivery_fee=float(delivery_fee.get('data').get('total')),
            coupons=order_data.get('coupon_ids'),
            user=request.user.id
        )

        # thêm các trường còn thiếu vào order_data
        order_data['total_amount'] = total_amount
        order_data['delivery_fee'] = delivery_fee.get('data').get('total')
        order_data['user_id'] = request.user.id
        order_data['order_date'] = make_aware(datetime.now())
        order_data['order_items'] = list(order_items)

        if order_data['payment_method_id'] == 1:
            order_data['is_paid'] = False
        else:
            order_data['is_paid'] = True

        # Đặt trạng thái ban đầu cho đơn hàng
        order_data['order_status'] = [
            {
                'status_id': 1,
                'updated_at': make_aware(datetime.now())
            }
        ]

        print('order_address_data: ', order_address_data)

        if not address_data:
            return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():

                # tạo địa chỉ giao hàng
                address_serializer = OrderAddressSerializer(data=order_address_data)            
                if not address_serializer.is_valid():
                    print('Address serializer not valid', address_serializer.errors)
                    raise serializers.ValidationError({'error': 'Address not valid'})
                
                try:
                    address = address_serializer.save()
                except Exception as e:
                    print('Error occurred while saving address: ', e)
                    raise serializers.ValidationError({'error': 'Error occurred while saving address'})

                # tạo đơn hàng
                order_data['address_id'] = address.id

                print('Order data last:', order_data)

                order_serializer = OrderSerializer(data=order_data)
                if not order_serializer.is_valid():
                    print('Order serializer not valid', order_serializer.errors)
                    raise serializers.ValidationError({'error': 'Order not valid'})
                
                try:
                    order = order_serializer.save()
                except Exception as e:
                    print('Error occurred while saving order: ', e)
                    raise serializers.ValidationError({'error': 'Error occurred while saving order'})


                try:
                    coupons = order_data.get('coupon_ids', []).copy()
                    
                    if coupons:
                  
                        used_coupons = [{'user': request.user.id, 'coupon': coupon} for coupon in coupons]

                        coupon_history_serializer = UserCouponHistorySerializer(data=used_coupons, many=True)
                        
                        if not coupon_history_serializer.is_valid():
                            print('Coupon history serializer not valid', coupon_history_serializer.errors)
                            raise serializers.ValidationError({'error': 'Coupon history serializer not valid'})

                        coupon_history_serializer.save()

                        for coupon in used_coupons:
                            coupon = Coupon.objects.get(id=coupon['coupon'])

                            if coupon.usage_limits is not None:
                                if coupon.usage_count is None:
                                    coupon.usage_count = 1

                                else:
                                    coupon.usage_count += 1

                                coupon.save()
                    

                except Exception as e:
                    print('Error occurred while saving coupon history: ', e)
                    raise serializers.ValidationError({'error': 'Error occurred while saving coupon history'})


                try:
                    order_items = order_data.get('order_items', []).copy()

                    if not order_items:
                        print('No order items')
                        raise serializers.ValidationError({'error': 'No order items'})

                    # variant_ids = [item['variant_id'] for item in order_items]
                    # variants = Variant.objects.filter(id__in=variant_ids) 

                    # stock_serializers = BatchVariantSerializer()

                    for item in order_items:
                        # variant = variants.get(id=item['variant_id'])
                        batch_variant_stock = BatchVariantSerializer.get_nearest_expiry_batch(item['variant_id'])
                        
                        # nếu không có batch được tìm thấy, lỗi
                        if not batch_variant_stock:
                            print('Stock not available for variant')
                            raise serializers.ValidationError({'error': 'No stock available for variant'})

                        # Cập nhật lại số lượng tồn kho
                        while batch_variant_stock and item['quantity'] > 0:

                            # nếu số lượng tồn trong batch hiện tại nhỏ hơn quantity thì đặt = 0
                            if batch_variant_stock.stock < item['quantity']:
                                item['quantity'] -= batch_variant_stock.stock
                                batch_variant_stock.stock = 0
                            
                            # nếu số lượng tồn trong batch hiện tại lớn quantity thì stock -= quantity
                            else:
                                batch_variant_stock.stock -= item['quantity']
                                item['quantity'] = 0

                            batch_variant_stock.save()

                            # nếu quantity chưa xử lý hết thì tiếp tục gọi batch có exp gần nhất và lặp lại vòng lặp
                            if item['quantity'] > 0:
                                batch_variant_stock = BatchVariantSerializer.get_oldest_batch(item['variant_id'])
                        
                                if not batch_variant_stock:
                                    print('Stock not available for variant')
                                    raise serializers.ValidationError({'error': 'No stock available for variant'})
                    
                except Exception as e:
                    print('Error occurred while updating variant stock: ', e)
                    raise serializers.ValidationError({'error': 'Error occurred while updating variant stock'})


                # xóa các sản phẩm đã đặt ra khỏi giỏ hàng
                try:
                    if cart_items:

                        deleted_count, _ = CartItem.objects.filter(id__in=cart_items).delete()
                        print('Deleted', deleted_count, 'cart items')

                except Exception as e:
                    print('Error occurred while deleting order items: ', e)
                    raise serializers.ValidationError({'error': 'Error occurred while deleting order items'})

            return Response({
                'order': order.id
            }, status=status.HTTP_201_CREATED) 

        except Exception as e:
            print('Error occurred while getting order: ', e)
            return Response({'error': 'Error occurred while getting order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# Tính thành tiền cho order
def calculate_amount(order_items):
    total_amount = 0
    
    today = make_aware(datetime.now())

    # Tính tổng tiền ban đầu (tổng giá trị các sản phẩm)
    if not order_items:
        print("No order items")
        return False

    for item in order_items:

        # lấy sản phẩm để kiểm tra giảm giá
        product_id = Variant.objects.filter(
            id=item.get('variant_id')
            ).values_list('product_id', flat=True).first()          # lấy 1 giá trị product_id duy nhất

        discount = Discount.objects.filter(
            product_id=product_id,
            promotion__start_date__lte=today,
            promotion__end_date__gte=today
        ).order_by('-percentage').first()

        price = 0
        price_data = Price.objects.filter(
            variant_id = item.get('variant_id'),
            start_date__lte = today,
        ).filter(
            Q(end_date__gt = today) | Q(end_date__isnull = True)
        ).first()

        if not price_data:
            print("No price found for variant", item.get('variant_id'))
            return False
        
        if discount:
            price = price_data.price - price_data.price * discount.percentage
        else:
            price = price_data.price

        total_amount += price * item.get('quantity')

    print('Total amount (order_items): ', total_amount)

    return float(total_amount)
    

def calculate_final_amount(total_amount, delivery_fee, coupons, user):
    final_amount = total_amount
    today = make_aware(datetime.now())

    # Tính giá trị giảm giá và tổng tiền sau giảm giá
    if not coupons:
        final_amount = total_amount
    else:
        discount_amount = 0
        index = 0

        for coupon in coupons:
            try:
                cp = Coupon.objects.get(id=coupon)
            except ObjectDoesNotExist:
                print("Coupon not found", coupon)
                return False
            
            if check_used_coupon_history(coupon, user):
                print("Coupon has been used", coupon)
                return False
            
            if cp.usage_limits is not None and cp.usage_count == cp.usage_limits:
                print("Coupon has reached its usage limit", coupon)
                return False

            if cp.start_date <= today and (not cp.end_date or cp.end_date >= today) and (cp.min_amount is None or cp.min_amount <= total_amount):
                discount = total_amount * float(cp.percentage)

                if cp.max_discount is not None and discount > cp.max_discount:
                    discount_amount += float(cp.max_discount)
                else:
                    discount_amount += float(discount)

                index += 1
            
            if not cp.is_stackable and index > 1:
                return False
    
        final_amount -= discount_amount

    print('Final amount (coupon): ', final_amount)

    # Tính tổng tiền đã bao gồm phí giao hàng
    final_amount += delivery_fee

    print('Final amount (fee): ', final_amount)

    return final_amount


# Kiểm tra user đã sử dụng coupon hay chưa
def check_used_coupon_history(coupon, user):

    coupon_history = UserCouponHistory.objects.filter(
        coupon_id = coupon,
        user_id = user,
    ).first()

    if coupon_history:
        return True
    
    return False


class StatusViewSet(viewsets.ModelViewSet):

    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    pagination_class = None
    permission_classes = [StandardActionPermission]


class OrderStatusUpdatingViewSet(APIView):
    
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):

        try:
            order = Order.objects.get(pk=request.data.get('order'))
            new_status = Status.objects.get(pk=request.data.get('status'))

            if not order or not new_status:
                print('Missing order_id or status_id')
                return Response({'error': 'Missing order_id or status_id'}, status=status.HTTP_400_BAD_REQUEST)
            
            order_status = OrderStatus.objects.create(order=order, status=new_status, updated_at=make_aware(datetime.now()))

            print(order_status)

            if order_status.status.id == 5:
                order.is_paid = True
                order.save()
            
            return Response({
                'updated_at': order_status.updated_at
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print('Error occurred while getting updating: ', e)
            return Response({'error': 'Error occurred while getting order_id or status_id'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class OrderSearchingViewSet(APIView):
    
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get(self, request):

        paginator = self.pagination_class()
        order_info = request.GET.get('query')

        if not order_info:
            print('Missing order info')
            return Response({'error': 'Missing order info'}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.groups.name not in IsAdmin.allowed_groups:
            
            orders = Order.objects.filter(
                user=self.request.user,
            ).filter(
                Q(status__name__icontains=order_info) |
                Q(payment_method__name__icontains=order_info)
            ).distinct()

            serializers = OrderSerializer(data=orders, many=True)

            paginated_orders = paginator.paginate_queryset(serializers)

            return paginator.get_paginated_response(paginated_orders)
        
        else:

            orders = Order.objects.filter(
                Q(status__name=order_info) |
                Q(payment_method__name=order_info) |
                Q(user__username__icontains=order_info)
            ).distinct()

            serializers = OrderSerializer(data=orders, many=True)

            paginated_orders = paginator.paginate_queryset(serializers)

            return paginator.get_paginated_response(paginated_orders)
    


class RevenueView(APIView):

    permission_classes = [IsAdmin]

    def get(self, request):
        
        param = request.GET.get('query')

        if not param:
            print('Missing query parameter')
            return Response({'error': 'Missing query parameter'}, status=status.HTTP_400_BAD_REQUEST)
        
        today = make_aware(datetime.now())

        order_list = None

        if param == 'week':
            week = today - timedelta(days=7)

            order_list = Order.objects.filter(
                order_date__gte=week
            ).annotate(
                group=ExtractDay('order_date')
            ).order_by('group')

        
        if param == 'month':
            if not request.GET.get('year'):
                order_list = Order.objects.filter(
                    order_date__year=today.year,
                ).annotate(
                    group=ExtractMonth('order_date')
                ).order_by('group')

            else:
                year = int(request.GET.get('year')) if request.GET.get('year') else today.year
                order_list = Order.objects.filter(
                    order_date__year=today.year,
                ).annotate(
                    group=ExtractMonth('order_date')
                ).order_by('group')

        if param == 'year':

            order_list = Order.objects.all().annotate(
                group=ExtractYear('order_date')
            ).order_by('group')

        if param == 'date':
            if not request.GET.get('month'):
                order_list = Order.objects.filter(
                    order_date__year=today.year,
                    order_date__month=today.month,
                ).annotate(
                    group=ExtractDay('order_date')
                ).order_by('group')

            else:
                month = int(request.GET.get('month')) if request.GET.get('month') else today.month
                order_list = Order.objects.filter(
                    order_date__year=today.year,
                    order_date__month=month,
                ).annotate(
                    group=ExtractDay('order_date')
                ).order_by('group')


        # Nhóm các đơn hàng theo tuần
        group_orders = defaultdict(list)
        for order in order_list:
            group_orders[order.group].append(order)

        print("weeky: ", group_orders)

        # Tính tổng tiền cho từng tuần 
        group_revenue = {}
        for group, orders in group_orders.items():
            total_amount = self.calculate_revenue(orders)  # Truyền danh sách đơn hàng
            group_revenue[group] = total_amount

        return Response(group_revenue, status=status.HTTP_200_OK)

    def calculate_revenue(self, orders):
        total_amount = 0
        for order in orders:
            total_amount = total_amount + order.total_amount - order.delivery_fee
        return total_amount
    



class ListProductView(APIView):
   
    def get(self, request):
        
        query = request.GET.get('query')

        if not query:
            return Response('No query', status=status.HTTP_400_BAD_REQUEST)


        today = make_aware(datetime.now())

        # Subquery lấy giá thấp nhất của sản phẩm
        min_price_subquery = Price.objects.filter(
            variant__product=OuterRef('id'),
            start_date__lte=today
        ).filter(
            Q(end_date__gt=today) | Q(end_date__isnull=True)
        ).order_by('price').values('price')[:1]  # Lấy giá thấp nhất

        # Subquery lấy giảm giá cao nhất của sản phẩm
        max_discount_subquery = Discount.objects.filter(
            product=OuterRef('id'),
            promotion__start_date__lte=today,
            promotion__end_date__gte=today
        ).order_by('-percentage').values('percentage')[:1]  # Lấy giảm giá cao nhất

        # Subquery lấy ảnh đầu tiên của sản phẩm
        first_image_subquery = Image.objects.filter(
            product=OuterRef('id')
        ).order_by('id').values('image_file')[:1]  # Lấy ảnh đầu tiên

        if query == 'best_seller':

            # Truy vấn lấy danh sách sản phẩm bán chạy
            bestseller_product_ids = OrderItem.objects.values(
                "variant__product"       # Nhóm theo sản phẩm
                ) .annotate(
                    total_sold=Sum("quantity")      # Tính tổng số lượng đã bán
                ).order_by("-total_sold")[:8].values_list('variant__product', flat=True)  # Sắp xếp giảm dần
            

            # Truy vấn lấy thông tin sản phẩm bán chạy + giá + giảm giá + ảnh
            bestseller_products = Product.objects.filter(
                id__in=bestseller_product_ids, status=True
            ).annotate(
                min_price=Subquery(min_price_subquery),
                discount_percentage=Subquery(max_discount_subquery),
                first_image=Subquery(first_image_subquery)
            ).order_by('-id')  # Giữ thứ tự theo ID sản phẩm

            bestseller_list = []
            for product in bestseller_products:
                min_price = product.min_price
                discount = product.discount_percentage
                sale_price = min_price * (1-discount) if min_price and discount else None

                image_url = request.build_absolute_uri(settings.MEDIA_URL + product.first_image) if product.first_image else None


                bestseller_list.append({
                    'id': product.id,
                    'name': product.name,
                    'price': min_price or 0,
                    'sale_price': sale_price,
                    'discount_percentage': discount,
                    'image': image_url,
                })

            return Response(list(bestseller_list), status=status.HTTP_200_OK)
        

        if query == 'new':

            new_product = Product.objects.filter(
                status=True
            ).annotate(
                min_price=Subquery(min_price_subquery),
                discount_percentage=Subquery(max_discount_subquery),
                first_image=Subquery(first_image_subquery)
            ).order_by('-id')[:8]

            new_list = []
            for product in new_product:
                min_price = product.min_price
                discount = product.discount_percentage
                sale_price = min_price * (1-discount) if min_price and discount else None

                image_url = request.build_absolute_uri(settings.MEDIA_URL + product.first_image) if product.first_image else None


                new_list.append({
                    'id': product.id,
                    'name': product.name,
                    'price': min_price or 0,
                    'sale_price': sale_price,
                    'discount_percentage': discount,
                    'image': image_url,
                })

            return Response(list(new_list), status=status.HTTP_200_OK)
