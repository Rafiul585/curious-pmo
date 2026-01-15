from django.contrib import admin
from pm.models import (
    User, Role,
    Workspace, WorkspaceMember,
    Project, ProjectMember, Milestone, Sprint,
    Task, TaskDependency,
    Comment,
    Attachment,
    ActivityLog,
    Notification
)

# -----------------------
# Role & User
# -----------------------
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'is_suspended', 'is_active']
    list_filter = ['is_active', 'is_suspended', 'role', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    readonly_fields = ['date_joined']

# -----------------------
# Workspace
# -----------------------
@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'created_at', 'updated_at']
    list_filter = ['created_at', 'owner']
    search_fields = ['name', 'description', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'workspace', 'is_admin', 'joined_at']
    list_filter = ['is_admin', 'joined_at']
    search_fields = ['user__username', 'workspace__name']
    readonly_fields = ['joined_at']

# -----------------------
# Projects
# -----------------------
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'workspace', 'status', 'start_date', 'end_date', 'archived']
    list_filter = ['status', 'archived', 'start_date', 'workspace']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'project', 'role', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['user__username', 'project__name']

@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'status', 'start_date', 'end_date']
    list_filter = ['status', 'project', 'start_date', 'end_date']
    search_fields = ['name', 'project__name', 'description']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ['name', 'milestone', 'status', 'start_date', 'end_date']
    list_filter = ['status', 'milestone', 'start_date', 'end_date']
    search_fields = ['name', 'milestone__name', 'description']
    readonly_fields = ['created_at', 'updated_at']

# -----------------------
# Tasks
# -----------------------
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'sprint', 'assignee', 'status', 'priority', 'due_date']
    list_filter = ['status', 'priority', 'sprint', 'due_date']
    search_fields = ['title', 'description', 'assignee__username']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'sprint')
        }),
        ('Assignment', {
            'fields': ('assignee', 'reporter')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'weight_percentage')
        }),
        ('Dates', {
            'fields': ('start_date', 'due_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = ['task', 'depends_on', 'type']
    list_filter = ['type']
    search_fields = ['task__title', 'depends_on__title']

# -----------------------
# Comments & Attachments
# -----------------------
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'created_at', 'task', 'sprint', 'project']
    list_filter = ['created_at', 'author']
    search_fields = ['content', 'author__username']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['file', 'comment', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['file']
    readonly_fields = ['uploaded_at']

# -----------------------
# Activity & Notifications
# -----------------------
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'content_type', 'object_id', 'get_entity_name', 'short_reason', 'timestamp']
    list_filter = ['action', 'content_type', 'timestamp', 'user']
    search_fields = ['user__username', 'action', 'content_type', 'reason']
    readonly_fields = ['user', 'action', 'content_type', 'object_id', 'reason', 
                       'old_value', 'new_value', 'extra_info', 'timestamp']
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Event Information', {
            'fields': ('user', 'action', 'content_type', 'object_id', 'timestamp')
        }),
        ('Reason', {
            'fields': ('reason',),
            'classes': ('collapse',)
        }),
        ('State Changes', {
            'fields': ('old_value', 'new_value'),
            'classes': ('collapse',)
        }),
        ('Context', {
            'fields': ('extra_info',),
            'classes': ('collapse',)
        }),
    )
    
    def get_entity_name(self, obj):
        """Get entity name from extra_info"""
        if obj.extra_info:
            for key in ['task_title', 'sprint_name', 'milestone_name', 'project_name', 'workspace_name']:
                if key in obj.extra_info:
                    return obj.extra_info[key]
        return f'#{obj.object_id}'
    get_entity_name.short_description = 'Entity'
    
    def short_reason(self, obj):
        """Truncated reason for list display"""
        if obj.reason:
            return obj.reason[:50] + '...' if len(obj.reason) > 50 else obj.reason
        return '-'
    short_reason.short_description = 'Reason'

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'actor', 'notification_type', 'verb', 'read', 'timestamp']
    list_filter = ['notification_type', 'read', 'timestamp']
    search_fields = ['recipient__username', 'actor__username', 'verb']
    readonly_fields = ['timestamp']
    actions = ['mark_as_read']

    def mark_as_read(self, request, queryset):
        updated = queryset.update(read=True)
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'
