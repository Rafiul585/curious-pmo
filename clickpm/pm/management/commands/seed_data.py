"""
Management command to populate the database with sample/seed data.
Creates users, workspaces, projects, milestones, sprints, tasks, and comments.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from pm.models.user_models import User, Role
from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.project_models import Project, ProjectMember, Milestone, Sprint
from pm.models.task_models import Task, TaskDependency
from pm.models.comment_models import Comment
from pm.models.notification_models import Notification


class Command(BaseCommand):
    help = 'Populate the database with sample seed data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding (except superusers)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting seed data creation...'))

        if options['clear']:
            self.clear_data()

        # Create roles first
        roles = self.create_roles()

        # Create users
        users = self.create_users(roles)

        # Create workspaces
        workspaces = self.create_workspaces(users, roles)

        # Create projects
        projects = self.create_projects(workspaces, users, roles)

        # Create milestones
        milestones = self.create_milestones(projects)

        # Create sprints
        sprints = self.create_sprints(milestones)

        # Create tasks
        tasks = self.create_tasks(sprints, users)

        # Create task dependencies
        self.create_task_dependencies(tasks)

        # Create comments
        self.create_comments(tasks, users)

        # Create notifications
        self.create_notifications(users, tasks)

        self.stdout.write(self.style.SUCCESS('\n[OK] Seed data creation complete!'))
        self.print_summary()

    def clear_data(self):
        """Clear existing data except superusers"""
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        Notification.objects.all().delete()
        Comment.objects.all().delete()
        TaskDependency.objects.all().delete()
        Task.objects.all().delete()
        Sprint.objects.all().delete()
        Milestone.objects.all().delete()
        ProjectMember.objects.all().delete()
        Project.objects.all().delete()
        WorkspaceMember.objects.all().delete()
        Workspace.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS('Data cleared.'))

    def create_roles(self):
        """Create or get roles"""
        self.stdout.write('Creating roles...')
        roles = {}
        role_names = ['Admin', 'Project Admin', 'User', 'System']
        for name in role_names:
            role, created = Role.objects.get_or_create(name=name)
            roles[name] = role
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {name}')
        return roles

    def create_users(self, roles):
        """Create sample users"""
        self.stdout.write('Creating users...')
        users = {}

        user_data = [
            {'username': 'john_doe', 'email': 'john@example.com', 'first_name': 'John', 'last_name': 'Doe', 'role': 'Admin', 'gender': 'Male'},
            {'username': 'jane_smith', 'email': 'jane@example.com', 'first_name': 'Jane', 'last_name': 'Smith', 'role': 'Project Admin', 'gender': 'Female'},
            {'username': 'bob_wilson', 'email': 'bob@example.com', 'first_name': 'Bob', 'last_name': 'Wilson', 'role': 'User', 'gender': 'Male'},
            {'username': 'alice_jones', 'email': 'alice@example.com', 'first_name': 'Alice', 'last_name': 'Jones', 'role': 'User', 'gender': 'Female'},
            {'username': 'charlie_brown', 'email': 'charlie@example.com', 'first_name': 'Charlie', 'last_name': 'Brown', 'role': 'User', 'gender': 'Male'},
            {'username': 'diana_prince', 'email': 'diana@example.com', 'first_name': 'Diana', 'last_name': 'Prince', 'role': 'Project Admin', 'gender': 'Female'},
        ]

        for data in user_data:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': roles.get(data['role']),
                    'gender': data['gender'],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            users[data['username']] = user
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {data["username"]} ({data["role"]})')

        return users

    def create_workspaces(self, users, roles):
        """Create sample workspaces"""
        self.stdout.write('Creating workspaces...')
        workspaces = {}

        workspace_data = [
            {
                'name': 'Engineering Team',
                'description': 'Main workspace for the engineering team to collaborate on software projects.',
                'owner': 'john_doe',
                'members': ['jane_smith', 'bob_wilson', 'alice_jones']
            },
            {
                'name': 'Marketing Team',
                'description': 'Workspace for marketing campaigns and content management.',
                'owner': 'diana_prince',
                'members': ['charlie_brown', 'alice_jones']
            },
            {
                'name': 'Product Development',
                'description': 'Cross-functional workspace for product planning and development.',
                'owner': 'jane_smith',
                'members': ['john_doe', 'bob_wilson', 'diana_prince']
            },
        ]

        for data in workspace_data:
            workspace, created = Workspace.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'owner': users[data['owner']],
                }
            )
            workspaces[data['name']] = workspace

            # Add members
            for member_username in data['members']:
                WorkspaceMember.objects.get_or_create(
                    workspace=workspace,
                    user=users[member_username],
                    defaults={'role': roles['User']}
                )

            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {data["name"]}')

        return workspaces

    def create_projects(self, workspaces, users, roles):
        """Create sample projects"""
        self.stdout.write('Creating projects...')
        projects = {}
        today = timezone.now().date()

        project_data = [
            {
                'name': 'Website Redesign',
                'description': 'Complete overhaul of the company website with modern design and improved UX.',
                'workspace': 'Engineering Team',
                'status': 'active',
                'visibility': 'public',
                'start_date': today - timedelta(days=30),
                'end_date': today + timedelta(days=60),
                'members': ['john_doe', 'jane_smith', 'bob_wilson'],
                'tags': 'web,frontend,design',
            },
            {
                'name': 'Mobile App Development',
                'description': 'Native mobile application for iOS and Android platforms.',
                'workspace': 'Engineering Team',
                'status': 'active',
                'visibility': 'private',
                'start_date': today - timedelta(days=15),
                'end_date': today + timedelta(days=90),
                'members': ['jane_smith', 'alice_jones'],
                'tags': 'mobile,ios,android',
            },
            {
                'name': 'Q1 Marketing Campaign',
                'description': 'Digital marketing campaign for Q1 product launch.',
                'workspace': 'Marketing Team',
                'status': 'planning',
                'visibility': 'public',
                'start_date': today,
                'end_date': today + timedelta(days=45),
                'members': ['diana_prince', 'charlie_brown'],
                'tags': 'marketing,campaign,digital',
            },
            {
                'name': 'API Integration Platform',
                'description': 'Build a centralized API integration platform for third-party services.',
                'workspace': 'Product Development',
                'status': 'active',
                'visibility': 'private',
                'start_date': today - timedelta(days=45),
                'end_date': today + timedelta(days=30),
                'members': ['john_doe', 'bob_wilson', 'diana_prince'],
                'tags': 'api,backend,integration',
            },
            {
                'name': 'Customer Portal',
                'description': 'Self-service customer portal for account management.',
                'workspace': 'Product Development',
                'status': 'on_hold',
                'visibility': 'private',
                'start_date': today + timedelta(days=30),
                'end_date': today + timedelta(days=120),
                'members': ['jane_smith', 'alice_jones'],
                'tags': 'portal,customer,frontend',
            },
        ]

        for data in project_data:
            project, created = Project.objects.get_or_create(
                name=data['name'],
                workspace=workspaces[data['workspace']],
                defaults={
                    'description': data['description'],
                    'status': data['status'],
                    'visibility': data['visibility'],
                    'start_date': data['start_date'],
                    'end_date': data['end_date'],
                    'tags': data['tags'],
                }
            )
            projects[data['name']] = project

            # Add project members
            for i, member_username in enumerate(data['members']):
                role = roles['Project Admin'] if i == 0 else roles['User']
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=users[member_username],
                    defaults={'role': role}
                )

            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {data["name"]}')

        return projects

    def create_milestones(self, projects):
        """Create sample milestones"""
        self.stdout.write('Creating milestones...')
        milestones = {}

        milestone_data = [
            # Website Redesign milestones
            {'project': 'Website Redesign', 'name': 'Design Phase', 'description': 'UI/UX design and wireframes', 'status': 'Completed', 'offset': (0, 14)},
            {'project': 'Website Redesign', 'name': 'Frontend Development', 'description': 'Implement the new design', 'status': 'In Progress', 'offset': (14, 35)},
            {'project': 'Website Redesign', 'name': 'Testing & Launch', 'description': 'QA testing and production deployment', 'status': 'Not Started', 'offset': (35, 60)},

            # Mobile App milestones
            {'project': 'Mobile App Development', 'name': 'MVP Features', 'description': 'Core features for initial release', 'status': 'In Progress', 'offset': (0, 30)},
            {'project': 'Mobile App Development', 'name': 'Beta Release', 'description': 'Beta testing with select users', 'status': 'Not Started', 'offset': (30, 60)},
            {'project': 'Mobile App Development', 'name': 'App Store Launch', 'description': 'Public release on app stores', 'status': 'Not Started', 'offset': (60, 90)},

            # Marketing Campaign milestones
            {'project': 'Q1 Marketing Campaign', 'name': 'Content Creation', 'description': 'Create all marketing assets', 'status': 'In Progress', 'offset': (0, 20)},
            {'project': 'Q1 Marketing Campaign', 'name': 'Campaign Launch', 'description': 'Launch and monitor campaign', 'status': 'Not Started', 'offset': (20, 45)},

            # API Platform milestones
            {'project': 'API Integration Platform', 'name': 'Core API Development', 'description': 'Build core API endpoints', 'status': 'Completed', 'offset': (0, 20)},
            {'project': 'API Integration Platform', 'name': 'Integration Layer', 'description': 'Third-party service integrations', 'status': 'In Progress', 'offset': (20, 45)},
            {'project': 'API Integration Platform', 'name': 'Documentation & SDK', 'description': 'API docs and client SDKs', 'status': 'Not Started', 'offset': (45, 75)},
        ]

        for data in milestone_data:
            project = projects[data['project']]
            start_offset, end_offset = data['offset']

            milestone, created = Milestone.objects.get_or_create(
                project=project,
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'status': data['status'],
                    'start_date': project.start_date + timedelta(days=start_offset),
                    'end_date': project.start_date + timedelta(days=end_offset),
                }
            )
            key = f"{data['project']}:{data['name']}"
            milestones[key] = milestone

            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {data["name"]} ({data["project"]})')

        return milestones

    def create_sprints(self, milestones):
        """Create sample sprints"""
        self.stdout.write('Creating sprints...')
        sprints = {}

        sprint_data = [
            # Design Phase sprints
            {'milestone': 'Website Redesign:Design Phase', 'name': 'Sprint 1 - Research', 'description': 'User research and competitor analysis', 'status': 'Completed', 'offset': (0, 7)},
            {'milestone': 'Website Redesign:Design Phase', 'name': 'Sprint 2 - Wireframes', 'description': 'Create wireframes and mockups', 'status': 'Completed', 'offset': (7, 14)},

            # Frontend Development sprints
            {'milestone': 'Website Redesign:Frontend Development', 'name': 'Sprint 3 - Homepage', 'description': 'Implement homepage design', 'status': 'In Progress', 'offset': (0, 7)},
            {'milestone': 'Website Redesign:Frontend Development', 'name': 'Sprint 4 - Inner Pages', 'description': 'Implement inner page templates', 'status': 'Not Started', 'offset': (7, 14)},
            {'milestone': 'Website Redesign:Frontend Development', 'name': 'Sprint 5 - Components', 'description': 'Reusable UI components', 'status': 'Not Started', 'offset': (14, 21)},

            # MVP Features sprints
            {'milestone': 'Mobile App Development:MVP Features', 'name': 'Sprint 1 - Auth', 'description': 'User authentication flow', 'status': 'Completed', 'offset': (0, 10)},
            {'milestone': 'Mobile App Development:MVP Features', 'name': 'Sprint 2 - Dashboard', 'description': 'Main dashboard features', 'status': 'In Progress', 'offset': (10, 20)},
            {'milestone': 'Mobile App Development:MVP Features', 'name': 'Sprint 3 - Settings', 'description': 'User settings and profile', 'status': 'Not Started', 'offset': (20, 30)},

            # Content Creation sprints
            {'milestone': 'Q1 Marketing Campaign:Content Creation', 'name': 'Sprint 1 - Assets', 'description': 'Create visual assets', 'status': 'In Progress', 'offset': (0, 10)},
            {'milestone': 'Q1 Marketing Campaign:Content Creation', 'name': 'Sprint 2 - Copy', 'description': 'Write marketing copy', 'status': 'Not Started', 'offset': (10, 20)},

            # Core API Development sprints
            {'milestone': 'API Integration Platform:Core API Development', 'name': 'Sprint 1 - Foundation', 'description': 'API architecture setup', 'status': 'Completed', 'offset': (0, 10)},
            {'milestone': 'API Integration Platform:Core API Development', 'name': 'Sprint 2 - Endpoints', 'description': 'Core CRUD endpoints', 'status': 'Completed', 'offset': (10, 20)},

            # Integration Layer sprints
            {'milestone': 'API Integration Platform:Integration Layer', 'name': 'Sprint 3 - OAuth', 'description': 'OAuth provider integrations', 'status': 'In Progress', 'offset': (0, 12)},
            {'milestone': 'API Integration Platform:Integration Layer', 'name': 'Sprint 4 - Webhooks', 'description': 'Webhook handlers', 'status': 'Not Started', 'offset': (12, 25)},
        ]

        for data in sprint_data:
            milestone = milestones[data['milestone']]
            start_offset, end_offset = data['offset']

            sprint, created = Sprint.objects.get_or_create(
                milestone=milestone,
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'status': data['status'],
                    'start_date': milestone.start_date + timedelta(days=start_offset),
                    'end_date': milestone.start_date + timedelta(days=end_offset),
                }
            )
            key = f"{data['milestone']}:{data['name']}"
            sprints[key] = sprint

            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {data["name"]}')

        return sprints

    def create_tasks(self, sprints, users):
        """Create sample tasks"""
        self.stdout.write('Creating tasks...')
        tasks = {}

        task_data = [
            # Sprint 1 - Research tasks
            {'sprint': 'Website Redesign:Design Phase:Sprint 1 - Research', 'title': 'Conduct user interviews', 'status': 'Done', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'john_doe', 'weight': 30},
            {'sprint': 'Website Redesign:Design Phase:Sprint 1 - Research', 'title': 'Analyze competitor websites', 'status': 'Done', 'priority': 'Medium', 'assignee': 'bob_wilson', 'reporter': 'john_doe', 'weight': 25},
            {'sprint': 'Website Redesign:Design Phase:Sprint 1 - Research', 'title': 'Create user personas', 'status': 'Done', 'priority': 'Medium', 'assignee': 'jane_smith', 'reporter': 'john_doe', 'weight': 25},
            {'sprint': 'Website Redesign:Design Phase:Sprint 1 - Research', 'title': 'Document findings', 'status': 'Done', 'priority': 'Low', 'assignee': 'bob_wilson', 'reporter': 'jane_smith', 'weight': 20},

            # Sprint 2 - Wireframes tasks
            {'sprint': 'Website Redesign:Design Phase:Sprint 2 - Wireframes', 'title': 'Create homepage wireframe', 'status': 'Done', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'john_doe', 'weight': 30},
            {'sprint': 'Website Redesign:Design Phase:Sprint 2 - Wireframes', 'title': 'Design navigation structure', 'status': 'Done', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'john_doe', 'weight': 25},
            {'sprint': 'Website Redesign:Design Phase:Sprint 2 - Wireframes', 'title': 'Create mobile wireframes', 'status': 'Done', 'priority': 'Medium', 'assignee': 'bob_wilson', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Website Redesign:Design Phase:Sprint 2 - Wireframes', 'title': 'Get stakeholder approval', 'status': 'Done', 'priority': 'Critical', 'assignee': 'john_doe', 'reporter': 'jane_smith', 'weight': 20},

            # Sprint 3 - Homepage tasks
            {'sprint': 'Website Redesign:Frontend Development:Sprint 3 - Homepage', 'title': 'Set up project structure', 'status': 'Done', 'priority': 'High', 'assignee': 'bob_wilson', 'reporter': 'jane_smith', 'weight': 15},
            {'sprint': 'Website Redesign:Frontend Development:Sprint 3 - Homepage', 'title': 'Implement hero section', 'status': 'Done', 'priority': 'High', 'assignee': 'bob_wilson', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Website Redesign:Frontend Development:Sprint 3 - Homepage', 'title': 'Build features section', 'status': 'In Progress', 'priority': 'Medium', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Website Redesign:Frontend Development:Sprint 3 - Homepage', 'title': 'Add footer component', 'status': 'To-do', 'priority': 'Medium', 'assignee': 'bob_wilson', 'reporter': 'jane_smith', 'weight': 15},
            {'sprint': 'Website Redesign:Frontend Development:Sprint 3 - Homepage', 'title': 'Implement responsive design', 'status': 'To-do', 'priority': 'High', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 20},

            # Mobile App - Sprint 1 Auth tasks
            {'sprint': 'Mobile App Development:MVP Features:Sprint 1 - Auth', 'title': 'Design login screen', 'status': 'Done', 'priority': 'High', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 1 - Auth', 'title': 'Implement JWT authentication', 'status': 'Done', 'priority': 'Critical', 'assignee': 'jane_smith', 'reporter': 'jane_smith', 'weight': 35},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 1 - Auth', 'title': 'Add biometric login', 'status': 'Done', 'priority': 'Medium', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 1 - Auth', 'title': 'Test auth flow', 'status': 'Done', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'jane_smith', 'weight': 15},

            # Mobile App - Sprint 2 Dashboard tasks
            {'sprint': 'Mobile App Development:MVP Features:Sprint 2 - Dashboard', 'title': 'Create dashboard layout', 'status': 'Done', 'priority': 'High', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 2 - Dashboard', 'title': 'Implement data widgets', 'status': 'In Progress', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'jane_smith', 'weight': 30},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 2 - Dashboard', 'title': 'Add pull-to-refresh', 'status': 'To-do', 'priority': 'Medium', 'assignee': 'alice_jones', 'reporter': 'jane_smith', 'weight': 20},
            {'sprint': 'Mobile App Development:MVP Features:Sprint 2 - Dashboard', 'title': 'Implement navigation', 'status': 'Review', 'priority': 'High', 'assignee': 'jane_smith', 'reporter': 'jane_smith', 'weight': 25},

            # Marketing - Sprint 1 Assets tasks
            {'sprint': 'Q1 Marketing Campaign:Content Creation:Sprint 1 - Assets', 'title': 'Design social media graphics', 'status': 'Done', 'priority': 'High', 'assignee': 'charlie_brown', 'reporter': 'diana_prince', 'weight': 30},
            {'sprint': 'Q1 Marketing Campaign:Content Creation:Sprint 1 - Assets', 'title': 'Create video thumbnails', 'status': 'In Progress', 'priority': 'Medium', 'assignee': 'charlie_brown', 'reporter': 'diana_prince', 'weight': 25},
            {'sprint': 'Q1 Marketing Campaign:Content Creation:Sprint 1 - Assets', 'title': 'Design email templates', 'status': 'To-do', 'priority': 'High', 'assignee': 'diana_prince', 'reporter': 'diana_prince', 'weight': 25},
            {'sprint': 'Q1 Marketing Campaign:Content Creation:Sprint 1 - Assets', 'title': 'Create banner ads', 'status': 'To-do', 'priority': 'Medium', 'assignee': 'charlie_brown', 'reporter': 'diana_prince', 'weight': 20},

            # API Platform - Sprint 1 Foundation tasks
            {'sprint': 'API Integration Platform:Core API Development:Sprint 1 - Foundation', 'title': 'Set up API project', 'status': 'Done', 'priority': 'Critical', 'assignee': 'john_doe', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'API Integration Platform:Core API Development:Sprint 1 - Foundation', 'title': 'Configure authentication', 'status': 'Done', 'priority': 'Critical', 'assignee': 'bob_wilson', 'reporter': 'john_doe', 'weight': 30},
            {'sprint': 'API Integration Platform:Core API Development:Sprint 1 - Foundation', 'title': 'Set up database schema', 'status': 'Done', 'priority': 'High', 'assignee': 'john_doe', 'reporter': 'jane_smith', 'weight': 25},
            {'sprint': 'API Integration Platform:Core API Development:Sprint 1 - Foundation', 'title': 'Configure CI/CD pipeline', 'status': 'Done', 'priority': 'Medium', 'assignee': 'diana_prince', 'reporter': 'john_doe', 'weight': 20},

            # API Platform - Sprint 3 OAuth tasks
            {'sprint': 'API Integration Platform:Integration Layer:Sprint 3 - OAuth', 'title': 'Implement Google OAuth', 'status': 'Done', 'priority': 'High', 'assignee': 'bob_wilson', 'reporter': 'john_doe', 'weight': 30},
            {'sprint': 'API Integration Platform:Integration Layer:Sprint 3 - OAuth', 'title': 'Add GitHub OAuth', 'status': 'In Progress', 'priority': 'High', 'assignee': 'john_doe', 'reporter': 'john_doe', 'weight': 30},
            {'sprint': 'API Integration Platform:Integration Layer:Sprint 3 - OAuth', 'title': 'Implement Microsoft OAuth', 'status': 'To-do', 'priority': 'Medium', 'assignee': 'bob_wilson', 'reporter': 'john_doe', 'weight': 25},
            {'sprint': 'API Integration Platform:Integration Layer:Sprint 3 - OAuth', 'title': 'Write OAuth documentation', 'status': 'To-do', 'priority': 'Low', 'assignee': 'diana_prince', 'reporter': 'john_doe', 'weight': 15},
        ]

        for data in task_data:
            sprint = sprints[data['sprint']]

            task, created = Task.objects.get_or_create(
                sprint=sprint,
                title=data['title'],
                defaults={
                    'description': f"Task: {data['title']}",
                    'status': data['status'],
                    'priority': data['priority'],
                    'assignee': users.get(data['assignee']),
                    'reporter': users.get(data['reporter']),
                    'start_date': sprint.start_date,
                    'due_date': sprint.end_date,
                }
            )
            tasks[data['title']] = task

            if created:
                self.stdout.write(f'  Created: {data["title"][:40]}...')

        self.stdout.write(f'  Total tasks: {len(tasks)}')
        return tasks

    def create_task_dependencies(self, tasks):
        """Create sample task dependencies"""
        self.stdout.write('Creating task dependencies...')

        dependencies = [
            ('Implement hero section', 'Set up project structure', 'Blocked By'),
            ('Build features section', 'Implement hero section', 'Blocked By'),
            ('Add footer component', 'Set up project structure', 'Blocked By'),
            ('Implement responsive design', 'Build features section', 'Blocked By'),
            ('Implement JWT authentication', 'Design login screen', 'Blocked By'),
            ('Add biometric login', 'Implement JWT authentication', 'Blocked By'),
            ('Implement data widgets', 'Create dashboard layout', 'Blocked By'),
            ('Add GitHub OAuth', 'Implement Google OAuth', 'Related To'),
            ('Implement Microsoft OAuth', 'Implement Google OAuth', 'Related To'),
        ]

        count = 0
        for task_title, depends_on_title, dep_type in dependencies:
            task = tasks.get(task_title)
            depends_on = tasks.get(depends_on_title)

            if task and depends_on:
                _, created = TaskDependency.objects.get_or_create(
                    task=task,
                    depends_on=depends_on,
                    defaults={'type': dep_type}
                )
                if created:
                    count += 1

        self.stdout.write(f'  Created {count} dependencies')

    def create_comments(self, tasks, users):
        """Create sample comments on tasks"""
        self.stdout.write('Creating comments...')

        comment_data = [
            ('Conduct user interviews', 'john_doe', 'Great work on the interviews! The insights are very valuable.'),
            ('Conduct user interviews', 'jane_smith', 'Thank you! I learned a lot from the user feedback.'),
            ('Implement hero section', 'jane_smith', 'Looking good! Can we add some animation effects?'),
            ('Implement hero section', 'bob_wilson', 'Sure, I will add some subtle animations.'),
            ('Build features section', 'john_doe', 'Make sure to follow the design specs closely.'),
            ('Implement JWT authentication', 'jane_smith', 'Added refresh token support as discussed.'),
            ('Design social media graphics', 'diana_prince', 'The color scheme looks perfect!'),
            ('Implement Google OAuth', 'john_doe', 'Tested on staging, works great!'),
            ('Add GitHub OAuth', 'bob_wilson', 'Almost done, just need to handle edge cases.'),
        ]

        count = 0
        for task_title, username, content in comment_data:
            task = tasks.get(task_title)
            user = users.get(username)

            if task and user:
                Comment.objects.get_or_create(
                    task=task,
                    author=user,
                    content=content,
                )
                count += 1

        self.stdout.write(f'  Created {count} comments')

    def create_notifications(self, users, tasks):
        """Create sample notifications"""
        self.stdout.write('Creating notifications...')

        notification_data = [
            ('john_doe', 'jane_smith', 'assigned you to a new task', 'assignment'),
            ('jane_smith', 'bob_wilson', 'commented on your task', 'comment'),
            ('bob_wilson', 'john_doe', 'completed task "Set up project structure"', 'general'),
            ('alice_jones', 'jane_smith', 'Task deadline approaching in 2 days', 'deadline'),
            ('charlie_brown', 'diana_prince', 'updated the marketing campaign status', 'general'),
            ('diana_prince', 'john_doe', 'mentioned you in a comment', 'mention'),
        ]

        count = 0
        for recipient_name, actor_name, verb, notification_type in notification_data:
            recipient = users.get(recipient_name)
            actor = users.get(actor_name)

            if recipient and actor:
                Notification.objects.get_or_create(
                    recipient=recipient,
                    actor=actor,
                    verb=verb,
                    defaults={
                        'notification_type': notification_type,
                        'read': False,
                    }
                )
                count += 1

        self.stdout.write(f'  Created {count} notifications')

    def print_summary(self):
        """Print summary of created data"""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('Database Summary:'))
        self.stdout.write('=' * 50)
        self.stdout.write(f'  Users: {User.objects.count()}')
        self.stdout.write(f'  Roles: {Role.objects.count()}')
        self.stdout.write(f'  Workspaces: {Workspace.objects.count()}')
        self.stdout.write(f'  Projects: {Project.objects.count()}')
        self.stdout.write(f'  Milestones: {Milestone.objects.count()}')
        self.stdout.write(f'  Sprints: {Sprint.objects.count()}')
        self.stdout.write(f'  Tasks: {Task.objects.count()}')
        self.stdout.write(f'  Comments: {Comment.objects.count()}')
        self.stdout.write(f'  Notifications: {Notification.objects.count()}')
        self.stdout.write('=' * 50)
        self.stdout.write('\nTest credentials for seeded users:')
        self.stdout.write('  Password: password123')
        self.stdout.write('  Users: john_doe, jane_smith, bob_wilson, alice_jones, charlie_brown, diana_prince')
