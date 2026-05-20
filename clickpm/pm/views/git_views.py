import hashlib
import hmac
import json
import re

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from pm.models.git_models import GitIntegration, TaskGitLink
from pm.models.task_models import Task
from pm.models.workspace_models import WorkspaceMember
from pm.serializers.git_serializers import GitIntegrationSerializer, TaskGitLinkSerializer
from pm.utils.permission_helpers import is_workspace_admin


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _parse_task_ids(text: str) -> list[int]:
    """Return task IDs mentioned as [CUR-<n>] or CUR-<n> in text."""
    return [int(m) for m in re.findall(r'\[?CUR-(\d+)\]?', text or '', re.IGNORECASE)]


def _verify_github_signature(body: bytes, secret: str, header: str) -> bool:
    if not header.startswith('sha256='):
        return False
    expected = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header[7:])


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class GitIntegrationViewSet(viewsets.ModelViewSet):
    """
    CRUD for GitIntegration objects, scoped to workspaces the user is admin of.
    GET  /api/git-integrations/?workspace=<id>
    POST /api/git-integrations/
    PATCH/DELETE /api/git-integrations/<id>/
    """
    serializer_class = GitIntegrationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['workspace']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return GitIntegration.objects.all()
        admin_workspace_ids = WorkspaceMember.objects.filter(
            user=user, is_admin=True, is_guest=False
        ).values_list('workspace_id', flat=True)
        owned_ids = user.owned_workspaces.values_list('id', flat=True)
        all_ids = set(list(admin_workspace_ids) + list(owned_ids))
        return GitIntegration.objects.filter(workspace_id__in=all_ids)

    def perform_create(self, serializer):
        workspace = serializer.validated_data['workspace']
        if not is_workspace_admin(self.request.user, workspace):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only workspace admins can add integrations.')
        serializer.save()


class TaskGitLinkViewSet(viewsets.ModelViewSet):
    """
    CRUD for TaskGitLink.
    GET  /api/task-git-links/?task=<id>
    POST /api/task-git-links/
    DELETE /api/task-git-links/<id>/
    """
    serializer_class = TaskGitLinkSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'status']

    def get_queryset(self):
        return TaskGitLink.objects.filter(
            task__sprint__milestone__project__workspace__members=self.request.user
        ).distinct()


# ---------------------------------------------------------------------------
# Webhook endpoint (no auth — verified by HMAC signature)
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def webhook_github(request, pk: int):
    """
    POST /api/webhooks/github/<integration_id>/
    Receives GitHub push / pull_request webhook events, parses task references,
    and creates or updates TaskGitLink records.
    """
    try:
        integration = GitIntegration.objects.get(pk=pk)
    except GitIntegration.DoesNotExist:
        return HttpResponse(status=404)

    # Signature verification (skip only if no secret configured)
    if integration.webhook_secret:
        sig_header = request.headers.get('X-Hub-Signature-256', '')
        if not _verify_github_signature(request.body, integration.webhook_secret, sig_header):
            return HttpResponse('Invalid signature', status=401)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponse('Bad JSON', status=400)

    event_type = request.headers.get('X-GitHub-Event', '')

    if event_type == 'push':
        _handle_push(integration, payload)
    elif event_type == 'pull_request':
        _handle_pull_request(integration, payload)
    # Other events (ping, etc.) are silently accepted

    return HttpResponse(status=200)


def _handle_push(integration: GitIntegration, payload: dict):
    for commit in payload.get('commits', []):
        message = commit.get('message', '')
        sha = commit.get('id', '')[:40]
        task_ids = _parse_task_ids(message)
        for task_id in set(task_ids):
            try:
                task = Task.objects.get(id=task_id)
                TaskGitLink.objects.update_or_create(
                    task=task,
                    commit_sha=sha,
                    defaults={
                        'integration': integration,
                        'status': 'open',
                        'pr_url': '',
                        'pr_title': message[:500],
                    },
                )
            except Task.DoesNotExist:
                pass


def _handle_pull_request(integration: GitIntegration, payload: dict):
    pr = payload.get('pull_request', {})
    pr_number = pr.get('number')
    pr_url = pr.get('html_url', '')
    pr_title = pr.get('title', '')[:500]
    pr_body = pr.get('body', '') or ''
    pr_state = pr.get('state', 'open')
    is_merged = bool(pr.get('merged'))

    link_status = 'merged' if is_merged else ('closed' if pr_state == 'closed' else 'open')

    task_ids = set(_parse_task_ids(pr_title) + _parse_task_ids(pr_body))

    for task_id in task_ids:
        try:
            task = Task.objects.get(id=task_id)
            TaskGitLink.objects.update_or_create(
                task=task,
                pr_number=pr_number,
                integration=integration,
                defaults={
                    'pr_url': pr_url,
                    'pr_title': pr_title,
                    'commit_sha': '',
                    'status': link_status,
                },
            )
            # Auto-move task to Review on PR merge
            if is_merged and task.status not in ('Done', 'Review'):
                task.status = 'Review'
                task.save(update_fields=['status'])
        except Task.DoesNotExist:
            pass
