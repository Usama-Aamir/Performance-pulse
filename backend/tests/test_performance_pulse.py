"""
Performance Pulse Backend API Tests
Tests: auth, users, reports, dashboard stats, weekly summaries
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BOSS_EMAIL = "boss@test.com"
BOSS_PASS = "BossTest123!"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASS = "AdminTest123!"
EMP_EMAIL = "emp@test.com"
EMP_PASS = "EmpTest123!"
PENDING_EMAIL = "pending@test.com"
PENDING_PASS = "EmpTest123!"


@pytest.fixture(scope="module")
def boss_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": BOSS_EMAIL, "password": BOSS_PASS})
    assert r.status_code == 200, f"Boss login failed: {r.text}"
    return s

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s

@pytest.fixture(scope="module")
def emp_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMP_EMAIL, "password": EMP_PASS})
    assert r.status_code == 200, f"Employee login failed: {r.text}"
    return s


# Auth tests
class TestAuth:
    def test_boss_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": BOSS_EMAIL, "password": BOSS_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "boss"
        assert data["status"] == "active"

    def test_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert data["status"] == "active"

    def test_employee_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMP_EMAIL, "password": EMP_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "employee"
        assert data["status"] == "active"

    def test_pending_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PENDING_EMAIL, "password": PENDING_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@test.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_endpoint(self, emp_session=None):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={"email": BOSS_EMAIL, "password": BOSS_PASS})
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200

    def test_register_new_user(self):
        import time
        unique_email = f"TEST_newuser_{int(time.time())}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email, "password": "TestPass123!", "full_name": "TEST User"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "employee"
        assert data["status"] == "pending"


# User management tests
class TestUsers:
    def test_list_users_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_users_employee_forbidden(self, emp_session):
        r = emp_session.get(f"{BASE_URL}/api/users")
        assert r.status_code == 403

    def test_get_departments(self, emp_session):
        r = emp_session.get(f"{BASE_URL}/api/users/departments")
        assert r.status_code == 200
        data = r.json()
        assert "departments" in data


# Reports tests
class TestReports:
    def test_get_today_report(self, emp_session):
        r = emp_session.get(f"{BASE_URL}/api/reports/today")
        assert r.status_code == 200
        data = r.json()
        assert "today" in data
        assert "is_working_day" in data

    def test_get_my_reports(self, emp_session):
        r = emp_session.get(f"{BASE_URL}/api/reports/my")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_all_reports_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/reports")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_submit_report_employee(self, emp_session):
        # May fail if already submitted today or if it's a non-working day - that's fine
        r = emp_session.post(f"{BASE_URL}/api/reports", json={
            "morning_plan": "TEST morning plan",
            "final_report": "TEST final report",
            "task_category": "Admin Work",
            "task_status": "Completed",
            "calls_made": 5,
            "follow_ups": 2,
            "interested_leads": 1
        })
        assert r.status_code in [200, 409, 400]  # 409 if already submitted, 400 if non-working day


# Dashboard tests
class TestDashboard:
    def test_dashboard_stats_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_employees" in data
        assert "active_employees" in data
        assert "pending_approvals" in data
        assert "reports_today" in data
        assert "missing_today" in data
        assert "total_calls_this_week" in data
        assert "total_followups_this_week" in data
        assert "total_leads_this_week" in data

    def test_dashboard_stats_boss(self, boss_session):
        r = boss_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200

    def test_missing_today(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/missing-today")
        assert r.status_code == 200
        data = r.json()
        assert "missing_employees" in data


# Weekly summary tests
class TestWeeklySummaries:
    def test_generate_summary_admin(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/weekly-summaries/generate", json={})
        assert r.status_code == 200

    def test_list_summaries_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/weekly-summaries")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
