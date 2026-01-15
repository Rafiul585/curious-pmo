"""
Management command to initialize the 4 core roles:
- Admin
- Project Admin  
- User
- System
"""

from django.core.management.base import BaseCommand
from pm.models.user_models import Role
from pm.models.access_models import RolePermission
from pm.utils.role_permissions import ROLE_PERMISSIONS


class Command(BaseCommand):
    help = 'Initialize the 4 core roles with their permissions'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Initializing roles...'))
        
        created_count = 0
        updated_count = 0
        
        for role_name, role_data in ROLE_PERMISSIONS.items():
            # Create or get role
            role, created = Role.objects.get_or_create(name=role_name)
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created role: {role_name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'→ Role already exists: {role_name}')
                )
            
            # Clear existing permissions
            RolePermission.objects.filter(role=role).delete()
            
            # Add permissions
            for permission in role_data['permissions']:
                RolePermission.objects.create(
                    role=role,
                    permission_type=permission
                )
            
            self.stdout.write(
                f'  Added {len(role_data["permissions"])} permissions'
            )
            self.stdout.write(
                f'  Description: {role_data["description"]}'
            )
            self.stdout.write('')  # Blank line
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Role initialization complete!'
            )
        )
        self.stdout.write(
            f'   Created: {created_count} roles'
        )
        self.stdout.write(
            f'   Updated: {updated_count} roles'
        )
        self.stdout.write('')
        
        # Display role summary
        self.stdout.write(self.style.SUCCESS('Role Summary:'))
        self.stdout.write('=' * 70)
        
        for role_name in ROLE_PERMISSIONS.keys():
            role = Role.objects.get(name=role_name)
            perm_count = RolePermission.objects.filter(role=role).count()
            self.stdout.write(
                f'{role_name:15} - {perm_count:2} permissions - {ROLE_PERMISSIONS[role_name]["description"]}'
            )
