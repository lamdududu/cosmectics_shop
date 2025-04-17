from django.db import models
from django.core.validators import RegexValidator
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    phone_number = models.CharField(
        max_length=10, 
        unique=True,
        blank=False, 
        null=False,
        validators=[RegexValidator(r'^\d{10}$', 'Enter exactly 10 digits')]
    )
    email = models.EmailField(max_length=255, unique=True, blank=False, null=False)

    def __str__(self):
        return self.username


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False)
    name = models.CharField(max_length=255, blank=False, null=False)
    phone_number = models.CharField(
        max_length=10, 
        blank=False, 
        null=False,
        validators=[RegexValidator(r'^\d{10}$', 'Enter exactly 10 digits')]
    )
    email = models.EmailField(max_length=255, blank=True, null=True)
    province = models.CharField(max_length=100, blank=False, null=False)
    district = models.CharField(max_length=100, blank=False, null=False)
    ward = models.CharField(max_length=100, blank=False, null=False)
    detail_address = models.CharField(max_length=500, blank=True, null=True)
    is_primary = models.BooleanField(default=False, null=False, blank=False)

    def __str__(self):
        return self.name
    
    def get_full_address(self):
        return f"{self.province}, {self.district}, {self.ward}, {self.detail_address}"
    
