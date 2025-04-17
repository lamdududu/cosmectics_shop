from rest_framework import serializers
from django.utils.timezone import make_aware
from django.core.exceptions import ValidationError
from django.db.models.functions import Lower
from django.db import transaction, models
from datetime import datetime, date
import os
from django.conf import settings
import uuid
from .models import Brand, Category, Tag, Batch, Product, Price, Ingredient, Variant, BatchVariant, Image
# from discounts.models import Promotion, Discount

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'

    def validate_name(self, value):

        if not value:
            raise serializers.ValidationError("Brand name is required.")

        if Brand.objects.filter(name__iexact=value).exists():         # `__iexact` để kiểm tra chính xác mà không phân biệt hoa thư��ng
            raise serializers.ValidationError("Brand with the same name already exists.")
        return value


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'    

    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError("Category name is required.")
    
        if Category.objects.filter(name__iexact=value).exists():         # `__iexact` để kiểm tra chính xác mà không phân biệt hoa thư��ng
            raise serializers.ValidationError("Category with the same name already exists.")
        return value

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

    def validate_name(self, value):

        if not value:
            raise serializers.ValidationError("Tag name is required.")

        if Tag.objects.filter(name__iexact=value).exists():         # `__iexact` để kiểm tra chính xác mà không phân biệt hoa thường
            raise serializers.ValidationError("Tag with the same name already exists.")
        return value


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = '__all__'
    
    def validate_name(self, value):

        if not value:
            raise serializers.ValidationError("Ingredient name is required.")

        if Ingredient.objects.filter(name=value).exists():
            raise serializers.ValidationError("Ingredient with the same name already exists.")
        return value
    

class ImageSerializer(serializers.ModelSerializer):

    image_file = serializers.ImageField(use_url=True)

    class Meta:
        model = Image
        fields = '__all__'

    def validate_image_file(self, value):
        image_file = value

        file_extension = os.path.splitext(image_file.name)[1]
        image_file.name = f"{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:4]}{file_extension}"

        if not image_file:
            raise serializers.ValidationError("Image file is required.")

        if len(os.path.join(settings.MEDIA_ROOT, f"products/{image_file.name}")) > 100:
            raise serializers.ValidationError("Image file size is too large.")
        
        print('Image file: ', len(os.path.join(settings.MEDIA_ROOT, f"products/{image_file.name}")), ' - ', os.path.join(settings.MEDIA_ROOT, f"products/{image_file.name}"))

        return image_file

    def update(self, instance, validated_data):

        new_image = validated_data.get('image_file', instance.image_file)

        old_image = instance.image_file
        
        with transaction.atomic():
            try:
                instance.image_file = new_image
                instance.product = validated_data.get('product', instance.product)
                instance.save()

                if old_image:
                    old_image.delete(save=False)

            except Exception:
                print('Error updating image file: ', old_image)
                raise serializers.ValidationError("An error occurred while updating the image file.")

        return instance




class ProductSerializer(serializers.ModelSerializer):

    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    ingredients = IngredientSerializer(many=True, read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True, required=True)
    brand_id = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.all(), source='brand', write_only=True, required=True)
    tag_ids = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), many=True, source='tags', write_only=True, required=True)
    ingredient_ids = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all(), many=True, source='ingredients', write_only=True, required=True)


    description = models.TextField(default=None)

    class Meta:
        model = Product
        fields = ['id', 'name',
                  'brand', 'category', 'ingredients', 'tags', 'description', 'status',
                  'brand_id', 'category_id', 'tag_ids', 'ingredient_ids']
    

    def validate_name(self, value):

        if not value:
            raise serializers.ValidationError("Product name cannot be empty.")

        # Kiểm tra hành động
        request = self.context.get('request')

        # Nếu là 'POST' cần kiểm tra sự tồn tại của name
        if request and request.method == 'POST':
            if Product.objects.filter(name=value).exists():
                raise serializers.ValidationError("Product with the same name already exists.")
        
        return value
    
    def validate_tag_ids(self, value):
        
        if value == []:
            raise serializers.ValidationError("Product must have at least one tag.")
        
        return value
    
    def validate_ingredient_ids(self, value):

        if value == []:
            raise serializers.ValidationError("Product must have at least one ingredient.")
        
        return value

    def create(self, validated_data):

        print("Validated data: ", validated_data)

        brand = validated_data.get('brand')
        category = validated_data.get('category')
        ingredients = validated_data.get('ingredients')
        tags = validated_data.get('tags')
        description = validated_data.get('description', None)
        status = validated_data.get('status')

        # Đảm bảo quá trình post xảy ra trong 1 transaction
        # Nếu có lỗi xảy ra ở create() Product hoặc .set(`many-to-many elements`)
        ## tất cả các thay đổi sẽ bị rollback (không có dữ liệu nào được lưu vào DB)
        try:
            with transaction.atomic():

                product = Product.objects.create(
                    name = validated_data.get('name'),
                    brand = brand,
                    category = category,
                    description = description,
                    status = status,
                )

                if 'ingredients' in validated_data:
                    try:
                        ingredients = validated_data.get('ingredients')
                        product.ingredients.set(ingredients)
                    except Exception:
                        print('Error setting ingredients: ', error)
                        raise serializers.ValidationError("An error occurred while setting ingredients for the product.")
                
                if 'tags' in validated_data:
                    try:
                        tags = validated_data.get('tags')
                        product.tags.set(tags)                                     
                    except Exception:
                        print('Error setting tags: ', error)
                        raise serializers.ValidationError("An error occurred while setting tags for the product.")

            return product
    
        except Exception as error:
            raise serializers.ValidationError("Lỗi tạo mới từ server." + error)

    
    def update(self, instance, validated_data):

        print("Validated data: ", validated_data)

        try:
            with transaction.atomic():
                instance.name = validated_data.get('name', instance.name)     
                instance.description = validated_data.get('description', instance.description)
                instance.brand = validated_data.get('brand', instance.brand)
                instance.category = validated_data.get('category', instance.category)
                instance.status = validated_data.get('status', instance.status)

                if 'ingredients' in validated_data:
                    try:
                        ingredients = validated_data.get('ingredients')
                        instance.ingredients.set(ingredients) 
                    except Exception:
                        print('Error setting ingredients: ', error)
                        raise serializers.ValidationError("An error occurred while setting ingredients for the product.")

                if 'tags' in validated_data:
                    try:
                        tags = validated_data.get('tags')
                        instance.tags.set(tags)
                    except Exception:
                        print('Error setting tags: ', error)
                        raise serializers.ValidationError("An error occurred while setting tags for the product.")
                    
                try:
                    instance.save()
                except Exception as error:
                    print('Error saving product: ', error)
                    raise serializers.ValidationError("An error occurred while saving the product.")

            return instance
            
        except Exception as error:
            raise serializers.ValidationError("Lỗi cập nhật từ server." + error)



class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = '__all__'

    def validate_batch_number(self, value):

        if not value:
            raise serializers.ValidationError("Batch number is required.")
    

        if self.instance:
            if self.instance.batch_number == value:
                return value

        if Batch.objects.filter(batch_number=value).exists():
            print("Batch instance:", self.instance)
            raise serializers.ValidationError("Batch with the same batch number already exists.")
        
        return value
    
    def validate_origin(self, value):

        if not value:
            raise serializers.ValidationError("Origin is required.")
        
        return value
    
    def validate_item_quantity(self, value):

        if not value:
            raise serializers.ValidationError("Item quantity is required.")

        if value < 1:
            print("Item quantity must be a positive integer.")
            raise serializers.ValidationError("Item quantity must be a positive integer.")

        return value

    def validate_manufacturing_date(self, value):
        if value > date.today():
            raise ValidationError("Manufacturing date cannot be in the future.")
        return value
    
    def validate_expiry_date(self, value):
        if value < date.today():
            raise ValidationError("Expiry date cannot be in the past.")
        return value
    
    def update(self, instance, validate_data):
        print("Batch is valid:", validate_data)

        batch_number = validate_data.get('batch_number', instance.batch_number)
        if(batch_number != instance.batch_number):
            validate_data(value=batch_number)
        
        instance.batch_number = validate_data.get('batch_number', instance.batch_number)
        instance.origin = validate_data.get('origin', instance.origin)
        instance.item_quantity = validate_data.get('item_quantity', instance.item_quantity)
        instance.manufacturing_date = validate_data.get('manufacturing_date', instance.manufacturing_date)
        instance.expiry_date = validate_data.get('expiry_date', instance.expiry_date)

        instance.save()
        return instance

class VariantSerializer(serializers.ModelSerializer):
    
    # dùng SerializerMethodField thay vì gọi nested serializer
    # để có thể tùy chỉnh dữ liệu trả về thay vì dùng dữ liệu thô từ ProductSerializer
    product = serializers.SerializerMethodField(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product', write_only=True, required=True)

    class Meta:
        model = Variant
        fields = ['id', 'name', 'product', 'product_id']
    
    def validate_name(self, value):

        if not value:
            raise serializers.ValidationError("Variant name is required.")
        
        return value

    # Cần có hàm này để lấy dữ liệu (get_<field_name>) nếu field là 1 SerializerMethodField
    def get_product(self, obj):
        return {
            'id': obj.product.id,
            'name': obj.product.name
        }    


class PriceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Price
        fields = '__all__'

    def validate_start_date(self, value):
        if not value:
            raise serializers.ValidationError("Start date is required.")
        
        return value
    
    def validate_end_date(self, value):
        if not value:
            raise serializers.ValidationError("End date is required.")
        
        # if value.date() < date.today():
        #     raise serializers.ValidationError("End date cannot be in the past.")
        
        return value
        
    def validate_price(self, value):

        if not value:
            raise serializers.ValidationError("Price is required.")

        if value < 0:
            raise serializers.ValidationError("Price must be a non-negative number.")
        
        return value

class BatchVariantSerializer(serializers.ModelSerializer):

    # variant = VariantSerializer()
    batch = BatchSerializer(read_only=True) #

    batch_id = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all(), write_only=True, source='batch', required=True)

    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.all(), required=True)

    # variant_test = VariantSerializer(read_only=True, source='variant')

    product = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BatchVariant
        fields = ['id', 'batch', 'variant', 'product', 'stock', 'batch_id']

    def get_product(self, obj):
        return obj.variant.product.name
    
    def validate(self, data):
        # request = self.context.get('request')

        # if request and request.method == 'PUT':
        #     instance = self.context.get('instance')
        #     if instance and instance.batch == data.get('batch') and instance.variant == data.get('variant'):
        #         return data

        if self.instance:
            if self.instance.variant == data.get('variant') and self.instance.batch == data.get('batch'):
                return data
        
        if BatchVariant.objects.filter(variant=data.get('variant'), batch=data.get('batch')).exists():
            print("Stock instance: ", self.instance)
            print("Data:", data)
            raise serializers.ValidationError('Variant already exists in this batch')
        
        return data

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock must be a non-negative integer.")

        return value
    
    def create(self, validate_data):
        print("Stock is valid: ", validate_data)

        variant = validate_data.get('variant')
        batch = validate_data.get('batch')
        stock = validate_data.get('stock')

        # request = self.context.request
        # if request and request.method == 'PUT':
        #     if not isinstance(variant, Variant):
        #         variant = Variant.objects.get(id=variant)

        #     if not isinstance(batch, Batch):
        #         batch = Batch.objects.get(id=batch)

        batch = BatchVariant.objects.create(variant=variant, batch=batch, stock=stock)

        return batch

    def update(self, instance, validate_data):
        print("Stock is valid: ", validate_data)

        instance.stock = validate_data.get('stock', instance.stock)

        instance.save()

        return instance


    # lấy lô hàng cận exp nhất
    # dùng khi user thực hiện chức năng đặt hàng và phải trừ đi số lượng còn tồn kho sau khi user đặt hàng thành công
    # theo quy tắc lô hàng có exp gần nhất sẽ phải được bán trước
    @staticmethod
    def get_nearest_expiry_batch(variant):          # @staticmethod không nhận tham số self
                                                    # vì không liên quan đến instance (khi sử dụng gọi trực tiếp trên class)
        try:
            
            batch = BatchVariant.objects.filter(
                variant_id=variant,
                batch__expiry_date__gte=make_aware(datetime.now()),     # lọc lô hàng có exp gần nhất
                stock__gt=0                 # lọc các lô còn hàng tồn kho
            ).order_by('batch__expiry_date').first()

            return batch
        
        except Exception as e:
            print(f"Error fetching nearest expiry batch: {e}")
            return None




class ProductInfoSerializer(serializers.ModelSerializer):

    image = ImageSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    # prices = PriceSerializer(many=True, source='variant_set.price_set', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'variants', 'images'] 



