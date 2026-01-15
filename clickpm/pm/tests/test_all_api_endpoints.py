# C:\Users\anik_\OneDrive\Desktop\Click\clickpm\pm\tests\test_all_api_endpoints.py

from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class FullAPITest(APITestCase):
    """
    Master test suite for all API endpoints.
    Automatically:
        - Creates a user
        - Authenticates
        - Creates workspace, project, milestone, sprint, task, comment, attachment, dependency
        - Runs CRUD and key endpoint tests
    """

    def setUp(self):
        self.client = APIClient()

        # --- Create test user ---
        self.user = User.objects.create_user(
            email="test@example.com",
            password="Pass1234!",
            full_name="Test User"
        )
        self.client.force_authenticate(self.user)

        # --- Workspace ---
        ws_resp = self.client.post("/api/workspaces/", {"name": "WS 1"}, format="json")
        assert ws_resp.status_code in [200, 201], ws_resp.data
        self.workspace_id = ws_resp.data["id"]

        # --- Project ---
        proj_resp = self.client.post("/api/projects/", {
            "name": "Project X",
            "workspace": self.workspace_id
        }, format="json")
        assert proj_resp.status_code in [200, 201], proj_resp.data
        self.project_id = proj_resp.data["id"]

        # --- Milestone ---
        ms_resp = self.client.post("/api/milestones/", {
            "name": "Milestone 1",
            "project": self.project_id
        }, format="json")
        assert ms_resp.status_code in [200, 201], ms_resp.data
        self.milestone_id = ms_resp.data["id"]

        # --- Sprint ---
        sprint_resp = self.client.post("/api/sprints/", {
            "name": "Sprint Alpha",
            "milestone": self.milestone_id
        }, format="json")
        assert sprint_resp.status_code in [200, 201], sprint_resp.data
        self.sprint_id = sprint_resp.data["id"]

        # --- Task ---
        task_resp = self.client.post("/api/tasks/", {
            "title": "Task A",
            "sprint": self.sprint_id,
            "weight": 100
        }, format="json")
        assert task_resp.status_code in [200, 201], task_resp.data
        self.task_id = task_resp.data["id"]

        # --- Comment ---
        comment_resp = self.client.post("/api/comments/", {
            "task": self.task_id,
            "text": "Test comment"
        }, format="json")
        self.comment_id = comment_resp.data["id"]

        # --- Attachment ---
        attachment_resp = self.client.post("/api/attachments/", {
            "task": self.task_id,
            "file_path": "dummy.txt"
        }, format="json")
        self.attachment_id = attachment_resp.data["id"]

        # --- Task Dependency ---
        dep_resp = self.client.post("/api/task-dependencies/", {
            "task": self.task_id,
            "depends_on": self.task_id
        }, format="json")
        self.dependency_id = dep_resp.data["id"]

        # --- Role ---
        role_resp = self.client.post("/api/roles/", {"name": "Manager"}, format="json")
        self.role_id = role_resp.data["id"]

    # ---------------- Helper ----------------
    def check(self, method, url, data=None, expected_status=None):
        """
        Universal endpoint tester
        """
        http = getattr(self.client, method.lower())
        response = http(url, data=data or {}, format="json")
        print(method.upper(), url, "→", response.status_code)
        if expected_status:
            assert response.status_code == expected_status, response.data
        return response

    # ---------------- Tests ----------------
    def test_auth_endpoints(self):
        self.check("post", "/api/auth/change-password/", {
            "old_password": "Pass1234!",
            "new_password": "NewPass123!",
            "confirm_password": "NewPass123!"
        })
        self.check("post", "/api/auth/password-reset/", {"email": self.user.email})
        self.check("post", "/api/auth/logout/", {"refresh": ""})  # just test format

    def test_user_endpoints(self):
        self.check("get", "/api/users/")
        self.check("get", f"/api/users/{self.user.id}/")
        self.check("patch", f"/api/users/{self.user.id}/", {"full_name": "Updated"})
        self.check("get", "/api/users/me/")

    def test_role_endpoints(self):
        self.check("get", "/api/roles/")
        self.check("get", f"/api/roles/{self.role_id}/")
        self.check("patch", f"/api/roles/{self.role_id}/", {"name": "Updated Role"})
        self.check("post", f"/api/roles/{self.role_id}/assign_permission/", {"permission": "view_project"})
        self.check("get", f"/api/roles/{self.role_id}/list_permissions/")

    def test_workspace_endpoints(self):
        wid = self.workspace_id
        self.check("get", "/api/workspaces/")
        self.check("get", f"/api/workspaces/{wid}/")
        self.check("patch", f"/api/workspaces/{wid}/", {"name": "Updated WS"})
        self.check("post", f"/api/workspaces/{wid}/add_member/", {"user": self.user.id})
        self.check("post", f"/api/workspaces/{wid}/remove_member/", {"user": self.user.id})
        self.check("get", "/api/workspaces/my_workspaces/")

    def test_project_endpoints(self):
        pid = self.project_id
        self.check("get", "/api/projects/")
        self.check("get", f"/api/projects/{pid}/")
        self.check("patch", f"/api/projects/{pid}/", {"name": "Updated Project"})
        self.check("get", "/api/projects/my_projects/")

    def test_milestone_endpoints(self):
        mid = self.milestone_id
        self.check("get", "/api/milestones/")
        self.check("get", f"/api/milestones/{mid}/")
        self.check("patch", f"/api/milestones/{mid}/", {"name": "Updated Milestone"})

    def test_sprint_endpoints(self):
        sid = self.sprint_id
        self.check("get", "/api/sprints/")
        self.check("get", f"/api/sprints/{sid}/")
        self.check("patch", f"/api/sprints/{sid}/", {"name": "Updated Sprint"})

    def test_task_endpoints(self):
        tid = self.task_id
        self.check("get", "/api/tasks/")
        self.check("get", f"/api/tasks/{tid}/")
        self.check("patch", f"/api/tasks/{tid}/", {"title": "Updated Task"})

    def test_task_dependency_endpoints(self):
        dep = self.dependency_id
        self.check("get", "/api/task-dependencies/")
        self.check("get", f"/api/task-dependencies/{dep}/")
        self.check("patch", f"/api/task-dependencies/{dep}/", {"depends_on": self.task_id})

    def test_comment_endpoints(self):
        cid = self.comment_id
        self.check("get", "/api/comments/")
        self.check("get", f"/api/comments/{cid}/")
        self.check("patch", f"/api/comments/{cid}/", {"text": "Updated"})
        self.check("get", "/api/comments/my_comments/")

    def test_attachment_endpoints(self):
        aid = self.attachment_id
        self.check("get", "/api/attachments/")
        self.check("get", f"/api/attachments/{aid}/")
        self.check("patch", f"/api/attachments/{aid}/", {"file_path": "new.txt"})
