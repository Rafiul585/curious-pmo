from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_204_NO_CONTENT
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from pm.models.user_models import User
from pm.serializers.user_serializers import UserSerializer
from pm.serializers.auth_serializers import (
    ChangePasswordSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordConfirmSerializer,
    LogoutSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user.
    """
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')

    if not username or not email or not password:
        return Response(
            {'error': 'Username, email, and password are required'},
            status=HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already exists'},
            status=HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
        status=HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login a user and return JWT tokens.
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)

    if not user:
        return Response(
            {'error': 'Invalid credentials'},
            status=HTTP_400_BAD_REQUEST
        )

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
        status=HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh JWT access token.
    """
    refresh = request.data.get('refresh')

    if not refresh:
        return Response(
            {'error': 'Refresh token is required'},
            status=HTTP_400_BAD_REQUEST
        )

    try:
        refresh_token_obj = RefreshToken(refresh)
        return Response(
            {
                'access': str(refresh_token_obj.access_token),
            },
            status=HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': 'Invalid refresh token'},
            status=HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change password for authenticated user.
    """
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.data.get('old_password')):
            return Response(
                {'error': 'Wrong old password'},
                status=HTTP_400_BAD_REQUEST
            )
        
        user.set_password(serializer.data.get('new_password'))
        user.save()
        return Response(
            {'message': 'Password changed successfully'},
            status=HTTP_200_OK
        )
    return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """
    Request password reset email.
    """
    serializer = ResetPasswordRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.data['email']
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Use FRONTEND_URL from settings for the reset link
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )

            return Response(
                {'message': 'Password reset email sent'},
                status=HTTP_200_OK
            )
        except User.DoesNotExist:
            # Don't reveal user existence
            return Response(
                {'message': 'Password reset email sent'},
                status=HTTP_200_OK
            )
    return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    """
    Confirm password reset with token.
    """
    serializer = ResetPasswordConfirmSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.user
        user.set_password(serializer.data['new_password'])
        user.save()
        return Response(
            {'message': 'Password has been reset successfully'},
            status=HTTP_200_OK
        )
    return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout user by blacklisting the refresh token.
    """
    serializer = LogoutSerializer(data=request.data)
    if serializer.is_valid():
        try:
            token = RefreshToken(serializer.data['refresh'])
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully'},
                status=HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return Response(
                {'error': 'Invalid refresh token'},
                status=HTTP_400_BAD_REQUEST
            )
    return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)
