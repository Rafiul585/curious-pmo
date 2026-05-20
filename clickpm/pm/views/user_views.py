from datetime import timedelta, datetime

from django.http import HttpResponse
from django.views.decorators.http import require_GET

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as drf_permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from pm.models.user_models import User
from pm.models.task_models import Task
from pm.serializers.user_serializers import (
    UserSerializer, UserDetailSerializer, UserCreateUpdateSerializer
)
from pm.utils.permission_helpers import has_role_permission


def _build_ical(tasks):
    """Return an iCalendar string for a list of Task objects that have a due_date."""
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CuriousPMO//Task Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:CuriousPMO Tasks',
    ]
    now_str = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    for task in tasks:
        if not task.due_date:
            continue
        dtstart = task.due_date.strftime('%Y%m%d')
        dtend = (task.due_date + timedelta(days=1)).strftime('%Y%m%d')
        summary = (task.title or '').replace('\n', ' ').replace('\r', '').replace(',', '\\,')
        vstatus = 'COMPLETED' if task.status == 'Done' else 'CONFIRMED'
        lines += [
            'BEGIN:VEVENT',
            f'UID:task-{task.id}@curiouspmo',
            f'DTSTAMP:{now_str}',
            f'DTSTART;VALUE=DATE:{dtstart}',
            f'DTEND;VALUE=DATE:{dtend}',
            f'SUMMARY:{summary}',
            f'STATUS:{vstatus}',
            'END:VEVENT',
        ]
    lines.append('END:VCALENDAR')
    return '\r\n'.join(lines) + '\r\n'


@require_GET
def calendar_ics(request):
    """
    GET /api/users/calendar.ics?token={ical_token}
    Returns an iCalendar feed of tasks assigned to the token owner.
    No JWT auth — authenticated by the long-lived ical_token.
    """
    token = request.GET.get('token', '')
    if not token:
        return HttpResponse('Token required', status=400)
    try:
        user = User.objects.get(ical_token=token)
    except User.DoesNotExist:
        return HttpResponse('Invalid token', status=401)

    tasks = Task.objects.filter(
        assignees=user, due_date__isnull=False
    ).select_related().distinct()

    ical_str = _build_ical(tasks)
    return HttpResponse(ical_str, content_type='text/calendar; charset=utf-8')


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'is_suspended', 'role']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()


    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    @action(detail=False, methods=['GET'])
    def me(self, request):
        """
        Get current user information.
        """
        serializer = UserDetailSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'], url_path='calendar-token')
    def get_calendar_token(self, request):
        """Return the current iCal token and feed URL for the authenticated user."""
        user = request.user
        token = user.ical_token or ''
        ics_url = request.build_absolute_uri(f'/api/users/calendar.ics?token={token}') if token else ''
        return Response({'ical_token': token, 'ics_url': ics_url})

    @action(detail=False, methods=['POST'], url_path='calendar-token')
    def generate_calendar_token(self, request):
        """Generate (or regenerate) the iCal token for the authenticated user."""
        request.user.generate_ical_token()
        token = request.user.ical_token
        ics_url = request.build_absolute_uri(f'/api/users/calendar.ics?token={token}')
        return Response({'ical_token': token, 'ics_url': ics_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['POST'])
    def suspend(self, request, pk=None):
        """
        Suspend a user. Only admins can perform this action.
        """
        # Check if requesting user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser or
                has_role_permission(request.user, 'user.suspend')):
            return Response(
                {'error': 'You do not have permission to suspend users'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()

        # Prevent suspending yourself
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot suspend yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent suspending superusers unless you're a superuser
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {'error': 'You cannot suspend a superuser'},
                status=status.HTTP_403_FORBIDDEN
            )

        user.is_suspended = True
        user.save()
        return Response({'status': 'User suspended'})

    @action(detail=True, methods=['POST'])
    def activate(self, request, pk=None):
        """
        Activate a user. Only admins can perform this action.
        """
        # Check if requesting user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser or
                has_role_permission(request.user, 'user.activate')):
            return Response(
                {'error': 'You do not have permission to activate users'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        user.is_suspended = False
        user.is_active = True
        user.save()
        return Response({'status': 'User activated'})

