from django.shortcuts import render
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, Address
from .serializers import UserSerializer, AddressSerializer, CustomTokenObtainPairSerializer, ChangePasswordSerializer
from .permissions import IsManager, StandardUserPermission, ManagerPermission
from cosmetic.paginations import CustomPagination


# Cấp token (JWT)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):

        # lấy serializer và truyền vào dữ liệu từ request
        serializer = self.get_serializer(data=request.data)

        # kiểm tra xác thực
        if serializer.is_valid():
            tokens = serializer.validated_data         # chứa `access` và `refresh`
            print('tokens', tokens)

            user = tokens.get('user')
            redirect_url = '../admins/product_list.html' if user.is_staff else None
            
            if tokens.get('cart'):
                return Response(
                {
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_staff': user.is_staff,
                        'cart': tokens['cart'],
                    },
                    # 'redirect_url': redirect_url,
                },
                status=status.HTTP_200_OK
            )

            else:
                return Response(
                {
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                    'redirect_url': redirect_url,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_staff': user.is_staff,
                    },
                }, status=status.HTTP_200_OK
                )
        
        else:
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().prefetch_related(
                    Prefetch(
                        'address_set', 
                        queryset=Address.objects.filter(is_primary=True),
                        to_attr='primary_address'    
                    )
                ).order_by('-last_login', '-id')
    serializer_class = UserSerializer
    permission_classes = [StandardUserPermission]
    pagination_class = CustomPagination

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_staff'] 

    # chặn post và delete user
    # ngăn không cho tạo user mới bằng viewset này
    http_method_names = ['get', 'put', 'patch']

    def get_queryset(self):
        user = self.request.user

        if IsManager().has_permission(self.request, self):
            return super().get_queryset()

        return User.objects.filter(id=user.id)
    
    def get_object(self):
        user = self.request.user

        if IsManager().has_permission(self.request, self):
            return super().get_object()
        
        return user
    

    def update(self, request, *args, **kwargs):

        user_instance = request.user
        user_data = request.data.get('user')
 
        address_data = request.data.get('address')
        address_instance = Address.objects.filter(
            user=user_instance.id,
            is_primary=True
        ).first()   

        if not user_instance.is_authenticated:
            return Response({'detail': 'Bạn không có quyền thay đổi thông tin cá nhân của người dùng này'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            with transaction.atomic():
                
                user_serializer = UserSerializer(user_instance, data=user_data, partial=True)
                
                if not user_serializer.is_valid():
                    print('User serializer is not valid: ', user_serializer.errors)
                    raise serializers.ValidationError(user_serializer.errors)   

                user_serializer.save()

                address_serializer = AddressSerializer(address_instance, data=address_data, partial=True)
                
                if not address_serializer.is_valid():
                    print('Address serializer is not valid: ', address_serializer.errors)
                    raise serializers.ValidationError(address_serializer.errors)
                
                address_serializer.save()

            return Response({'success': True}, status=status.HTTP_200_OK)
        
        except Exception as e:
            print("Error occurred while updating user: ", e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class AddressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.all()
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        if IsManager().has_permission(self.request, self):
            return super().get_queryset()
        else:
            return Address.objects.filter(user=self.request.user)

    def get_object(self):
  
        if IsManager().has_permission(self.request, self):
            return get_object_or_404(Address, id=self.kwargs["pk"])
        return get_object_or_404(Address, id=self.kwargs["pk"], user=self.request.user)
    

    def create(self, request, *args, **kwargs):
        
        address = request.data

        if not address.get('user') and not IsManager().has_permission(request, self):
            address['user'] = request.user.id

        print("Data request:", address)

        serializer = self.get_serializer(data=address)

        serializer.is_valid(raise_exception=True)  # Tự động raise lỗi 400 nếu không hợp lệ

        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


    def update(self, request, *args, **kwargs):
        obj = self.get_object()

        address = request.data.copy()

        if not address.get('user') and not IsManager().has_permission(request, self):
            address['user'] = request.user.id

        serializer = self.get_serializer(obj, data=address, partial=True)
        
        serializer.is_valid(raise_exception=True)  # Tự động raise lỗi 400 nếu không hợp lệ
        
        self.perform_update(serializer)

        return Response(serializer.data, status=status.HTTP_200_OK)


# Check dữ liệu đầu vào
class CheckedUserDataAPIView(APIView):
    def post(self, request):

        if request.data.get('username') is not None:

            # Kiểm tra email tồn tại
            if '@' in request.data.get('username'):
                if User.objects.filter(email=request.data.get('username')).exists():
                    return Response({'exists': True}, status=status.HTTP_200_OK)
                else:
                    return Response({'exists': False}, status=status.HTTP_200_OK)

            # Kiểm tra username tồn tại    
            if User.objects.filter(username=request.data.get('username')).exists():
                return Response({'exists': True}, status=status.HTTP_200_OK)
            else:
                return Response({'exists': False}, status=status.HTTP_200_OK)
        

        if request.data.get('email') is not None:
                if User.objects.filter(email=request.data.get('email')).exists():
                    return Response({'exists': True}, status=status.HTTP_200_OK)
                else:
                    return Response({'exists': False}, status=status.HTTP_200_OK)


        # Kiểm tra nhập đúng password     
        if request.data.get('password') is not None and request.user.is_authenticated:
            user = User.objects.get(id=request.user.id)

            if user.check_password(request.data.get('password')):
                return Response({'exists': True}, status=status.HTTP_200_OK)
            
            else:
                return Response({'exists': False}, status=status.HTTP_200_OK)


        # Kiểm tra số điện thoại tồn tại
        if User.objects.filter(phone_number=request.data.get('phone_number')).exists():
            return Response({'exists': True}, status=status.HTTP_200_OK)
        else:
            return Response({'exists': False}, status=status.HTTP_200_OK)
        

# Đăng xuất
class LogoutView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        try:
            refresh_token = request.data.get('refresh')

            if not refresh_token:
                return Response({"error": "Refresh token is missing"}, status=status.HTTP_401_UNAUTHORIZED)

            # blacklist refresh tokens
            try: 
                token = RefreshToken(refresh_token)
                token.blacklist()

            except Exception as e:
                return Response({"error": "Failed to blacklist refresh token"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)   
            
            return Response(status=status.HTTP_205_RESET_CONTENT)
       
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)


# hàm phụ trợ tạo tài khoản
def createUser(request):
    address_data = request.data.get('address')
    user_data = request.data.get('user')
    is_group = user_data.pop('is_group', None)
    
    print('is_group:', is_group)

    if is_group:
        user_data.update({'is_staff': True, 'is_active': True}) 
        # user_data.update({})

    user_serializer = UserSerializer(data=user_data)
    if not user_serializer.is_valid():
        print("User is not valid: ", user_serializer.errors)
        return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

    try:
        with transaction.atomic():
            user = user_serializer.save()

            if is_group:
                try:
                    group = Group.objects.get(id=is_group)
                    user.groups.add(group)
                except Group.DoesNotExist:
                    print("Group does not exist.")
                    raise serializers.ValidationError({'error:': 'Group does not exist'}, status=status.HTTP_400_BAD_REQUEST)
                
            else:
                try:
                    group = Group.objects.filter(name='Customer').first()
                    user.groups.add(group)
                except Group.DoesNotExist:
                    print("Group does not exist.")
                    raise serializers.ValidationError({'error:': 'Group does not exist'}, status=status.HTTP_400_BAD_REQUEST)

            address_data['user'] = user.id
            address_data['is_primary'] = True

            address_serializer = AddressSerializer(data=address_data)
            if not address_serializer.is_valid():
                print("Address is not valid: ", address_serializer.errors)
                raise serializers.ValidationError({'error:': address_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
            address_serializer.save()
        
        return user
    
    except Exception as e:
        print("Error occurred while creating user: ", e)
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        try:

            # Gọi lại hàm hỗ trợ createUser
            user = createUser(request)         
            
            return Response({
                'username': user.username,
            },status=status.HTTP_200_OK)
        
        except Exception as e:
            print("Error occurred while registering user: ", e)
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreationStaffAccountView(APIView):

    permission_classes = [ManagerPermission]

    def post(self, request):
        try:

            # Gọi lại hàm hỗ trợ createUser
            user = createUser(request)         
            
            return Response({
                'id': user.id,
                'username': user.username,
            },status=status.HTTP_200_OK)
        
        except Exception as e:
            print("Error occurred while registering user: ", e)
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdatingStaffAccountView(APIView):
    permission_classes = [ManagerPermission]

    def put(self, request, pk):
        try:
            user = User.objects.get(id=pk)
            user_data = request.data.get('user')
            is_group = user_data.pop('is_group', None)

            print('User data:', user_data)

            user_serializer = UserSerializer(user, data=user_data, partial=True, context={'request': request})
            if not user_serializer.is_valid():
                print("User is not valid: ", user_serializer.errors)
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                user_saved = user_serializer.save()

                if is_group:
                    try:
                        group = Group.objects.get(id=is_group)
                        user.groups.set([group])
                    except Group.DoesNotExist:
                        print("Group does not exist.")
                        raise serializers.ValidationError({'error:': 'Group does not exist'}, status=status.HTTP_400_BAD_REQUEST)

            return Response(UserSerializer(user_saved).data, status=status.HTTP_200_OK)

        except Exception as e:
            print("Error occurred while updating user: ", e)
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        if not user.is_authenticated:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChangePasswordSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        old_password = serializer.validated_data.get('old_password')
        new_password = serializer.validated_data.get('new_password')

        if not user.check_password(old_password):
            return Response({'error': 'Invalid password'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:

            user.set_password(new_password)
            user.save()

            return Response({'message': 'Password has been changed successfully'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("Error occurred while changing password: ", e)
            return Response({'error': 'Error occurred while changing password'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
