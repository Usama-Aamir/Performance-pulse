"""
Tests for seed_boss.py script — all 6 required scenarios
Run from: /app/backend
"""
import subprocess
import sys
import os
import pytest
import requests
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

BASE_URL = "https://daily-pulse-237.preview.emergentagent.com"
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
SCRIPT_PATH = str(Path(__file__).parent.parent / "scripts" / "seed_boss.py")
BOSS_CWD = str(Path(__file__).parent.parent)

TARGET_EMAIL = "seelan23@gmail.com"
VALID_PASSWORD = "TestPass123!"


def run_script(extra_env: dict = None, unset_keys: list = None):
    """Run seed_boss.py with given env overrides."""
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    if unset_keys:
        for k in unset_keys:
            env.pop(k, None)
    result = subprocess.run(
        [sys.executable, SCRIPT_PATH],
        capture_output=True, text=True, env=env, cwd=BOSS_CWD
    )
    return result


import asyncio
from datetime import datetime, timezone

def get_profile(email):
    async def _get():
        client = AsyncIOMotorClient(MONGO_URL)
        doc = await client[DB_NAME].profiles.find_one({"email": email})
        client.close()
        return doc
    return asyncio.run(_get())

def delete_profile(email):
    async def _del():
        client = AsyncIOMotorClient(MONGO_URL)
        await client[DB_NAME].profiles.delete_one({"email": email})
        client.close()
    asyncio.run(_del())

def update_profile(email, fields):
    async def _upd():
        client = AsyncIOMotorClient(MONGO_URL)
        await client[DB_NAME].profiles.update_one({"email": email}, {"$set": fields})
        client.close()
    asyncio.run(_upd())


# ── Test 1: Missing BOSS_INITIAL_PASSWORD → exit 1 ──────────────────────────

class TestMissingPassword:
    """Script exits 1 when BOSS_INITIAL_PASSWORD is not set"""

    def test_missing_password_exit_code(self):
        result = run_script(unset_keys=["BOSS_INITIAL_PASSWORD"])
        assert result.returncode == 1, f"Expected exit 1, got {result.returncode}\nSTDOUT:{result.stdout}"

    def test_missing_password_error_message(self):
        result = run_script(unset_keys=["BOSS_INITIAL_PASSWORD"])
        combined = result.stdout + result.stderr
        assert "BOSS_INITIAL_PASSWORD is not set" in combined, f"Expected error message not found.\nOutput:{combined}"

    def test_missing_password_error_prefix(self):
        result = run_script(unset_keys=["BOSS_INITIAL_PASSWORD"])
        combined = result.stdout + result.stderr
        assert "[ERROR]" in combined


# ── Test 2: Short password (< 8 chars) → exit 1 ─────────────────────────────

class TestShortPassword:
    """Script exits 1 when BOSS_INITIAL_PASSWORD < 8 chars"""

    def test_short_password_exit_code(self):
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": "short"})
        assert result.returncode == 1

    def test_short_password_error_message(self):
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": "short"})
        combined = result.stdout + result.stderr
        assert "BOSS_INITIAL_PASSWORD must be at least 8 characters" in combined, f"Output:{combined}"


# ── Test 3: Different boss exists → BLOCKED, no data change ─────────────────

class TestBlockedDifferentBoss:
    """When boss@test.com (different boss) exists, script prints BLOCKED and exits 0"""

    def test_blocked_when_different_boss_exists(self):
        # boss@test.com should already exist from seeded test data
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        combined = result.stdout + result.stderr
        assert "[BLOCKED]" in combined, f"Expected [BLOCKED].\nOutput:{combined}"

    def test_blocked_no_seelan_created(self):
        # ensure seelan23@gmail.com was NOT created during blocked run
        profile = get_profile(TARGET_EMAIL)
        assert profile is None, "seelan23@gmail.com should not exist after BLOCKED run"

    def test_blocked_exit_code_zero(self):
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        assert result.returncode == 0, f"Expected exit 0 for BLOCKED. Got {result.returncode}"


# ── Test 4: Creation path ────────────────────────────────────────────────────

class TestCreationPath:
    """Create seelan23@gmail.com boss after temporarily demoting boss@test.com"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        # Pre: demote boss@test.com so script is unblocked
        update_profile("boss@test.com", {"role": "employee"})
        yield
        # Post: restore boss@test.com and clean up seelan23
        update_profile("boss@test.com", {"role": "boss", "status": "active"})
        delete_profile(TARGET_EMAIL)

    def test_creates_profile(self):
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        combined = result.stdout + result.stderr
        assert "[CREATED]" in combined, f"Expected [CREATED].\nOutput:{combined}"
        profile = get_profile(TARGET_EMAIL)
        assert profile is not None, "Profile not found in DB"

    def test_correct_role(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        profile = get_profile(TARGET_EMAIL)
        assert profile["role"] == "boss"

    def test_correct_status(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        profile = get_profile(TARGET_EMAIL)
        assert profile["status"] == "active"

    def test_correct_full_name(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        profile = get_profile(TARGET_EMAIL)
        assert profile["full_name"] == "Mr. Seelaan"

    def test_bcrypt_password_hash(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        profile = get_profile(TARGET_EMAIL)
        assert "password_hash" in profile
        assert profile["password_hash"].startswith("$2b$"), "Not a valid bcrypt hash"
        assert bcrypt.checkpw(VALID_PASSWORD.encode(), profile["password_hash"].encode())

    def test_login_after_creation(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TARGET_EMAIL, "password": VALID_PASSWORD
        })
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
        data = resp.json()
        # API returns user fields directly (no nested "user" key)
        assert data.get("role") == "boss"


# ── Test 5: Idempotent run ───────────────────────────────────────────────────

class TestIdempotentRun:
    """Running script again on existing seelan23@gmail.com prints [UPDATED]"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        update_profile("boss@test.com", {"role": "employee"})
        # First run to create
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": VALID_PASSWORD})
        yield
        update_profile("boss@test.com", {"role": "boss", "status": "active"})
        delete_profile(TARGET_EMAIL)

    def test_idempotent_prints_updated(self):
        result = run_script(extra_env={"BOSS_INITIAL_PASSWORD": "NewPass456!"})
        combined = result.stdout + result.stderr
        assert "[UPDATED]" in combined, f"Expected [UPDATED].\nOutput:{combined}"

    def test_no_duplicate_created(self):
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": "NewPass456!"})
        async def _count():
            client = AsyncIOMotorClient(MONGO_URL)
            count = await client[DB_NAME].profiles.count_documents({"email": TARGET_EMAIL})
            client.close()
            return count
        count = asyncio.run(_count())
        assert count == 1, f"Expected 1 document, found {count}"

    def test_password_updated(self):
        new_pw = "NewPass456!"
        run_script(extra_env={"BOSS_INITIAL_PASSWORD": new_pw})
        profile = get_profile(TARGET_EMAIL)
        assert bcrypt.checkpw(new_pw.encode(), profile["password_hash"].encode())


# ── Test 6: Existing auth flows still work ───────────────────────────────────

class TestExistingAuthFlows:
    """boss@test.com, admin@test.com, employee@test.com still log in normally"""

    def test_boss_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "boss@test.com", "password": "BossTest123!"
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "boss"

    def test_admin_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com", "password": "AdminTest123!"
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    def test_employee_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "employee@test.com", "password": "Employee@1234"
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "employee"
