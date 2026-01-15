from django.db import models
from django.contrib.auth.models import AbstractUser

# Role model
class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

# Custom User model
class User(AbstractUser):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    is_suspended = models.BooleanField(default=False)

    def __str__(self):
        return self.username

