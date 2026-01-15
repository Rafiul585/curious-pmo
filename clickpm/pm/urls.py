from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from pm.views.auth_views import (
    register, login, refresh_token, change_password,
    request_password_reset, confirm_password_reset, logout
)
from pm.views.api_root import api_root
from pm.router import urlpatterns as router_urls

urlpatterns = [
    # API Root (public)
    path('', api_root, name='api-root'),
    
    # Authentication endpoints
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/refresh/', refresh_token, name='refresh_token'),
    path('auth/change-password/', change_password, name='change_password'),
    path('auth/password-reset/', request_password_reset, name='request_password_reset'),
    path('auth/password-reset/confirm/', confirm_password_reset, name='confirm_password_reset'),
    path('auth/logout/', logout, name='logout'),
]

# Add router URLs
urlpatterns += router_urls
