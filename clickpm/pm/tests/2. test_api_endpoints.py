from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

class ClickPMAPITest(APITestCase):
    def setUp(self):
        # Register test user payload
        self.register_payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPass123"
        }

        # Login payload
        self.login_payload = {
            "username": "testuser",
            "password": "TestPass123"
        }

        # All endpoint URLs (add/remove as needed)
        self.endpoints = {
            "root": "/api/",
            "auth_register": "/api/auth/register/",
            "auth_login": "/api/auth/login/",
            "auth_refresh": "/api/auth/refresh/",
            "auth_change_password": "/api/auth/change-password/",
            "auth_password_reset": "/api/auth/password-reset/",
            "auth_password_reset_confirm": "/api/auth/password-reset/confirm/",
            "auth_logout": "/api/auth/logout/",

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
    # Helper: authenticate
    # -------------------------------
    def authenticate(self):
        # 1. Register
        self.client.post(self.endpoints["auth_register"], self.register_payload)

        # 2. Login
        login_res = self.client.post(self.endpoints["auth_login"], self.login_payload)
        self.assertEqual(login_res.status_code, 200, "Login failed")

        # Extract access token
        self.token = login_res.data.get("access")
        self.assertIsNotNone(self.token, "No access token returned")

        # Set Authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    # -------------------------------
    # MAIN TEST
    # -------------------------------
    def test_all_api_endpoints(self):

        print("\n\n===== CLICKPM API AUTOMATED TESTS =====\n")

        # Test API root (public)
        res = self.client.get(self.endpoints["root"])
        print(f"ROOT: {res.status_code}")
        self.assertEqual(res.status_code, 200)

        # Authenticate user
        print("\n-- Authenticating --")
        self.authenticate()
        print("Authenticated ✔")

        # Test secured endpoints
        for name, url in self.endpoints.items():
            print(f"Testing {name}: {url}")

            # Skip register/login—they were tested earlier
            if "auth_register" in name or "auth_login" in name:
                continue

            response = self.client.get(url)

            # Print and validate
            print(f"  → Status: {response.status_code}")

            # Accept these as valid for endpoints expecting POST-only
            allowed = [200, 401, 403, 405]

            self.assertIn(
                response.status_code,
                allowed,
                f"{name} ({url}) returned unexpected status {response.status_code}"
            )

        print("\n===== ALL ENDPOINTS TESTED =====\n")