"""
Auto-Completion System

Automatically marks parent items as complete when all child items are done.
Hierarchy: Task → Sprint → Milestone → Project → Workspace
"""

import logging
from django.db.models import Count, Q
from pm.models.task_models import Task
from pm.models.project_models import Sprint, Milestone, Project
from pm.models.workspace_models import Workspace
from pm.models.notification_models import Notification

logger = logging.getLogger(__name__)


class AutoCompletionService:
    """
    Handles automatic completion of hierarchy items.
    
    When a Task is marked as 'Done', this service:
    1. Checks if all Tasks in the Sprint are done
    2. If yes, marks Sprint as 'Completed' and triggers Milestone check
    3. Continues up the hierarchy until Workspace
    """
    
    @staticmethod
    def trigger_auto_completion(task):
        """
        Entry point: Called when a task status changes to 'Done'
        
        Args:
            task: The Task object that was just completed
        """
        if task.status != 'Done':
            return
        
        # Start the chain reaction
        AutoCompletionService._check_and_complete_sprint(task.sprint)
    
    @staticmethod
    def _check_and_complete_sprint(sprint):
        """Check if all tasks in a sprint are done, and complete it if so"""
        if not sprint:
            return
        
        # Check if all tasks in this sprint are done
        total_tasks = sprint.tasks.count()
        if total_tasks == 0:
            return
        
        done_tasks = sprint.tasks.filter(status='Done').count()
        
        if done_tasks == total_tasks:
            # All tasks are done! Mark sprint as completed
            if sprint.status != 'Completed':
                sprint.status = 'Completed'
                sprint.save(update_fields=['status'])
                
                # Create notification
                AutoCompletionService._create_completion_notification(
                    sprint, 'Sprint', f'All {total_tasks} tasks completed!'
                )
                
                # Trigger next level
                AutoCompletionService._check_and_complete_milestone(sprint.milestone)
    
    @staticmethod
    def _check_and_complete_milestone(milestone):
        """Check if all sprints in a milestone are done, and complete it if so"""
        if not milestone:
            return
        
        # Check if all sprints in this milestone are completed
        total_sprints = milestone.sprints.count()
        if total_sprints == 0:
            return
        
        completed_sprints = milestone.sprints.filter(status='Completed').count()
        
        if completed_sprints == total_sprints:
            # All sprints are completed! Mark milestone as completed
            if milestone.status != 'Completed':
                milestone.status = 'Completed'
                milestone.save(update_fields=['status'])
                
                # Create notification
                AutoCompletionService._create_completion_notification(
                    milestone, 'Milestone', f'All {total_sprints} sprints completed!'
                )
                
                # Trigger next level
                AutoCompletionService._check_and_complete_project(milestone.project)
    
    @staticmethod
    def _check_and_complete_project(project):
        """Check if all milestones in a project are done, and complete it if so"""
        if not project:
            return
        
        # Check if all milestones in this project are completed
        total_milestones = project.milestones.count()
        if total_milestones == 0:
            return
        
        completed_milestones = project.milestones.filter(status='Completed').count()
        
        if completed_milestones == total_milestones:
            # All milestones are completed! Mark project as completed
            if project.status != 'Completed':
                project.status = 'Completed'
                project.save(update_fields=['status'])
                
                # Create notification
                AutoCompletionService._create_completion_notification(
                    project, 'Project', f'All {total_milestones} milestones completed!'
                )
                
                # Trigger next level
                AutoCompletionService._check_and_complete_workspace(project.workspace)
    
    @staticmethod
    def _check_and_complete_workspace(workspace):
        """Check if all projects in a workspace are done"""
        if not workspace:
            return
        
        # Check if all projects in this workspace are completed
        total_projects = workspace.projects.count()
        if total_projects == 0:
            return
        
        completed_projects = workspace.projects.filter(status='Completed').count()
        
        if completed_projects == total_projects:
            # All projects are completed! Workspace is complete!
            # Note: Workspace doesn't have a status field, so just notify
            
            # Create special notification for workspace completion
            AutoCompletionService._create_workspace_completion_notification(
                workspace, total_projects
            )
    
    @staticmethod
    def _create_completion_notification(obj, obj_type, message):
        """Create a notification for auto-completion"""
        try:
            # Notify project members or workspace members
            if obj_type == 'Sprint':
                project = obj.milestone.project
            elif obj_type == 'Milestone':
                project = obj.project
            elif obj_type == 'Project':
                project = obj
            else:
                return
            
            # Create notifications for all project members
            members = project.members.all()
            for member in members:
                Notification.objects.create(
                    recipient=member,
                    actor=None,  # System notification
                    verb=f'{obj_type} "{obj.name}" auto-completed: {message}',
                    notification_type='general',
                    target_object_id=obj.id,
                    target_content_type=None  # Can be enhanced with ContentType
                )
            logger.info(f"Auto-completion notification created for {obj_type} '{obj.name}'")
        except Exception as e:
            # Don't fail the completion if notification fails
            logger.error(f"Failed to create completion notification for {obj_type}: {e}")
    
    @staticmethod
    def _create_workspace_completion_notification(workspace, total_projects):
        """Create a special notification for workspace completion"""
        try:
            # Notify all workspace members
            members = workspace.members.all()
            for member in members:
                Notification.objects.create(
                    recipient=member,
                    actor=None,  # System notification
                    verb=f'Workspace "{workspace.name}" COMPLETED! All {total_projects} projects have been completed!',
                    notification_type='general',
                    target_object_id=workspace.id,
                )
            logger.info(f"Workspace completion notification created for '{workspace.name}'")
        except Exception as e:
            logger.error(f"Failed to create workspace completion notification: {e}")


# Convenience function to be called from Task model
def auto_complete_on_task_done(task):
    """
    Call this function when a task is marked as 'Done'
    
    Usage in Task model:
        def save(self, *args, **kwargs):
            old_status = None
            if self.pk:
                old_status = Task.objects.get(pk=self.pk).status
            
            super().save(*args, **kwargs)
            
            # Trigger auto-completion
            if old_status != 'Done' and self.status == 'Done':
                auto_complete_on_task_done(self)
    """
    AutoCompletionService.trigger_auto_completion(task)
