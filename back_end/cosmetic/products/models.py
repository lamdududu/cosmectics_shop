from django.db import models
from django.utils.timezone import localtime
import datetime

class Brand(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)

    def __str__(self):
        return self.name
    

class Category(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255, blank=False, null=False)
    description = models.TextField(null=True)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, null=False)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=False)
    tags = models.ManyToManyField(Tag, blank=True)
    ingredients = models.ManyToManyField(Ingredient, blank=True)
    status = models.BooleanField(default=True, null=False, blank=False)

    def __str__(self):
        return self.name


class Batch(models.Model):
    batch_number = models.CharField(max_length=100, blank=False, null=False, unique=False)
    origin = models.CharField(max_length=100, blank=False, null=False)
    item_quantity = models.IntegerField(blank=False, null=False)
    manufacturing_date = models.DateField(blank=False, null=False)
    expiry_date = models.DateField(blank=False, null=False)

    def __str__(self):
        return self.batch_number


# Phân loại sản phẩm (dung tích, kích thước,...)
class Variant(models.Model):

    name = models.CharField(max_length=255, blank=False, null=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=False)

    def __str__(self):
        return self.name


class BatchVariant(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, null=False)
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, null=False)
    stock = models.IntegerField(blank=False, null=False)

    # class Meta:
        # Đảm bảo mỗi cặp batch-variant là duy nhất
        # unique_together = ('batch', 'variant')


class Image(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=False)
    image_file = models.ImageField(upload_to='products', max_length=255)

    def __str__(self):
        return self.name


class Price(models.Model):

    price = models.DecimalField(max_digits=10, decimal_places=2, blank=False, null=False)
    start_date = models.DateTimeField(blank=False, null=False, default=datetime.datetime.now())
    end_date = models.DateTimeField(blank=True, null=True)
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, null=False)

    def __str__(self):
        return super().__str__()