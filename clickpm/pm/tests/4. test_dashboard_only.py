import requests
import json
import random
import string
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def main():
    print("Testing Dashboard Overview...")
    
    # 1. Register/Login
    username = f"user_{generate_random_string()}"
    password = "TestPass123!"
    email = f"{username}@test.com"
    
    print(f"Registering {username}...")
    r = requests.post(f"{BASE_URL}/auth/register/", json={
        "username": username, "email": email, "password": password,
        "first_name": "Test", "last_name": "User"
    })
    if r.status_code != 200:
        print("Registration failed:", r.status_code, r.text)
        return
    
    print("✅ Registration successful!")

    print("Logging in...")
    r = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": username, "password": password
    })
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access']}"}
    
    # 2. Create Workspace
    print("Creating Workspace...")
    r = requests.post(f"{BASE_URL}/workspaces/", headers=headers, json={
        "name": "Test Workspace", "description": "Desc"
    })
    ws_id = r.json()['id']
    
    # 3. Create Project
    print("Creating Project...")
    r = requests.post(f"{BASE_URL}/projects/", headers=headers, json={
        "name": "Test Project", "workspace": ws_id,
        "start_date": "2025-01-01", "end_date": "2025-12-31",
        "visibility": "public"
    })
    p_id = r.json()['id']
    
    # 4. Create Milestone
    print("Creating Milestone...")
    r = requests.post(f"{BASE_URL}/milestones/", headers=headers, json={
        "name": "Test Milestone", "project": p_id,
        "start_date": "2025-01-01", "end_date": "2025-02-01"
    })
    m_id = r.json()['id']
    
    # 5. Create Sprint
    print("Creating Sprint...")
    r = requests.post(f"{BASE_URL}/sprints/", headers=headers, json={
        "name": "Test Sprint", "milestone": m_id,
        "start_date": "2025-01-01", "end_date": "2025-01-14"
    })
    s_id = r.json()['id']
    
    # 6. Create Task
    print("Creating Task...")
    r = requests.post(f"{BASE_URL}/tasks/", headers=headers, json={
        "title": "My Task", "sprint": s_id,
        "status": "To-do", "priority": "High",
        "weight_percentage": 100,
        "assignee": r.json().get('assignee') # Assign to self? No, need user ID.
    })
    # We need user ID.
    user_id = requests.get(f"{BASE_URL}/users/me/", headers=headers).json()['id']
    
    # Update task to assign to me
    t_id = r.json()['id']
    requests.patch(f"{BASE_URL}/tasks/{t_id}/", headers=headers, json={"assignee": user_id})
    
    # 7. Get Dashboard Overview
    print("\n" + "="*60)
    print("Fetching Dashboard Overview...")
    print("="*60)
    r = requests.get(f"{BASE_URL}/dashboard/overview/", headers=headers)
    
    if r.status_code == 200:
        data = r.json()
        print("\n✅ DASHBOARD OVERVIEW RESPONSE:")
        print(json.dumps(data, indent=2))
        
        print("\n" + "="*60)
        print("SUMMARY:")
        print("="*60)
        print(f"Total Projects: {len(data.get('projects', []))}")
        print(f"Assigned Tasks: {data.get('assigned_tasks_count', 0)}")
        print(f"Completed Tasks: {data.get('completed_tasks_count', 0)}")
        
        if data.get('projects'):
            for proj in data['projects']:
                print(f"\n📁 Project: {proj['name']}")
                print(f"   Status: {proj['status']}")
                print(f"   Completion: {proj['completion_percentage']}%")
                
                for milestone in proj.get('milestones', []):
                    print(f"   🚩 Milestone: {milestone['name']} ({milestone['completion_percentage']}%)")
                    
                    for sprint in milestone.get('sprints', []):
                        print(f"      🏃 Sprint: {sprint['name']} ({sprint['completion_percentage']}%)")
                        
                        my_tasks = sprint.get('my_tasks', [])
                        if my_tasks:
                            print(f"         My Tasks ({len(my_tasks)}):")
                            for task in my_tasks:
                                print(f"         ✅ {task['title']} - {task['status']} (Weight: {task['weight_percentage']}%)")
    else:
        print(f"❌ Failed to fetch dashboard: {r.status_code}")
        print(r.text)

if __name__ == "__main__":
    main()
