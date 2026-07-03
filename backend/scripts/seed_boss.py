#!/usr/bin/env python3
"""
Performance Pulse — Production Boss Account Seed Script
========================================================
Creates or updates the first boss account using environment variables only.
No interactive prompts. Safe to run from Render Shell.

Required environment variables:
    MONGO_URL              MongoDB Atlas connection string
    DB_NAME                Database name
    BOSS_INITIAL_PASSWORD  Password for the boss account (min 8 chars)

Usage (Render Shell):
    cd /opt/render/project/src/backend
    BOSS_INITIAL_PASSWORD=YourStrongPassword python scripts/seed_boss.py

After running:
    - Verify login works on the frontend
    - Remove BOSS_INITIAL_PASSWORD from Render environment variables
"""

import asyncio
import sys
import os
import bcrypt
from datetime import datetime, timezone
from pathlib import Path

# Load .env if present (local runs); on Render env vars are already in environment
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

from motor.motor_asyncio import AsyncIOMotorClient

# ── Boss account details (fixed for this deployment) ──
BOSS_FULL_NAME  = "Mr. Seelaan"
BOSS_EMAIL      = "seelan23@gmail.com"
BOSS_DEPARTMENT = "Management"
BOSS_JOB_TITLE  = "Director"

def main_guard():
    """Validate all required env vars before connecting to MongoDB."""
    mongo_url = os.environ.get("MONGO_URL", "").strip()
    db_name   = os.environ.get("DB_NAME", "").strip()
    password  = os.environ.get("BOSS_INITIAL_PASSWORD", "").strip()

    errors = []
    if not mongo_url:
        errors.append("  MONGO_URL is not set")
    if not db_name:
        errors.append("  DB_NAME is not set")
    if not password:
        errors.append("  BOSS_INITIAL_PASSWORD is not set")
    elif len(password) < 8:
        errors.append("  BOSS_INITIAL_PASSWORD must be at least 8 characters")

    if errors:
        print("\n[ERROR] Missing or invalid environment variables:")
        for e in errors:
            print(e)
        print("\nSet the variables and re-run the script.")
        sys.exit(1)

    return mongo_url, db_name, password


async def seed(mongo_url: str, db_name: str, password: str):
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    db = client[db_name]

    print(f"\n[INFO] Connected to database: {db_name}")
    print(f"[INFO] Target email: {BOSS_EMAIL}\n")

    # ── Guard: check for any OTHER boss account ──────────────────────────────
    other_boss = await db.profiles.find_one({
        "role": "boss",
        "email": {"$ne": BOSS_EMAIL}
    })
    if other_boss:
        print("[BLOCKED] A different boss account already exists:")
        print(f"          Email: {other_boss['email']}")
        print(f"          Name:  {other_boss['full_name']}")
        print("\nThis script only creates the account for seelan23@gmail.com.")
        print("No changes were made.")
        client.close()
        sys.exit(0)

    # ── Hash password using same bcrypt method as server.py ──────────────────
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    # ── Upsert: create or update the account ─────────────────────────────────
    existing = await db.profiles.find_one({"email": BOSS_EMAIL})

    if existing:
        old_role   = existing.get("role", "?")
        old_status = existing.get("status", "?")
        await db.profiles.update_one(
            {"email": BOSS_EMAIL},
            {"$set": {
                "full_name":     BOSS_FULL_NAME,
                "role":          "boss",
                "status":        "active",
                "department":    BOSS_DEPARTMENT,
                "job_title":     BOSS_JOB_TITLE,
                "password_hash": password_hash,
            }}
        )
        print("[UPDATED] Existing account promoted to boss:")
        print(f"  role:   {old_role} → boss")
        print(f"  status: {old_status} → active")
    else:
        result = await db.profiles.insert_one({
            "full_name":     BOSS_FULL_NAME,
            "email":         BOSS_EMAIL,
            "password_hash": password_hash,
            "role":          "boss",
            "status":        "active",
            "department":    BOSS_DEPARTMENT,
            "job_title":     BOSS_JOB_TITLE,
            "created_at":    datetime.now(timezone.utc).isoformat(),
            "phone":         "",
            "profile_remarks": "",
        })
        print(f"[CREATED] New boss account inserted (id: {result.inserted_id})")

    # ── Confirm final state ───────────────────────────────────────────────────
    confirmed = await db.profiles.find_one(
        {"email": BOSS_EMAIL},
        {"password_hash": 0}
    )
    print("\n" + "─" * 48)
    print("  Boss account is ready")
    print("─" * 48)
    print(f"  Full Name : {confirmed['full_name']}")
    print(f"  Email     : {confirmed['email']}")
    print(f"  Role      : {confirmed['role']}")
    print(f"  Status    : {confirmed['status']}")
    print(f"  Department: {confirmed['department']}")
    print("─" * 48)
    print("\n[NEXT] Log in at your frontend URL to verify.")
    print("[NEXT] Then remove BOSS_INITIAL_PASSWORD from Render env vars.\n")

    client.close()


if __name__ == "__main__":
    mongo_url, db_name, password = main_guard()
    asyncio.run(seed(mongo_url, db_name, password))
