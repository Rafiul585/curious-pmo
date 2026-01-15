from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()

class ClickPMAPIBothUsersTest(APITestCase):
    def setUp(self):
        # --- Regular user ---
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regular@example.com",
            password="TestPass123"
        )

        # --- Superadmin ---
        self.superadmin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="SuperPass123"
        )

        # Endpoints to test
        self.endpoints = {
            "root": "/api/",
            "users": "/api/users/",
            "roles": "/api/roles/",
            "workspaces": "/api/workspaces/",
            "projects": "/api/projects/",
            "milestones": "/api/milestones/",
            "sprints": "/api/sprints/",
            "tasks": "/api/tasks/",
            "task_dependencies": "/api/task-dependencies/",
            "notifications": "/api/notifications/",
            "comments": "/api/comments/",
            "attachments": "/api/attachments/",
            "activity": "/api/activity/",
            "dashboard_overview": "/api/dashboard/overview/",
            "dashboard_my_tasks": "/api/dashboard/my_tasks/",
        }

    # -------------------------------
    # Helper: login a user
    # -------------------------------
    def authenticate(self, username, password):
        login_res = self.client.post("/api/auth/login/", {
            "username": username,
            "password": password
        })
        self.assertEqual(login_res.status_code, 200, f"Login failed for {username}")
        token = login_res.data.get("access")
        self.assertIsNotNone(token, f"No token returned for {username}")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # -------------------------------
    # Run tests for a user type
    # -------------------------------
    def run_endpoint_tests(self, user_label, username, password):
        print(f"\n--- Testing API as {user_label} ---")
        self.authenticate(username, password)

        for name, url in self.endpoints.items():
            response = self.client.get(url)
            print(f"{name}: {url} → Status {response.status_code}")

            # Acceptable status codes
            allowed = [200, 401, 403, 405]
            self.assertIn(response.status_code, allowed,
                          f"{name} ({url}) returned unexpected status {response.status_code}")

        # Reset client for next user
        self.client.credentials()

    # -------------------------------
    # Main Test
    # -------------------------------
    def test_both_user_types(self):
        # 1️⃣ Regular user
        self.run_endpoint_tests("Regular User", "regularuser", "TestPass123")

        # 2️⃣ Superadmin
        self.run_endpoint_tests("Superadmin", "admin", "SuperPass123")
