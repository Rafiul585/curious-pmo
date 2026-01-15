from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from pm.models.workspace_models import Workspace
from pm.models.project_models import Project
from pm.models.user_models import Role


class DynamicMultiRoleAPITest(TestCase):

    ENDPOINTS = [
        "api/", "api/users/", "api/roles/", "api/workspaces/",
        "api/projects/", "api/milestones/", "api/sprints/",
        "api/tasks/", "api/task-dependencies/", "api/notifications/",
        "api/comments/", "api/attachments/", "api/activity/",
        "api/dashboard/overview/", "api/dashboard/my_tasks/",
    ]

    def setUp(self):
        User = get_user_model()

        # -------- AUTO DETECT USERS --------
        self.superadmin = User.objects.filter(is_superuser=True).first()
        if not self.superadmin:
            self.superadmin = User.objects.create_superuser(
                username="auto_superadmin",
                email="superadmin@example.com",
                password="pass1234"
            )

        # Normal User
        self.normal_user = User.objects.filter(is_superuser=False).first()
        if not self.normal_user:
            self.normal_user = User.objects.create_user(
                username="auto_normal",
                email="normal@example.com",
                password="pass1234"
            )

        # Workspace Admin role
        ws_admin_role = Role.objects.filter(name__icontains="workspace").first()
        if ws_admin_role:
            self.wsa_user = User.objects.filter(role=ws_admin_role).first()
            if not self.wsa_user:
                self.wsa_user = User.objects.create_user(
                    username="auto_wsa",
                    email="wsa@example.com",
                    password="pass1234",
                    role=ws_admin_role
                )
        else:
            self.wsa_user = self.normal_user

        # Project Admin role
        proj_admin_role = Role.objects.filter(name__icontains="project").first()
        if proj_admin_role:
            self.pa_user = User.objects.filter(role=proj_admin_role).first()
            if not self.pa_user:
                self.pa_user = User.objects.create_user(
                    username="auto_pa",
                    email="pa@example.com",
                    password="pass1234",
                    role=proj_admin_role
                )
        else:
            self.pa_user = self.normal_user

        # -------- CREATE WORKSPACE (dynamic fields) --------

        workspace_data = {"name": "WS Test"}

        # if Workspace has owner field
        if "owner" in [f.name for f in Workspace._meta.get_fields()]:
            workspace_data["owner"] = self.superadmin

        self.workspace = Workspace.objects.create(**workspace_data)

        # -------- CREATE PROJECT (dynamic fields) --------

        project_data = {
            "name": "Project Test",
            "workspace": self.workspace
        }

        project_fields = [f.name for f in Project._meta.get_fields()]

        if "created_by" in project_fields:
            project_data["created_by"] = self.superadmin

        if "updated_by" in project_fields:
            project_data["updated_by"] = self.superadmin

        if "owner" in project_fields:
            project_data["owner"] = self.superadmin

        # Additional safe auto-fill fields if needed
        for field_name in ["manager", "lead", "owner_user"]:
            if field_name in project_fields:
                project_data[field_name] = self.superadmin

        self.project = Project.objects.create(**project_data)

        # -------- Prepare client --------
        self.client = APIClient()

        self.users_to_test = {
            "superadmin": self.superadmin,
            "workspace_admin": self.wsa_user,
            "project_admin": self.pa_user,
            "normal_user": self.normal_user
        }

    # -------------------------------------------------------

    def get_token(self, user):
        """Obtain JWT token without assuming password mismatch."""
        resp = self.client.post("/api/auth/login/", {
            "email": user.email,
            "password": "pass1234"
        })

        if resp.status_code != 200:
            print(f"⚠ Login failed for: {user.email}")
            print("Response:", resp.status_code, resp.content)
            return None

        return resp.json().get("access")

    # -------------------------------------------------------

    def test_dynamic_multi_user(self):
        print("\n===== Running Dynamic Multi-Role API Tests =====")

        for role_name, user in self.users_to_test.items():
            print(f"\n--- Testing as {role_name} ({user.email}) ---")

            token = self.get_token(user)
            if not token:
                print(f"❌ Cannot authenticate {role_name} → skipping")
                continue

            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

            for ep in self.ENDPOINTS:
                response = self.client.get("/" + ep)
                print(f"{role_name:15s} → /{ep:30s} → {response.status_code}")

            self.client.credentials()  # reset for next user
