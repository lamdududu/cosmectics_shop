
from django.db import models
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Address
from .permissions import IsManager, ManagerPermission
from carts.models import Cart



class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod            # hàm được gọi trực tiếp bởi class TokenObtainPairSerializer mà không cần tạo instance của CustomTokenObtainPairSerializer
    def get_token(cls, user):        # `cls` là tham số đại diện cho class (không phải instance)
        
        # kế thừa token chuẩn (tránh mất `access` và `refresh`)
        token = super().get_token(user)

        token['is_staff'] = user.is_staff

        return token

    def validate(self, attrs):

        username_or_email = attrs.get('username')
        password = attrs.get('password')

        if '@' in username_or_email:
            user = User.objects.filter(email=username_or_email).first()
            print("User: ", user)
        
        else:
            user = User.objects.filter(username=username_or_email).first()
            print("User: ", user)

        # Nếu user không tồn tại hoặc password không đúng, trả về lỗi
        if user is None:
            print("User is not exist")
            raise serializers.ValidationError('No active account found with the given credentials.')


        if not user.check_password(password):
            print("Password is not correct")
            raise serializers.ValidationError('Unable to log in with provided credentials.')

        attrs['username'] = user.username
        data = super().validate(attrs)

        data['user'] = user

        if not user.is_staff:
            data['cart'] = Cart.get_user_cart(user)


        # Cập nhật last_login cho user
        # Thực hiện sau khi xác thực `super().validate` để đảm bảo không cập nhật nếu xác thực thất bại
        try:
            self.user.last_login = now()
            self.user.save()
        except Exception as e:
            raise serializers.ValidationError("Can not update last_login.")

        return data
    

class AddressSerializer(serializers.ModelSerializer):

    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True, required=True)

    class Meta:
        model = Address
        fields = '__all__'

    # def to_representation(self, instance):
    #     rep = super().to_representation(instance)
    #     rep['address'] = instance.get_full_address()
    #     print(f"Address: {rep['address']}")
    #     return rep

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        if not any(char in '!@#$%^&*' for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        return value


class UserSerializer(serializers.ModelSerializer):

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now_add=True)
    
    address = serializers.SerializerMethodField(read_only=True)
    group = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'phone_number', 'first_name', 'last_name', 
                'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login', 'address', 'group',
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': True},
        }

    def get_address(self, obj):
        if hasattr(obj, 'primary_address') and obj.primary_address:
            return AddressSerializer(obj.primary_address[0]).data  # Lấy phần tử đầu tiên
        return None
    
    def get_group(self, obj):
        return obj.groups.first().name if obj.groups.first() else None

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        if not any(char in '!@#$%^&*' for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        return value

    def create(self, validated_data):

        # sử dụng create_user() để đảm bảo mật khẩu được mã hóa
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            phone_number=validated_data['phone_number'],
            first_name=validated_data.get('first_name'),
            last_name=validated_data.get('last_name'),
            password=validated_data['password'],
            is_active = validated_data.get('is_active', True),
            is_staff = validated_data.get('is_staff', False),
            is_superuser = validated_data.get('is_superuser', False),
            date_joined = validated_data.get('date_joined', now()),
        )

        return user

    def update(self, instance, validated_data):

        # Không cho phép thay đổi username và password
        validated_data.pop('username', None)
        validated_data.pop('password', None)

        # instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)

        request = self.context.get('request')
        if request and request.user and ManagerPermission().has_permission(request, None):
            instance.is_active = validated_data.get('is_active', True)
            instance.is_staff = validated_data.get('is_staff', False)
            instance.is_superuser = validated_data.get('is_superuser', False)

        # if 'password' in validated_data:
        #     instance.set_password(validated_data['password'])
        
        instance.save()

        return instance


