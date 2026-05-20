"""
Rich seed data command — populates every visualisation in CuriousPMO.

Covers:
  • Sprint velocity chart (8 historical sprints with varied completion)
  • Burndown chart (ActivityLog entries spread across active sprint days)
  • Cumulative flow (backdated task created_at / updated_at)
  • Cycle time histogram (ActivityLog with new_value={'status':'Done'})
  • Dashboard completion trend (Done tasks updated in the last 4 weeks)
  • Time tracking widget (TimeLog records per user/task)
  • Workload view (tasks with assignees)
  • Health badges (health_status on project/milestone/sprint)
  • Goals / OKRs (Goal + GoalTarget linked to projects)
  • Tags (M2M per workspace, assigned to tasks)
  • Checklists (with some items checked)
  • Docs / Wiki (markdown docs per project)

Run:
    python manage.py seed_data           # idempotent (skips existing)
    python manage.py seed_data --clear   # wipe & re-seed

Login credentials after seeding:
    Password for all users: password123
    Users: john_doe, jane_smith, bob_wilson, alice_jones, charlie_brown, diana_prince
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.timezone import make_aware
from datetime import date, timedelta, datetime, time as dt_time
from decimal import Decimal

from pm.models.user_models import User, Role
from pm.models.workspace_models import Workspace, WorkspaceMember, Tag
from pm.models.project_models import Project, ProjectMember, Milestone, Sprint
from pm.models.task_models import Task, TimeLog, Checklist, ChecklistItem
from pm.models.comment_models import Comment
from pm.models.notification_models import Notification
from pm.models.activity_models import ActivityLog
from pm.models.goal_models import Goal, GoalTarget
from pm.models.doc_models import Doc

TODAY = date.today()


def ago(n): return TODAY - timedelta(days=n)
def fwd(n): return TODAY + timedelta(days=n)
def at(d, h=12): return make_aware(datetime.combine(d, dt_time(h, 0)))


class Command(BaseCommand):
    help = 'Populate the database with rich seed data for all visualisations'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Clear existing data before seeding (except superusers)')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting rich seed data creation...'))

        if options['clear']:
            self.clear_data()

        roles      = self.create_roles()
        users      = self.create_users(roles)
        workspaces = self.create_workspaces(users, roles)
        tags       = self.create_tags(workspaces)
        projects   = self.create_projects(workspaces, users, roles)
        milestones = self.create_milestones(projects)
        sprints    = self.create_sprints(milestones)
        tasks      = self.create_tasks(sprints, users, tags)
        self.backdate_tasks(tasks)
        self.create_activity_logs(tasks, sprints, users)
        self.create_time_logs(tasks, users)
        self.create_checklists(tasks)
        self.create_comments(tasks, users)
        self.create_goals(workspaces, projects, users)
        self.create_docs(projects, users)
        self.create_notifications(users, tasks)

        self.stdout.write(self.style.SUCCESS('\n[OK] Seed data creation complete!'))
        self.print_summary()

    # ------------------------------------------------------------------
    # CLEAR
    # ------------------------------------------------------------------
    def clear_data(self):
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        ActivityLog.objects.all().delete()
        Notification.objects.all().delete()
        Comment.objects.all().delete()
        TimeLog.objects.all().delete()
        ChecklistItem.objects.all().delete()
        Checklist.objects.all().delete()
        GoalTarget.objects.all().delete()
        Goal.objects.all().delete()
        Doc.objects.all().delete()
        Task.objects.all().delete()
        Sprint.objects.all().delete()
        Milestone.objects.all().delete()
        ProjectMember.objects.all().delete()
        Project.objects.all().delete()
        Tag.objects.all().delete()
        WorkspaceMember.objects.all().delete()
        Workspace.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS('Data cleared.'))

    # ------------------------------------------------------------------
    # ROLES
    # ------------------------------------------------------------------
    def create_roles(self):
        self.stdout.write('Creating roles...')
        roles = {}
        for name in ['Admin', 'Project Admin', 'User', 'System']:
            role, _ = Role.objects.get_or_create(name=name)
            roles[name] = role
        return roles

    # ------------------------------------------------------------------
    # USERS
    # ------------------------------------------------------------------
    def create_users(self, roles):
        self.stdout.write('Creating users...')
        users = {}
        user_data = [
            ('john_doe',      'john@example.com',    'John',    'Doe',    'Admin',        'Male'),
            ('jane_smith',    'jane@example.com',    'Jane',    'Smith',  'Project Admin','Female'),
            ('bob_wilson',    'bob@example.com',     'Bob',     'Wilson', 'User',         'Male'),
            ('alice_jones',   'alice@example.com',   'Alice',   'Jones',  'User',         'Female'),
            ('charlie_brown', 'charlie@example.com', 'Charlie', 'Brown',  'User',         'Male'),
            ('diana_prince',  'diana@example.com',   'Diana',   'Prince', 'Project Admin','Female'),
        ]
        for username, email, first, last, role_name, gender in user_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults=dict(email=email, first_name=first, last_name=last,
                              role=roles[role_name], gender=gender)
            )
            if created:
                user.set_password('password123')
                user.save()
            users[username] = user
            self.stdout.write(f'  {"Created" if created else "Exists"}: {username}')
        return users

    # ------------------------------------------------------------------
    # WORKSPACES
    # ------------------------------------------------------------------
    def create_workspaces(self, users, roles):
        self.stdout.write('Creating workspaces...')
        workspaces = {}
        ws_data = [
            {
                'name': 'Engineering Team',
                'description': 'Main workspace for engineering — software development and infrastructure.',
                'owner': 'john_doe',
                'members': [('jane_smith', True), ('bob_wilson', False), ('alice_jones', False)],
            },
            {
                'name': 'Marketing Team',
                'description': 'Workspace for campaigns, content, and brand management.',
                'owner': 'diana_prince',
                'members': [('charlie_brown', False), ('alice_jones', False)],
            },
        ]
        for data in ws_data:
            ws, created = Workspace.objects.get_or_create(
                name=data['name'],
                defaults=dict(description=data['description'], owner=users[data['owner']])
            )
            workspaces[data['name']] = ws
            # Add the owner as a workspace member with Admin role
            WorkspaceMember.objects.get_or_create(
                workspace=ws, user=users[data['owner']],
                defaults=dict(role=roles['Admin'], is_admin=True)
            )
            for member_username, is_admin in data['members']:
                WorkspaceMember.objects.get_or_create(
                    workspace=ws, user=users[member_username],
                    defaults=dict(role=roles['Admin'] if is_admin else roles['User'], is_admin=is_admin)
                )
            self.stdout.write(f'  {"Created" if created else "Exists"}: {data["name"]}')
        return workspaces

    # ------------------------------------------------------------------
    # TAGS
    # ------------------------------------------------------------------
    def create_tags(self, workspaces):
        self.stdout.write('Creating tags...')
        tags = {}
        tag_defs = {
            'Engineering Team': [
                ('backend',       '#3B82F6'),
                ('frontend',      '#8B5CF6'),
                ('bug',           '#EF4444'),
                ('feature',       '#10B981'),
                ('testing',       '#F59E0B'),
                ('performance',   '#6366F1'),
                ('security',      '#DC2626'),
                ('documentation', '#6B7280'),
            ],
            'Marketing Team': [
                ('content',       '#EC4899'),
                ('social',        '#F97316'),
                ('seo',           '#14B8A6'),
                ('design',        '#A855F7'),
                ('email',         '#EAB308'),
            ],
        }
        for ws_name, tlist in tag_defs.items():
            ws = workspaces[ws_name]
            for name, color in tlist:
                tag, _ = Tag.objects.get_or_create(workspace=ws, name=name, defaults={'color': color})
                tags[f'{ws_name}:{name}'] = tag
                self.stdout.write(f'  Tag: {ws_name}/{name}')
        return tags

    # ------------------------------------------------------------------
    # PROJECTS
    # ------------------------------------------------------------------
    def create_projects(self, workspaces, users, roles):
        self.stdout.write('Creating projects...')
        projects = {}
        proj_data = [
            # Website Redesign — primary project for rich reporting data
            {
                'name': 'Website Redesign',
                'desc': 'Complete overhaul of the company website with modern design and improved UX.',
                'ws':   'Engineering Team',
                'status': 'Active',
                'health': 'on_track',
                'vis':  'public',
                'start': ago(100), 'end': fwd(60),
                'members': ['john_doe', 'jane_smith', 'bob_wilson', 'alice_jones'],
            },
            # Mobile App — at risk, some delays
            {
                'name': 'Mobile App Development',
                'desc': 'Native mobile application for iOS and Android platforms.',
                'ws':   'Engineering Team',
                'status': 'Active',
                'health': 'at_risk',
                'vis':  'private',
                'start': ago(80), 'end': fwd(50),
                'members': ['jane_smith', 'bob_wilson', 'alice_jones'],
            },
            # API Platform — on track
            {
                'name': 'API Integration Platform',
                'desc': 'Centralised API integration platform for third-party services.',
                'ws':   'Engineering Team',
                'status': 'Active',
                'health': 'on_track',
                'vis':  'private',
                'start': ago(120), 'end': fwd(30),
                'members': ['john_doe', 'bob_wilson', 'diana_prince'],
            },
            # Marketing campaign — behind
            {
                'name': 'Q1 Marketing Campaign',
                'desc': 'Digital marketing campaign for Q1 product launch.',
                'ws':   'Marketing Team',
                'status': 'Active',
                'health': 'behind',
                'vis':  'public',
                'start': ago(45), 'end': fwd(45),
                'members': ['diana_prince', 'charlie_brown'],
            },
        ]
        for data in proj_data:
            proj, created = Project.objects.get_or_create(
                name=data['name'], workspace=workspaces[data['ws']],
                defaults=dict(
                    description=data['desc'], status=data['status'],
                    health_status=data['health'], visibility=data['vis'],
                    start_date=data['start'], end_date=data['end'],
                )
            )
            projects[data['name']] = proj
            for i, uname in enumerate(data['members']):
                ProjectMember.objects.get_or_create(
                    project=proj, user=users[uname],
                    defaults={'role': roles['Project Admin'] if i == 0 else roles['User']}
                )
            self.stdout.write(f'  {"Created" if created else "Exists"}: {data["name"]}')
        return projects

    # ------------------------------------------------------------------
    # MILESTONES
    # ------------------------------------------------------------------
    def create_milestones(self, projects):
        self.stdout.write('Creating milestones...')
        milestones = {}

        def ms(project_name, name, desc, status, health, start, end):
            proj = projects[project_name]
            m, created = Milestone.objects.get_or_create(
                project=proj, name=name,
                defaults=dict(description=desc, status=status, health_status=health,
                              start_date=start, end_date=end)
            )
            key = f'{project_name}:{name}'
            milestones[key] = m
            self.stdout.write(f'  {"Created" if created else "Exists"}: {name}')
            return m

        # Website Redesign — 3 milestones
        ms('Website Redesign', 'Design Phase',
           'UI/UX research, wireframes, and prototypes.',
           'Completed', 'on_track', ago(100), ago(61))

        ms('Website Redesign', 'Frontend Development',
           'Implement the new design across all pages.',
           'In Progress', 'on_track', ago(60), ago(1))

        ms('Website Redesign', 'Testing & Launch',
           'QA, performance testing, and production deployment.',
           'Not Started', 'on_track', fwd(1), fwd(60))

        # Mobile App — 2 milestones
        ms('Mobile App Development', 'MVP Features',
           'Core features for the initial release.',
           'In Progress', 'at_risk', ago(80), fwd(10))

        ms('Mobile App Development', 'Beta & Launch',
           'Beta testing and App Store submission.',
           'Not Started', 'on_track', fwd(11), fwd(50))

        # API Platform — 3 milestones
        ms('API Integration Platform', 'Core API',
           'Foundation and core CRUD endpoints.',
           'Completed', 'on_track', ago(120), ago(61))

        ms('API Integration Platform', 'Integration Layer',
           'Third-party OAuth and webhook integrations.',
           'In Progress', 'on_track', ago(60), fwd(10))

        ms('API Integration Platform', 'Documentation & SDK',
           'API documentation and client SDKs.',
           'Not Started', 'on_track', fwd(11), fwd(30))

        # Marketing — 2 milestones
        ms('Q1 Marketing Campaign', 'Content Creation',
           'Create all visual and copy assets.',
           'In Progress', 'behind', ago(45), ago(1))

        ms('Q1 Marketing Campaign', 'Campaign Launch',
           'Launch and monitor the campaign.',
           'Not Started', 'on_track', fwd(1), fwd(45))

        return milestones

    # ------------------------------------------------------------------
    # SPRINTS  (8 historical + 1 active + 1 future for Website Redesign)
    # ------------------------------------------------------------------
    def create_sprints(self, milestones):
        self.stdout.write('Creating sprints...')
        sprints = {}

        def sp(milestone_key, name, desc, status, health, start, end):
            m = milestones[milestone_key]
            s, created = Sprint.objects.get_or_create(
                milestone=m, name=name,
                defaults=dict(description=desc, status=status, health_status=health,
                              start_date=start, end_date=end)
            )
            key = f'{milestone_key}:{name}'
            sprints[key] = s
            self.stdout.write(f'  {"Created" if created else "Exists"}: {name}')
            return s

        # ── Website Redesign — Design Phase (3 completed sprints)
        sp('Website Redesign:Design Phase', 'S1 – User Research',
           'Interviews, surveys, and competitor analysis.',
           'Completed', 'on_track', ago(100), ago(87))

        sp('Website Redesign:Design Phase', 'S2 – Wireframes',
           'Low-fidelity wireframes for all pages.',
           'Completed', 'on_track', ago(86), ago(74))

        sp('Website Redesign:Design Phase', 'S3 – Prototypes',
           'High-fidelity clickable prototypes.',
           'Completed', 'on_track', ago(73), ago(61))

        # ── Website Redesign — Frontend Development (3 completed + 1 active)
        sp('Website Redesign:Frontend Development', 'S4 – Project Setup',
           'Vite + React project scaffold, CI/CD, design tokens.',
           'Completed', 'on_track', ago(60), ago(47))

        sp('Website Redesign:Frontend Development', 'S5 – Homepage',
           'Hero, features, testimonials, and CTA sections.',
           'Completed', 'on_track', ago(46), ago(33))

        sp('Website Redesign:Frontend Development', 'S6 – Inner Pages',
           'About, services, blog listing, and contact pages.',
           'Completed', 'on_track', ago(32), ago(19))

        sp('Website Redesign:Frontend Development', 'S7 – Components & Polish',
           'Shared component library, animations, dark mode.',
           'In Progress', 'on_track', ago(18), fwd(7))

        # ── Website Redesign — Testing & Launch (future)
        sp('Website Redesign:Testing & Launch', 'S8 – QA & Performance',
           'Cross-browser testing, Lighthouse, accessibility audit.',
           'Not Started', 'on_track', fwd(8), fwd(30))

        # ── Mobile App — MVP Features (2 completed + 1 active)
        sp('Mobile App Development:MVP Features', 'M1 – Auth Flow',
           'Login, registration, biometric, JWT.',
           'Completed', 'on_track', ago(80), ago(62))

        sp('Mobile App Development:MVP Features', 'M2 – Dashboard',
           'Main dashboard, data widgets, navigation.',
           'Completed', 'at_risk', ago(61), ago(44))

        sp('Mobile App Development:MVP Features', 'M3 – Core Screens',
           'Task list, project detail, profile screens.',
           'In Progress', 'at_risk', ago(43), fwd(10))

        # ── API Platform — Core API (2 completed)
        sp('API Integration Platform:Core API', 'A1 – Foundation',
           'Project setup, auth, router, and base models.',
           'Completed', 'on_track', ago(120), ago(99))

        sp('API Integration Platform:Core API', 'A2 – CRUD Endpoints',
           'Full CRUD for workspace, project, task, sprint.',
           'Completed', 'on_track', ago(98), ago(61))

        # ── API Platform — Integration Layer (1 completed + 1 active)
        sp('API Integration Platform:Integration Layer', 'A3 – OAuth Providers',
           'Google, GitHub, and Microsoft OAuth flows.',
           'Completed', 'on_track', ago(60), ago(33))

        sp('API Integration Platform:Integration Layer', 'A4 – Webhooks',
           'GitHub/GitLab webhook ingestion and processing.',
           'In Progress', 'on_track', ago(32), fwd(10))

        # ── Marketing — Content Creation (1 completed + 1 active)
        sp('Q1 Marketing Campaign:Content Creation', 'C1 – Visual Assets',
           'Social graphics, banners, email templates.',
           'Completed', 'behind', ago(45), ago(22))

        sp('Q1 Marketing Campaign:Content Creation', 'C2 – Copywriting',
           'Landing page copy, ad copy, email sequences.',
           'In Progress', 'behind', ago(21), fwd(5))

        return sprints

    # ------------------------------------------------------------------
    # TASKS
    # ------------------------------------------------------------------
    def create_tasks(self, sprints, users, tags):
        self.stdout.write('Creating tasks...')
        tasks = {}

        def eng(name): return tags.get(f'Engineering Team:{name}')
        def mkt(name): return tags.get(f'Marketing Team:{name}')

        def t(sprint_key, title, status, priority, assignee, reporter,
              est_h, sprint_offset_start=0, sprint_offset_done=None, task_tags=None):
            sprint = sprints[sprint_key]
            task, created = Task.objects.get_or_create(
                sprint=sprint, title=title,
                defaults=dict(
                    description=f'{title}.',
                    status=status, priority=priority,
                    assignee=users[assignee], reporter=users[reporter],
                    start_date=sprint.start_date + timedelta(days=sprint_offset_start),
                    due_date=sprint.end_date,
                    estimated_hours=Decimal(str(est_h)),
                )
            )
            if created and task_tags:
                task.tags.set([tg for tg in task_tags if tg is not None])
            tasks[title] = task
            return task

        # ── S1 – User Research (all Done)
        t('Website Redesign:Design Phase:S1 – User Research',
          'Plan user interview questions', 'Done', 'High',
          'jane_smith', 'john_doe', 3, task_tags=[eng('feature')])
        t('Website Redesign:Design Phase:S1 – User Research',
          'Conduct 10 user interviews', 'Done', 'High',
          'alice_jones', 'jane_smith', 8, task_tags=[eng('feature')])
        t('Website Redesign:Design Phase:S1 – User Research',
          'Analyse competitor websites', 'Done', 'Medium',
          'bob_wilson', 'john_doe', 4, task_tags=[eng('documentation')])
        t('Website Redesign:Design Phase:S1 – User Research',
          'Create user personas', 'Done', 'Medium',
          'jane_smith', 'john_doe', 5, task_tags=[eng('documentation')])
        t('Website Redesign:Design Phase:S1 – User Research',
          'Write research summary report', 'Done', 'Low',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('documentation')])

        # ── S2 – Wireframes (all Done)
        t('Website Redesign:Design Phase:S2 – Wireframes',
          'Create homepage wireframe', 'Done', 'High',
          'alice_jones', 'jane_smith', 6, task_tags=[eng('frontend'), eng('design')] if False else [eng('frontend')])
        t('Website Redesign:Design Phase:S2 – Wireframes',
          'Design navigation structure', 'Done', 'High',
          'alice_jones', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S2 – Wireframes',
          'Create mobile wireframes', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S2 – Wireframes',
          'Design component library sketch', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S2 – Wireframes',
          'Get stakeholder approval on wireframes', 'Done', 'Critical',
          'john_doe', 'jane_smith', 2)

        # ── S3 – Prototypes (all Done)
        t('Website Redesign:Design Phase:S3 – Prototypes',
          'Build Figma prototype — homepage', 'Done', 'High',
          'alice_jones', 'jane_smith', 8, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S3 – Prototypes',
          'Build Figma prototype — inner pages', 'Done', 'High',
          'alice_jones', 'jane_smith', 6, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S3 – Prototypes',
          'Create interactive prototype flows', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Design Phase:S3 – Prototypes',
          'Usability test prototype with 5 users', 'Done', 'High',
          'alice_jones', 'john_doe', 6, task_tags=[eng('testing')])
        t('Website Redesign:Design Phase:S3 – Prototypes',
          'Incorporate prototype feedback', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])

        # ── S4 – Project Setup (all Done)
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Scaffold Vite + React project', 'Done', 'Critical',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend'), eng('feature')])
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Configure MUI theme and design tokens', 'Done', 'High',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Set up CI/CD pipeline', 'Done', 'High',
          'bob_wilson', 'john_doe', 5, task_tags=[eng('backend')])
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Configure ESLint and TypeScript', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 2, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Write README and contributing guide', 'Done', 'Low',
          'john_doe', 'jane_smith', 2, task_tags=[eng('documentation')])
        t('Website Redesign:Frontend Development:S4 – Project Setup',
          'Set up Storybook for components', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])

        # ── S5 – Homepage (6 Done, 1 missed)
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Implement hero section', 'Done', 'High',
          'bob_wilson', 'jane_smith', 6, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Build features grid section', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Add testimonials carousel', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Build pricing section', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Implement CTA and footer', 'Done', 'High',
          'bob_wilson', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Add scroll animations', 'Done', 'Low',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S5 – Homepage',
          'Homepage SEO meta tags', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 2, task_tags=[eng('frontend')])

        # ── S6 – Inner Pages (5 Done, 3 missed)
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Build About Us page', 'Done', 'High',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Build Services page', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Build Blog listing page', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Build Contact page with form', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend'), eng('backend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Build Blog post detail page', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Add 404 and error pages', 'Done', 'Low',
          'alice_jones', 'jane_smith', 2, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Implement dark mode toggle', 'In Progress', 'Medium',
          'bob_wilson', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S6 – Inner Pages',
          'Breadcrumb navigation component', 'Done', 'Low',
          'alice_jones', 'jane_smith', 2, task_tags=[eng('frontend')])

        # ── S7 – Components & Polish (active sprint: 4 Done, 6 in various states)
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Build Button component variants', 'Done', 'High',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Build Modal component', 'Done', 'High',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Build DataTable component', 'Done', 'High',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Build DatePicker component', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Implement skeleton loaders', 'In Progress', 'Medium',
          'bob_wilson', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Add page transition animations', 'In Progress', 'Low',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Lighthouse performance optimisation', 'Review', 'High',
          'bob_wilson', 'jane_smith', 6, task_tags=[eng('performance')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Fix accessibility issues (WCAG AA)', 'Review', 'High',
          'alice_jones', 'john_doe', 5, task_tags=[eng('bug')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Responsive layout audit (mobile/tablet)', 'To-do', 'Medium',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend'), eng('testing')])
        t('Website Redesign:Frontend Development:S7 – Components & Polish',
          'Write Storybook stories for all components', 'To-do', 'Low',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('documentation')])

        # ── S8 – QA & Performance (future, no tasks needed for now)

        # ── Mobile App sprints
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Design login and register screens', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Implement JWT authentication', 'Done', 'Critical',
          'jane_smith', 'jane_smith', 8, task_tags=[eng('backend'), eng('security')])
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Add biometric login (Face ID / Fingerprint)', 'Done', 'High',
          'bob_wilson', 'jane_smith', 6, task_tags=[eng('security')])
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Implement forgot password flow', 'Done', 'Medium',
          'jane_smith', 'jane_smith', 4, task_tags=[eng('backend')])
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Write auth end-to-end tests', 'Done', 'High',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('testing')])
        t('Mobile App Development:MVP Features:M1 – Auth Flow',
          'Security audit of auth implementation', 'Done', 'Critical',
          'jane_smith', 'john_doe', 4, task_tags=[eng('security')])

        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Create dashboard layout', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Implement data widgets (charts)', 'Done', 'High',
          'jane_smith', 'jane_smith', 8, task_tags=[eng('frontend'), eng('performance')])
        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Add pull-to-refresh', 'Done', 'Medium',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Implement bottom navigation', 'Done', 'High',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Push notification integration', 'Done', 'High',
          'jane_smith', 'jane_smith', 6, task_tags=[eng('backend'), eng('feature')])
        t('Mobile App Development:MVP Features:M2 – Dashboard',
          'Offline data caching', 'Done', 'Medium',
          'bob_wilson', 'jane_smith', 5, task_tags=[eng('performance')])

        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Task list screen', 'Done', 'High',
          'alice_jones', 'jane_smith', 5, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Project detail screen', 'Done', 'High',
          'jane_smith', 'jane_smith', 6, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Task detail modal', 'In Progress', 'High',
          'bob_wilson', 'jane_smith', 6, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'User profile screen', 'In Progress', 'Medium',
          'alice_jones', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Settings screen', 'In Progress', 'Medium',
          'bob_wilson', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Search screen', 'To-do', 'High',
          'jane_smith', 'jane_smith', 4, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Notifications screen', 'To-do', 'Medium',
          'alice_jones', 'jane_smith', 3, task_tags=[eng('frontend')])
        t('Mobile App Development:MVP Features:M3 – Core Screens',
          'Dark mode support', 'To-do', 'Low',
          'bob_wilson', 'jane_smith', 4, task_tags=[eng('feature')])

        # ── API Platform sprints
        t('API Integration Platform:Core API:A1 – Foundation',
          'Set up Django project structure', 'Done', 'Critical',
          'john_doe', 'john_doe', 4, task_tags=[eng('backend')])
        t('API Integration Platform:Core API:A1 – Foundation',
          'Configure SimpleJWT authentication', 'Done', 'Critical',
          'bob_wilson', 'john_doe', 5, task_tags=[eng('backend'), eng('security')])
        t('API Integration Platform:Core API:A1 – Foundation',
          'Set up PostgreSQL database', 'Done', 'High',
          'john_doe', 'john_doe', 3, task_tags=[eng('backend')])
        t('API Integration Platform:Core API:A1 – Foundation',
          'Configure CI/CD with Docker', 'Done', 'High',
          'bob_wilson', 'john_doe', 5, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Core API:A1 – Foundation',
          'Write initial API documentation', 'Done', 'Medium',
          'diana_prince', 'john_doe', 4, task_tags=[eng('documentation')])

        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Workspace CRUD endpoints', 'Done', 'Critical',
          'john_doe', 'john_doe', 6, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Project CRUD endpoints', 'Done', 'Critical',
          'bob_wilson', 'john_doe', 6, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Task CRUD endpoints', 'Done', 'Critical',
          'john_doe', 'john_doe', 8, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Sprint and Milestone endpoints', 'Done', 'High',
          'bob_wilson', 'john_doe', 6, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Write comprehensive API tests', 'Done', 'High',
          'john_doe', 'john_doe', 8, task_tags=[eng('testing'), eng('backend')])
        t('API Integration Platform:Core API:A2 – CRUD Endpoints',
          'Add pagination and filtering', 'Done', 'High',
          'bob_wilson', 'john_doe', 4, task_tags=[eng('backend'), eng('performance')])

        t('API Integration Platform:Integration Layer:A3 – OAuth Providers',
          'Implement Google OAuth 2.0', 'Done', 'High',
          'bob_wilson', 'john_doe', 8, task_tags=[eng('backend'), eng('security')])
        t('API Integration Platform:Integration Layer:A3 – OAuth Providers',
          'Add GitHub OAuth integration', 'Done', 'High',
          'john_doe', 'john_doe', 6, task_tags=[eng('backend'), eng('security')])
        t('API Integration Platform:Integration Layer:A3 – OAuth Providers',
          'Implement Microsoft OAuth', 'Done', 'Medium',
          'bob_wilson', 'john_doe', 6, task_tags=[eng('backend'), eng('security')])
        t('API Integration Platform:Integration Layer:A3 – OAuth Providers',
          'OAuth token refresh handling', 'Done', 'High',
          'john_doe', 'john_doe', 4, task_tags=[eng('backend'), eng('security')])
        t('API Integration Platform:Integration Layer:A3 – OAuth Providers',
          'Write OAuth integration tests', 'Done', 'High',
          'bob_wilson', 'john_doe', 5, task_tags=[eng('testing')])

        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'GitHub webhook receiver endpoint', 'Done', 'High',
          'john_doe', 'john_doe', 6, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'GitLab webhook receiver endpoint', 'Done', 'High',
          'bob_wilson', 'john_doe', 5, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'HMAC signature validation', 'Done', 'Critical',
          'john_doe', 'john_doe', 4, task_tags=[eng('security'), eng('backend')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'Task auto-link from commit messages', 'In Progress', 'High',
          'bob_wilson', 'john_doe', 6, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'PR merge → task status update', 'In Progress', 'High',
          'john_doe', 'john_doe', 4, task_tags=[eng('backend'), eng('feature')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'Webhook delivery retry logic', 'To-do', 'Medium',
          'bob_wilson', 'john_doe', 4, task_tags=[eng('backend'), eng('performance')])
        t('API Integration Platform:Integration Layer:A4 – Webhooks',
          'Webhook admin dashboard', 'To-do', 'Low',
          'diana_prince', 'john_doe', 5, task_tags=[eng('feature')])

        # ── Marketing Campaign
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Design social media graphics pack', 'Done', 'High',
          'charlie_brown', 'diana_prince', 6, task_tags=[mkt('design'), mkt('social')])
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Create YouTube thumbnail templates', 'Done', 'Medium',
          'charlie_brown', 'diana_prince', 3, task_tags=[mkt('design')])
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Design email newsletter template', 'Done', 'High',
          'diana_prince', 'diana_prince', 4, task_tags=[mkt('email'), mkt('design')])
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Create display banner ads (5 sizes)', 'Done', 'Medium',
          'charlie_brown', 'diana_prince', 5, task_tags=[mkt('design')])
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Design landing page hero graphic', 'Done', 'High',
          'diana_prince', 'diana_prince', 4, task_tags=[mkt('design'), mkt('content')])
        t('Q1 Marketing Campaign:Content Creation:C1 – Visual Assets',
          'Brand guidelines document', 'Done', 'Low',
          'charlie_brown', 'diana_prince', 3, task_tags=[mkt('design'), mkt('content')])

        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write landing page hero copy', 'Done', 'Critical',
          'diana_prince', 'diana_prince', 4, task_tags=[mkt('content'), mkt('seo')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write Google Ads copy (10 variants)', 'Done', 'High',
          'charlie_brown', 'diana_prince', 5, task_tags=[mkt('content'), mkt('seo')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write email welcome sequence (5 emails)', 'In Progress', 'High',
          'diana_prince', 'diana_prince', 6, task_tags=[mkt('email'), mkt('content')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write social media captions (30 posts)', 'In Progress', 'Medium',
          'charlie_brown', 'diana_prince', 4, task_tags=[mkt('social'), mkt('content')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write blog post: "5 Ways to Boost Productivity"', 'In Progress', 'Medium',
          'diana_prince', 'diana_prince', 5, task_tags=[mkt('content'), mkt('seo')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'SEO keyword research and mapping', 'To-do', 'High',
          'charlie_brown', 'diana_prince', 4, task_tags=[mkt('seo')])
        t('Q1 Marketing Campaign:Content Creation:C2 – Copywriting',
          'Write product comparison page copy', 'To-do', 'Medium',
          'diana_prince', 'diana_prince', 4, task_tags=[mkt('content'), mkt('seo')])

        self.stdout.write(f'  Total tasks created: {len(tasks)}')
        return tasks

    # ------------------------------------------------------------------
    # BACKDATE TASKS (for cumulative flow + completion trend)
    # ------------------------------------------------------------------
    def backdate_tasks(self, tasks):
        self.stdout.write('Backdating task timestamps...')

        # Map task title patterns to (created_days_ago, updated_days_ago)
        # Done tasks get updated_at in the past; active tasks get recent updated_at
        date_map = {
            # S1 Research (100-87 days ago)
            'Plan user interview questions':         (99, 94),
            'Conduct 10 user interviews':            (97, 91),
            'Analyse competitor websites':           (96, 90),
            'Create user personas':                  (95, 89),
            'Write research summary report':         (94, 88),
            # S2 Wireframes (86-74 days ago)
            'Create homepage wireframe':             (85, 80),
            'Design navigation structure':           (84, 79),
            'Create mobile wireframes':              (83, 77),
            'Design component library sketch':       (82, 76),
            'Get stakeholder approval on wireframes':(81, 75),
            # S3 Prototypes (73-61 days ago)
            'Build Figma prototype — homepage':      (72, 68),
            'Build Figma prototype — inner pages':   (71, 67),
            'Create interactive prototype flows':    (70, 66),
            'Usability test prototype with 5 users': (69, 64),
            'Incorporate prototype feedback':        (68, 62),
            # S4 Setup (60-47 days ago)
            'Scaffold Vite + React project':         (59, 55),
            'Configure MUI theme and design tokens': (58, 54),
            'Set up CI/CD pipeline':                 (57, 53),
            'Configure ESLint and TypeScript':       (56, 52),
            'Write README and contributing guide':   (55, 51),
            'Set up Storybook for components':       (54, 48),
            # S5 Homepage (46-33 days ago)
            'Implement hero section':                (45, 41),
            'Build features grid section':           (44, 40),
            'Add testimonials carousel':             (43, 38),
            'Build pricing section':                 (42, 37),
            'Implement CTA and footer':              (41, 36),
            'Add scroll animations':                 (40, 35),
            'Homepage SEO meta tags':                (39, 34),
            # S6 Inner Pages (32-19 days ago)
            'Build About Us page':                   (31, 27),
            'Build Services page':                   (30, 26),
            'Build Blog listing page':               (29, 25),
            'Build Contact page with form':          (28, 24),
            'Build Blog post detail page':           (27, 23),
            'Add 404 and error pages':               (26, 21),
            'Implement dark mode toggle':            (25, 3),   # still in progress
            'Breadcrumb navigation component':       (24, 20),
            # S7 Components (18-active)
            'Build Button component variants':       (17, 14),
            'Build Modal component':                 (16, 12),
            'Build DataTable component':             (15, 10),
            'Build DatePicker component':            (14, 8),
            'Implement skeleton loaders':            (13, 3),   # in progress
            'Add page transition animations':        (12, 4),   # in progress
            'Lighthouse performance optimisation':   (11, 2),   # review
            'Fix accessibility issues (WCAG AA)':   (10, 2),   # review
            'Responsive layout audit (mobile/tablet)':(9, 1),  # to-do
            'Write Storybook stories for all components':(8, 1),
            # Mobile M1 (80-62 days ago)
            'Design login and register screens':     (79, 72),
            'Implement JWT authentication':          (78, 70),
            'Add biometric login (Face ID / Fingerprint)':(77, 68),
            'Implement forgot password flow':        (76, 66),
            'Write auth end-to-end tests':           (75, 65),
            'Security audit of auth implementation': (74, 63),
            # Mobile M2 (61-44 days ago)
            'Create dashboard layout':               (60, 55),
            'Implement data widgets (charts)':       (59, 52),
            'Add pull-to-refresh':                   (58, 50),
            'Implement bottom navigation':           (57, 48),
            'Push notification integration':         (56, 46),
            'Offline data caching':                  (55, 45),
            # Mobile M3 (43-active)
            'Task list screen':                      (42, 36),
            'Project detail screen':                 (41, 34),
            'Task detail modal':                     (40, 4),   # in progress
            'User profile screen':                   (39, 3),   # in progress
            'Settings screen':                       (38, 5),   # in progress
            'Search screen':                         (37, 2),   # to-do
            'Notifications screen':                  (36, 2),   # to-do
            'Dark mode support':                     (35, 2),   # to-do
            # API A1 (120-99 days ago)
            'Set up Django project structure':       (119, 112),
            'Configure SimpleJWT authentication':    (118, 110),
            'Set up PostgreSQL database':            (117, 108),
            'Configure CI/CD with Docker':           (116, 106),
            'Write initial API documentation':       (115, 104),
            # API A2 (98-61 days ago)
            'Workspace CRUD endpoints':              (97, 88),
            'Project CRUD endpoints':                (96, 85),
            'Task CRUD endpoints':                   (95, 82),
            'Sprint and Milestone endpoints':        (94, 80),
            'Write comprehensive API tests':         (93, 76),
            'Add pagination and filtering':          (92, 74),
            # API A3 (60-33 days ago)
            'Implement Google OAuth 2.0':            (59, 52),
            'Add GitHub OAuth integration':          (58, 49),
            'Implement Microsoft OAuth':             (57, 46),
            'OAuth token refresh handling':          (56, 44),
            'Write OAuth integration tests':         (55, 42),
            # API A4 (32-active)
            'GitHub webhook receiver endpoint':      (31, 24),
            'GitLab webhook receiver endpoint':      (30, 22),
            'HMAC signature validation':             (29, 20),
            'Task auto-link from commit messages':   (28, 5),   # in progress
            'PR merge → task status update':         (27, 4),   # in progress
            'Webhook delivery retry logic':          (26, 2),   # to-do
            'Webhook admin dashboard':               (25, 2),   # to-do
            # Marketing C1 (45-22 days ago)
            'Design social media graphics pack':     (44, 38),
            'Create YouTube thumbnail templates':    (43, 36),
            'Design email newsletter template':      (42, 34),
            'Create display banner ads (5 sizes)':   (41, 32),
            'Design landing page hero graphic':      (40, 30),
            'Brand guidelines document':             (39, 28),
            # Marketing C2 (21-active)
            'Write landing page hero copy':          (20, 15),
            'Write Google Ads copy (10 variants)':   (19, 12),
            'Write email welcome sequence (5 emails)':(18, 4),  # in progress
            'Write social media captions (30 posts)': (17, 3),  # in progress
            'Write blog post: "5 Ways to Boost Productivity"':(16, 3),  # in progress
            'SEO keyword research and mapping':      (15, 2),   # to-do
            'Write product comparison page copy':    (14, 2),   # to-do
        }

        updated = 0
        for title, (created_ago, updated_ago) in date_map.items():
            task = tasks.get(title)
            if task:
                Task.objects.filter(pk=task.pk).update(
                    created_at=at(ago(created_ago), 9),
                    updated_at=at(ago(updated_ago), 17),
                )
                updated += 1
        self.stdout.write(f'  Backdated {updated} task timestamps')

    # ------------------------------------------------------------------
    # ACTIVITY LOGS — burndown (active sprints) + cycle time (Done tasks)
    # ------------------------------------------------------------------
    def create_activity_logs(self, tasks, sprints, users):
        self.stdout.write('Creating activity logs...')
        count = 0

        def log_done(task, done_date, actor, sprint_obj):
            """Create a TASK_STATUS_CHANGED → Done ActivityLog entry."""
            entry = ActivityLog.objects.create(
                user=actor,
                action='TASK_STATUS_CHANGED',
                content_type='Task',
                object_id=task.id,
                old_value={'status': 'In Progress'},
                new_value={'status': 'Done'},
                extra_info={
                    'sprint_id': sprint_obj.id,
                    'old_status': 'In Progress',
                    'new_status': 'Done',
                    'sprint_name': sprint_obj.name,
                    'task_id': task.id,
                    'task_title': task.title,
                }
            )
            ActivityLog.objects.filter(pk=entry.pk).update(timestamp=at(done_date, 15))
            return entry

        # ── Burndown logs for S7 (active sprint, days -18 to +7)
        s7 = sprints.get('Website Redesign:Frontend Development:S7 – Components & Polish')
        if s7:
            s7_done = [
                (tasks.get('Build Button component variants'), ago(14), users['bob_wilson']),
                (tasks.get('Build Modal component'),          ago(12), users['alice_jones']),
                (tasks.get('Build DataTable component'),      ago(10), users['bob_wilson']),
                (tasks.get('Build DatePicker component'),     ago(8),  users['alice_jones']),
            ]
            for task, done_date, actor in s7_done:
                if task:
                    log_done(task, done_date, actor, s7)
                    count += 1

        # ── Burndown logs for A4 (active sprint, days -32 to +10)
        a4 = sprints.get('API Integration Platform:Integration Layer:A4 – Webhooks')
        if a4:
            a4_done = [
                (tasks.get('GitHub webhook receiver endpoint'), ago(24), users['john_doe']),
                (tasks.get('GitLab webhook receiver endpoint'), ago(22), users['bob_wilson']),
                (tasks.get('HMAC signature validation'),        ago(20), users['john_doe']),
            ]
            for task, done_date, actor in a4_done:
                if task:
                    log_done(task, done_date, actor, a4)
                    count += 1

        # ── Burndown logs for M3 (active sprint, days -43 to +10)
        m3 = sprints.get('Mobile App Development:MVP Features:M3 – Core Screens')
        if m3:
            m3_done = [
                (tasks.get('Task list screen'),    ago(36), users['alice_jones']),
                (tasks.get('Project detail screen'),ago(34), users['jane_smith']),
            ]
            for task, done_date, actor in m3_done:
                if task:
                    log_done(task, done_date, actor, m3)
                    count += 1

        # ── Cycle time logs for ALL Done tasks across historical sprints
        # These give the cycle_time endpoint real data
        cycle_map = {
            # title → (done_date_offset_from_sprint_end, actor_key)
            'Plan user interview questions':   (ago(94), 'jane_smith'),
            'Conduct 10 user interviews':      (ago(91), 'alice_jones'),
            'Analyse competitor websites':     (ago(90), 'bob_wilson'),
            'Create user personas':            (ago(89), 'jane_smith'),
            'Write research summary report':   (ago(88), 'alice_jones'),
            'Create homepage wireframe':       (ago(80), 'alice_jones'),
            'Design navigation structure':     (ago(79), 'alice_jones'),
            'Create mobile wireframes':        (ago(77), 'bob_wilson'),
            'Design component library sketch': (ago(76), 'alice_jones'),
            'Get stakeholder approval on wireframes': (ago(75), 'john_doe'),
            'Build Figma prototype — homepage': (ago(68), 'alice_jones'),
            'Build Figma prototype — inner pages': (ago(67), 'alice_jones'),
            'Create interactive prototype flows': (ago(66), 'bob_wilson'),
            'Usability test prototype with 5 users': (ago(64), 'alice_jones'),
            'Incorporate prototype feedback':  (ago(62), 'alice_jones'),
            'Scaffold Vite + React project':   (ago(55), 'bob_wilson'),
            'Configure MUI theme and design tokens': (ago(54), 'alice_jones'),
            'Set up CI/CD pipeline':           (ago(53), 'bob_wilson'),
            'Configure ESLint and TypeScript': (ago(52), 'bob_wilson'),
            'Write README and contributing guide': (ago(51), 'john_doe'),
            'Set up Storybook for components': (ago(48), 'alice_jones'),
            'Implement hero section':          (ago(41), 'bob_wilson'),
            'Build features grid section':     (ago(40), 'alice_jones'),
            'Add testimonials carousel':       (ago(38), 'bob_wilson'),
            'Build pricing section':           (ago(37), 'alice_jones'),
            'Implement CTA and footer':        (ago(36), 'bob_wilson'),
            'Add scroll animations':           (ago(35), 'alice_jones'),
            'Homepage SEO meta tags':          (ago(34), 'bob_wilson'),
            'Build About Us page':             (ago(27), 'bob_wilson'),
            'Build Services page':             (ago(26), 'alice_jones'),
            'Build Blog listing page':         (ago(25), 'bob_wilson'),
            'Build Contact page with form':    (ago(24), 'alice_jones'),
            'Build Blog post detail page':     (ago(23), 'bob_wilson'),
            'Add 404 and error pages':         (ago(21), 'alice_jones'),
            'Breadcrumb navigation component': (ago(20), 'alice_jones'),
            # Mobile
            'Design login and register screens': (ago(72), 'alice_jones'),
            'Implement JWT authentication':    (ago(70), 'jane_smith'),
            'Add biometric login (Face ID / Fingerprint)': (ago(68), 'bob_wilson'),
            'Implement forgot password flow':  (ago(66), 'jane_smith'),
            'Write auth end-to-end tests':     (ago(65), 'bob_wilson'),
            'Security audit of auth implementation': (ago(63), 'jane_smith'),
            'Create dashboard layout':         (ago(55), 'alice_jones'),
            'Implement data widgets (charts)': (ago(52), 'jane_smith'),
            'Add pull-to-refresh':             (ago(50), 'alice_jones'),
            'Implement bottom navigation':     (ago(48), 'bob_wilson'),
            'Push notification integration':   (ago(46), 'jane_smith'),
            'Offline data caching':            (ago(45), 'bob_wilson'),
            # API
            'Set up Django project structure': (ago(112), 'john_doe'),
            'Configure SimpleJWT authentication': (ago(110), 'bob_wilson'),
            'Set up PostgreSQL database':      (ago(108), 'john_doe'),
            'Configure CI/CD with Docker':     (ago(106), 'bob_wilson'),
            'Write initial API documentation': (ago(104), 'diana_prince'),
            'Workspace CRUD endpoints':        (ago(88), 'john_doe'),
            'Project CRUD endpoints':          (ago(85), 'bob_wilson'),
            'Task CRUD endpoints':             (ago(82), 'john_doe'),
            'Sprint and Milestone endpoints':  (ago(80), 'bob_wilson'),
            'Write comprehensive API tests':   (ago(76), 'john_doe'),
            'Add pagination and filtering':    (ago(74), 'bob_wilson'),
            'Implement Google OAuth 2.0':      (ago(52), 'bob_wilson'),
            'Add GitHub OAuth integration':    (ago(49), 'john_doe'),
            'Implement Microsoft OAuth':       (ago(46), 'bob_wilson'),
            'OAuth token refresh handling':    (ago(44), 'john_doe'),
            'Write OAuth integration tests':   (ago(42), 'bob_wilson'),
            # Marketing
            'Design social media graphics pack': (ago(38), 'charlie_brown'),
            'Create YouTube thumbnail templates': (ago(36), 'charlie_brown'),
            'Design email newsletter template':  (ago(34), 'diana_prince'),
            'Create display banner ads (5 sizes)': (ago(32), 'charlie_brown'),
            'Design landing page hero graphic':  (ago(30), 'diana_prince'),
            'Brand guidelines document':         (ago(28), 'charlie_brown'),
            'Write landing page hero copy':      (ago(15), 'diana_prince'),
            'Write Google Ads copy (10 variants)': (ago(12), 'charlie_brown'),
        }

        for title, (done_date, actor_key) in cycle_map.items():
            task = tasks.get(title)
            if not task:
                continue
            sprint_obj = task.sprint
            entry = ActivityLog.objects.create(
                user=users[actor_key],
                action='TASK_STATUS_CHANGED',
                content_type='Task',
                object_id=task.id,
                old_value={'status': 'In Progress'},
                new_value={'status': 'Done'},
                extra_info={
                    'sprint_id': sprint_obj.id,
                    'old_status': 'In Progress',
                    'new_status': 'Done',
                    'sprint_name': sprint_obj.name,
                    'task_id': task.id,
                    'task_title': title,
                }
            )
            ActivityLog.objects.filter(pk=entry.pk).update(timestamp=at(done_date, 16))
            count += 1

        self.stdout.write(f'  Created {count} activity log entries')

    # ------------------------------------------------------------------
    # TIME LOGS
    # ------------------------------------------------------------------
    def create_time_logs(self, tasks, users):
        self.stdout.write('Creating time logs...')
        count = 0

        log_data = [
            # (task_title, username, hours, days_ago, note)
            ('Implement hero section',           'bob_wilson',  3.5, 42, 'Built the HTML/CSS structure'),
            ('Implement hero section',           'bob_wilson',  2.5, 41, 'Added animations and responsiveness'),
            ('Build features grid section',      'alice_jones', 4.0, 40, 'Completed the features grid'),
            ('Build features grid section',      'alice_jones', 1.5, 39, 'Adjusted spacing and icons'),
            ('Add testimonials carousel',        'bob_wilson',  3.0, 38, 'Implemented Swiper.js carousel'),
            ('Build pricing section',            'alice_jones', 4.0, 37, 'Created 3-tier pricing component'),
            ('Implement CTA and footer',         'bob_wilson',  2.5, 36, 'Footer with links and newsletter form'),
            ('Build About Us page',              'bob_wilson',  4.5, 27, 'Team bios and company story'),
            ('Build Services page',              'alice_jones', 4.0, 26, 'Services grid with hover effects'),
            ('Build Contact page with form',     'alice_jones', 5.5, 24, 'Form validation + email integration'),
            ('Implement JWT authentication',     'jane_smith',  6.0, 70, 'Full JWT implementation with refresh'),
            ('Implement JWT authentication',     'jane_smith',  2.0, 69, 'Added token blacklist'),
            ('Add biometric login (Face ID / Fingerprint)', 'bob_wilson', 5.0, 68, 'FaceID and TouchID support'),
            ('Implement data widgets (charts)',  'jane_smith',  7.0, 52, 'Integrated chart.js widgets'),
            ('Implement data widgets (charts)',  'jane_smith',  1.5, 51, 'Fixed chart responsiveness'),
            ('Push notification integration',    'jane_smith',  5.0, 46, 'FCM integration'),
            ('Workspace CRUD endpoints',         'john_doe',    5.0, 88, 'Full CRUD with permissions'),
            ('Project CRUD endpoints',           'bob_wilson',  5.0, 85, 'Project endpoints with filtering'),
            ('Task CRUD endpoints',              'john_doe',    7.5, 82, 'Tasks with nested serializers'),
            ('Write comprehensive API tests',    'john_doe',    6.0, 76, 'Coverage at 87%'),
            ('Implement Google OAuth 2.0',       'bob_wilson',  7.0, 52, 'Full OAuth flow'),
            ('Add GitHub OAuth integration',     'john_doe',    5.5, 49, 'GitHub OAuth integration'),
            ('Design social media graphics pack','charlie_brown',5.5, 38, '120 graphics in Canva'),
            ('Design email newsletter template', 'diana_prince', 3.5, 34, 'Responsive email template'),
            ('Build Button component variants',  'bob_wilson',  3.5, 14, 'Primary/secondary/ghost variants'),
            ('Build DataTable component',        'bob_wilson',  4.5, 10, 'Sortable, filterable data table'),
            ('Lighthouse performance optimisation', 'bob_wilson', 2.0, 2, 'Score now 92/100'),
            ('GitHub webhook receiver endpoint', 'john_doe',    5.0, 24, 'Receiver with queue'),
            ('HMAC signature validation',        'john_doe',    3.0, 20, 'SHA-256 verification'),
        ]

        for task_title, username, hours, days_ago, note in log_data:
            task = tasks.get(task_title)
            user = users.get(username)
            if task and user:
                log, _ = TimeLog.objects.get_or_create(
                    task=task, user=user,
                    date=ago(days_ago),
                    defaults=dict(hours=Decimal(str(hours)), note=note)
                )
                count += 1

        self.stdout.write(f'  Created {count} time log entries')

    # ------------------------------------------------------------------
    # CHECKLISTS
    # ------------------------------------------------------------------
    def create_checklists(self, tasks):
        self.stdout.write('Creating checklists...')
        count = 0

        checklist_data = {
            'Build Contact page with form': {
                'title': 'Acceptance Criteria',
                'items': [
                    ('Form validates all required fields',       True),
                    ('Email sent on submission via SMTP',        True),
                    ('Success / error toast messages shown',     True),
                    ('Google reCAPTCHA v3 integrated',           False),
                    ('Mobile layout tested on iOS and Android',  False),
                ],
            },
            'Implement JWT authentication': {
                'title': 'Security Checklist',
                'items': [
                    ('Access token expires in 60 minutes',  True),
                    ('Refresh token rotated on each use',   True),
                    ('Old refresh tokens blacklisted',      True),
                    ('Tokens NOT stored in localStorage',   True),
                    ('Penetration test completed',          False),
                ],
            },
            'Lighthouse performance optimisation': {
                'title': 'Performance Targets',
                'items': [
                    ('Performance score ≥ 90',  True),
                    ('LCP < 2.5s',              True),
                    ('CLS < 0.1',               True),
                    ('FID < 100ms',             False),
                    ('Images all in WebP format', False),
                ],
            },
            'GitHub webhook receiver endpoint': {
                'title': 'Webhook Tasks',
                'items': [
                    ('Endpoint accepts POST requests',      True),
                    ('Parses push event payload',           True),
                    ('Parses pull_request event payload',   True),
                    ('Extracts task IDs from commit messages', False),
                    ('Retry queue for failed deliveries',   False),
                ],
            },
            'Implement data widgets (charts)': {
                'title': 'Widget Checklist',
                'items': [
                    ('Velocity bar chart',       True),
                    ('Burndown line chart',      True),
                    ('Pie chart — task status',  True),
                    ('Team workload bar chart',  False),
                    ('Cumulative flow chart',    False),
                ],
            },
        }

        for task_title, cdata in checklist_data.items():
            task = tasks.get(task_title)
            if not task:
                continue
            checklist, _ = Checklist.objects.get_or_create(
                task=task, title=cdata['title'],
                defaults={'order': 0}
            )
            for i, (text, is_checked) in enumerate(cdata['items']):
                ChecklistItem.objects.get_or_create(
                    checklist=checklist, text=text,
                    defaults=dict(is_checked=is_checked, order=i)
                )
                count += 1

        self.stdout.write(f'  Created {count} checklist items')

    # ------------------------------------------------------------------
    # COMMENTS
    # ------------------------------------------------------------------
    def create_comments(self, tasks, users):
        self.stdout.write('Creating comments...')
        count = 0
        comment_data = [
            ('Implement hero section',              'jane_smith',    'Looks great — can we add a subtle gradient overlay on the hero image?'),
            ('Implement hero section',              'bob_wilson',    'Good call @jane_smith, I\'ll add a CSS gradient overlay in the next pass.'),
            ('Implement JWT authentication',        'john_doe',      'Remember to blacklist old refresh tokens, not just issue new ones.'),
            ('Implement JWT authentication',        'jane_smith',    'Done — blacklisting is handled by rest_framework_simplejwt.token_blacklist.'),
            ('Build Contact page with form',        'alice_jones',   'The form works but needs reCAPTCHA before going to prod.'),
            ('Lighthouse performance optimisation', 'bob_wilson',    'Score improved from 68 to 92 after lazy-loading images.'),
            ('Lighthouse performance optimisation', 'john_doe',      'Great improvement! Target is 90+ so we\'re good.'),
            ('Implement Google OAuth 2.0',          'john_doe',      'Tested on staging — Google sign-in works perfectly.'),
            ('Add GitHub OAuth integration',        'bob_wilson',    'Almost done, working through the callback URL issue in local dev.'),
            ('Design social media graphics pack',   'diana_prince',  'These look professional! The brand colours are spot on.'),
            ('Design social media graphics pack',   'charlie_brown', 'Thanks! Exported all 120 graphics in PNG and WebP.'),
            ('Write landing page hero copy',        'diana_prince',  'Strong headline — AB test variants A and B are ready for review.'),
        ]
        for task_title, username, content in comment_data:
            task = tasks.get(task_title)
            user = users.get(username)
            if task and user:
                Comment.objects.get_or_create(
                    task=task, author=user, content=content
                )
                count += 1
        self.stdout.write(f'  Created {count} comments')

    # ------------------------------------------------------------------
    # GOALS / OKRs
    # ------------------------------------------------------------------
    def create_goals(self, workspaces, projects, users):
        self.stdout.write('Creating goals...')
        ws_eng = workspaces['Engineering Team']
        ws_mkt = workspaces['Marketing Team']

        goal_data = [
            {
                'workspace': ws_eng,
                'name': 'Ship Website v2 by Q2',
                'description': 'Complete the full website redesign and go live before the end of Q2.',
                'owner': users['john_doe'],
                'due_date': fwd(60),
                'targets': [
                    {
                        'name': 'Frontend development complete',
                        'type': 'task_completion',
                        'target': 100.0,
                        'project': projects['Website Redesign'],
                    },
                    {
                        'name': 'QA issues resolved',
                        'type': 'number',
                        'current': 3.0,
                        'target': 0.0,
                    },
                ],
            },
            {
                'workspace': ws_eng,
                'name': 'Mobile App v1 Release',
                'description': 'Launch the mobile app on iOS and Android App Stores.',
                'owner': users['jane_smith'],
                'due_date': fwd(50),
                'targets': [
                    {
                        'name': 'MVP feature completion',
                        'type': 'task_completion',
                        'target': 100.0,
                        'project': projects['Mobile App Development'],
                    },
                    {
                        'name': 'App Store review score',
                        'type': 'number',
                        'current': 0.0,
                        'target': 4.5,
                    },
                ],
            },
            {
                'workspace': ws_eng,
                'name': 'API Platform GA Launch',
                'description': 'General availability release of the API integration platform.',
                'owner': users['john_doe'],
                'due_date': fwd(30),
                'targets': [
                    {
                        'name': 'All integrations complete',
                        'type': 'task_completion',
                        'target': 100.0,
                        'project': projects['API Integration Platform'],
                    },
                    {
                        'name': 'API documentation coverage',
                        'type': 'number',
                        'current': 75.0,
                        'target': 100.0,
                    },
                ],
            },
            {
                'workspace': ws_mkt,
                'name': 'Q1 Campaign — 50k Leads',
                'description': 'Generate 50,000 qualified leads through the Q1 digital marketing campaign.',
                'owner': users['diana_prince'],
                'due_date': fwd(45),
                'targets': [
                    {
                        'name': 'Campaign assets ready',
                        'type': 'task_completion',
                        'target': 100.0,
                        'project': projects['Q1 Marketing Campaign'],
                    },
                    {
                        'name': 'Email subscribers',
                        'type': 'number',
                        'current': 8200.0,
                        'target': 20000.0,
                    },
                    {
                        'name': 'Ad spend budget used ($)',
                        'type': 'currency',
                        'current': 4500.0,
                        'target': 15000.0,
                    },
                ],
            },
        ]

        for gdata in goal_data:
            goal, created = Goal.objects.get_or_create(
                workspace=gdata['workspace'],
                name=gdata['name'],
                defaults=dict(
                    description=gdata['description'],
                    owner=gdata['owner'],
                    due_date=gdata['due_date'],
                )
            )
            for tdata in gdata['targets']:
                GoalTarget.objects.get_or_create(
                    goal=goal,
                    name=tdata['name'],
                    defaults=dict(
                        target_type=tdata['type'],
                        current=tdata.get('current', 0.0),
                        target=tdata['target'],
                        linked_project=tdata.get('project'),
                    )
                )
            # Recalculate goal progress
            goal.recalculate_progress()
            self.stdout.write(f'  {"Created" if created else "Exists"}: {gdata["name"]}')

    # ------------------------------------------------------------------
    # DOCS
    # ------------------------------------------------------------------
    def create_docs(self, projects, users):
        self.stdout.write('Creating docs...')
        count = 0
        doc_data = [
            (
                'Website Redesign',
                'Architecture Overview',
                users['bob_wilson'],
                '## Architecture\n\nThe website is built with **Vite + React 18 + TypeScript** and deployed on Vercel.\n\n'
                '### Tech Stack\n\n| Layer | Technology |\n|-------|------------|\n'
                '| Framework | React 18 + TypeScript |\n| Build tool | Vite 5 |\n'
                '| UI | MUI v5 + Tailwind CSS |\n| Animations | Framer Motion |\n'
                '| Hosting | Vercel |\n\n'
                '### Folder Structure\n```\nsrc/\n  components/\n  pages/\n  hooks/\n  utils/\n```\n',
            ),
            (
                'Website Redesign',
                'Design Decisions',
                users['alice_jones'],
                '## Design Decisions\n\n### Typography\n\nUsing **Inter** for body text and **Sora** for headings. '
                'Scale is based on a 1.25 modular scale.\n\n'
                '### Colour Palette\n\n| Role | Hex |\n|------|-----|\n'
                '| Primary | `#667EEA` |\n| Secondary | `#764BA2` |\n'
                '| Success | `#10B981` |\n| Warning | `#F59E0B` |\n'
                '| Error | `#EF4444` |\n\n'
                '### Spacing\n\nUsing an 8px base grid. All spacing values are multiples of 8.\n',
            ),
            (
                'Mobile App Development',
                'API Integration Notes',
                users['jane_smith'],
                '## API Integration Notes\n\n### Base URL\n\n```\nhttps://api.curiouspmo.com/api/\n```\n\n'
                '### Authentication\n\nAll requests require `Authorization: Bearer <token>` header.\n\n'
                '### Key Endpoints\n\n```\nGET  /tasks/         — list tasks\nPOST /tasks/         — create task\n'
                'GET  /dashboard/     — dashboard data\n```\n\n'
                '### Offline Support\n\nUsing **TanStack Query** with persistence to AsyncStorage for offline caching.\n',
            ),
            (
                'API Integration Platform',
                'Developer Onboarding',
                users['john_doe'],
                '## Developer Onboarding\n\n### Prerequisites\n\n- Python 3.12\n- Docker + Docker Compose\n- PostgreSQL 15\n\n'
                '### Quick Start\n\n```bash\ngit clone https://github.com/org/api-platform\ncd api-platform\ncp .env.example .env\n'
                'docker-compose up -d\npython manage.py migrate\npython manage.py seed_data\n```\n\n'
                '### Running Tests\n\n```bash\npython manage.py test\n```\n',
            ),
            (
                'Q1 Marketing Campaign',
                'Campaign Brief',
                users['diana_prince'],
                '## Q1 Campaign Brief\n\n### Objective\n\nGenerate **50,000 qualified leads** and increase brand awareness by 40% in Q1.\n\n'
                '### Target Audience\n\n- SMBs with 10-200 employees\n- Industries: Tech, Finance, Healthcare\n- Decision makers: CTOs, VPs of Engineering\n\n'
                '### Channels\n\n1. Google Search Ads\n2. LinkedIn Sponsored Content\n3. Email nurture sequence\n4. Content marketing (SEO)\n\n'
                '### Budget\n\nTotal: $15,000 | Google Ads: $8,000 | LinkedIn: $4,000 | Content: $3,000\n',
            ),
        ]
        for proj_name, title, created_by, content in doc_data:
            proj = projects.get(proj_name)
            if proj:
                doc, created = Doc.objects.get_or_create(
                    project=proj, title=title,
                    defaults=dict(content=content, created_by=created_by)
                )
                if created:
                    count += 1
        self.stdout.write(f'  Created {count} docs')

    # ------------------------------------------------------------------
    # NOTIFICATIONS
    # ------------------------------------------------------------------
    def create_notifications(self, users, tasks):
        self.stdout.write('Creating notifications...')
        count = 0
        notif_data = [
            ('john_doe',      'jane_smith',    'assigned you to "Lighthouse performance optimisation"', 'assignment'),
            ('jane_smith',    'bob_wilson',    'commented on "Implement hero section"',                  'comment'),
            ('bob_wilson',    'alice_jones',   '@mentioned you in "Build Contact page with form"',       'mention'),
            ('alice_jones',   'john_doe',      'task "Implement data widgets (charts)" is due tomorrow', 'deadline'),
            ('charlie_brown', 'diana_prince',  'assigned you to "Write email welcome sequence (5 emails)"', 'assignment'),
            ('diana_prince',  'charlie_brown', 'campaign assets review is due in 2 days',                'deadline'),
        ]
        for recipient_name, actor_name, verb, ntype in notif_data:
            recipient = users.get(recipient_name)
            actor     = users.get(actor_name)
            if recipient and actor:
                Notification.objects.get_or_create(
                    recipient=recipient, actor=actor, verb=verb,
                    defaults=dict(notification_type=ntype, read=False)
                )
                count += 1
        self.stdout.write(f'  Created {count} notifications')

    # ------------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------------
    def print_summary(self):
        self.stdout.write('\n' + '=' * 55)
        self.stdout.write(self.style.SUCCESS('Database Summary:'))
        self.stdout.write('=' * 55)
        self.stdout.write(f'  Users:         {User.objects.count()}')
        self.stdout.write(f'  Workspaces:    {Workspace.objects.count()}')
        self.stdout.write(f'  Tags:          {Tag.objects.count()}')
        self.stdout.write(f'  Projects:      {Project.objects.count()}')
        self.stdout.write(f'  Milestones:    {Milestone.objects.count()}')
        self.stdout.write(f'  Sprints:       {Sprint.objects.count()}')
        self.stdout.write(f'  Tasks:         {Task.objects.count()}')
        self.stdout.write(f'  Time Logs:     {TimeLog.objects.count()}')
        self.stdout.write(f'  Checklists:    {ChecklistItem.objects.count()} items')
        self.stdout.write(f'  Activity Logs: {ActivityLog.objects.count()}')
        self.stdout.write(f'  Goals:         {Goal.objects.count()} ({GoalTarget.objects.count()} targets)')
        self.stdout.write(f'  Docs:          {Doc.objects.count()}')
        self.stdout.write(f'  Comments:      {Comment.objects.count()}')
        self.stdout.write('=' * 55)
        self.stdout.write('\nTest accounts:')
        self.stdout.write('  Password: password123')
        self.stdout.write('  john_doe  | jane_smith | bob_wilson')
        self.stdout.write('  alice_jones | charlie_brown | diana_prince')
        self.stdout.write('=' * 55)
