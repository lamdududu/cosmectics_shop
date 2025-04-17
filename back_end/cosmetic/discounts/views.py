from datetime import datetime
from django.utils.timezone import make_aware, now
from django.utils.dateparse import parse_datetime
from django.utils.timezone import make_aware
from django.db import transaction
from django.db.models import Q, F
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from cosmetic.permissions import StandardActionPermission, IsAdmin
from cosmetic.paginations import CustomPagination
from .models import Promotion, Discount, Coupon, UserCouponHistory
from .serializers import PromotionSerializer, DiscountSerializer, CouponSerializer, UserCouponHistorySerializer

# Create your views here.
class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all().order_by('-id')
    serializer_class = PromotionSerializer
    pagination_class = CustomPagination
    permission_classes = [StandardActionPermission]

    def retrieve(self, request, pk=None):

        promotion = self.get_object()
        promotion_serializer = PromotionSerializer(promotion)

        discounts = DiscountSerializer(promotion.discount_set.all(), many=True)

        return Response({
            'promotion': promotion_serializer.data,
            'discounts': discounts.data,
        }, status=status.HTTP_200_OK)

    def create(self, request):
          
        try:      
            promotion_data = request.data.get('promotion')
            promotion_serializer = self.get_serializer(data=promotion_data)
            
            with transaction.atomic():
                
                if not promotion_serializer.is_valid():
                    print('Promotion serializer error:', promotion_serializer.errors)
                    return Response(promotion_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                promotion = promotion_serializer.save()

                discount_data = request.data.get('discounts')
                for discount in discount_data:
                    discount['promotion_id'] = promotion.id
                    discount_serializer = DiscountSerializer(data=discount)
                
                    if not discount_serializer.is_valid():
                        print('Discount serializer error:', discount_serializer.errors)
                        return Response(discount_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                    discount_serializer.save()

            return Response({
                'id': promotion.id,
                'name': promotion.name,
            }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            print('Error occurred during transaction: ', e)
            return Response({'error': 'Error occurred during transaction'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None, *args, **kwargs):
        
        try:
            with transaction.atomic():
                promotion_instance = self.get_object()
                promotion_serializer = self.get_serializer(promotion_instance, data=request.data.get('promotion'))

                if not promotion_serializer.is_valid():
                    print('Promotion serializer error:', promotion_serializer.errors)
                    return Response(promotion_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                promotion = promotion_serializer.save()

                discount_data = request.data.get('discounts')
                for discount in discount_data:

                    discount['promotion_id'] = promotion.id

                    if discount.get('id') is not None:
                        discount_instance = Discount.objects.get(id=discount.get('id'))
                        discount_serializer = DiscountSerializer(discount_instance, data=discount)

                    else:
                        discount_serializer = DiscountSerializer(data=discount)

                    if not discount_serializer.is_valid():
                        print('Discount serializer error:', discount_serializer.errors)
                        return Response(discount_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
                    discount_serializer.save()

            return Response({
                'id': promotion.id,
                'name': promotion.name,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print('Error occurred while getting promotion: ', e)
            return Response({'error': 'Error occurred while getting promotion'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DiscountViewSet(viewsets.ModelViewSet):

    queryset = Discount.objects.all().order_by('-id')
    serializer_class = DiscountSerializer   
    pagination_class = CustomPagination
    permission_classes = [StandardActionPermission]     


class CheckCouponViewSet(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        
        coupon_code = request.data.get('code')

        coupon = Coupon.objects.filter(code__iexact=coupon_code).first()

        if request.user.groups.name not in IsAdmin().allowed_groups:
            is_used = UserCouponHistory.objects.filter(coupon_id=coupon.id, user_id=request.user.id).first() if coupon else None

        if coupon is not None and (not is_used or not is_used.exist()):
            return Response({
                'exists': True, 
                'coupon': CouponSerializer(coupon).data
            }, status=status.HTTP_200_OK)
        
        return Response({'exists': False}, status=status.HTTP_200_OK)
    

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all().order_by('-id')
    serializer_class = CouponSerializer
    pagination_class = CustomPagination

    def get_permissions(self):

        # if not self.action:
        #     return [IsAuthenticated()]

        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        
        if self.action in ['destroy', 'create', 'update', 'partial_update']:
            return [IsAdmin()]

        # return [IsAuthenticated()]

        return super().get_permissions()
    
    def get_queryset(self):

        user = self.request.user

        if user.is_authenticated and user.groups.filter(name__in=IsAdmin().allowed_groups).exists():
            return super().get_queryset()
        
        print('User is authenticated: ', user.is_authenticated)

        if user.is_authenticated:
            coupon_subquery = UserCouponHistory.objects.filter(
                user_id=user.id,
            ).values_list('coupon_id', flat=True)
                                                                            # `flat=True` để trả về danh sách hay vì dict (tăng hiệu suất)
                                                                            # sử dụng khi lấy 1 cột duy nhất và trong `.values_list()` (không `.values`)
        
            print('List coupon: ', coupon_subquery)
            return Coupon.objects.filter(
                        start_date__lte=make_aware(datetime.now()),
                        is_hidden=False,
                    ).filter(
                        (Q(end_date__gte=make_aware(datetime.now())) | Q(end_date__isnull=True))
                        &
                        (Q(usage_limits__isnull=True) | ~Q(usage_limits=F('usage_count')))
                    ).exclude(id__in=coupon_subquery)
    
    def paginate_queryset(self, queryset):
        
        user = self.request.user

        # Nếu user là Anonymous hoặc không phải admin thì không cần phân trang
        if not user.is_authenticated or not user.groups.filter(name__in=IsAdmin().allowed_groups).exists():
            return None  # Không phân trang

        return super().paginate_queryset(queryset)


    def list(self, request, *args, **kwargs):

        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)

        # Nếu không phân trang, trả về toàn bộ danh sách sản phẩm
        if page is None:
            serializers = self.get_serializer(queryset, many=True)
            return Response(serializers.data)

        # Trả về danh sách phân trang
        serializers = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializers.data)