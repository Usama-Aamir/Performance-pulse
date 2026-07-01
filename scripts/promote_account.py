#!/usr/bin/env python3
"""
Performance Pulse - Promote Account Script
==========================================
Promotes an existing account (or creates it) to a specific role and status.
Safe to run multiple times — idempotent.

Usage:
    python promote_account.py --email boss@company.com --role boss
    python promote_account.py --email admin@company.com --role admin
    python promote_account.py --email user@company.com --role employee --status active

Arguments:
    --email     Required. The email to promote.
    --role      Required. One of: employee, admin, boss
    --status    Optional. One of: active, inactive, pending, rejected (default: active)
"""
import asyncio
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent.parent / "backend"
load_dotenv(ROOT_DIR / ".env")

import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME   = os.environ.get("DB_NAME")

VALID_ROLES    = ["employee", "admin", "boss"]
VALID_STATUSES = ["active", "inactive", "pending", "rejected"]


async def promote(email: str, role: str, status: str):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    existing = await db.profiles.find_one({"email": email})

    if existing:
        old_role   = existing.get("role", "?")
        old_status = existing.get("status", "?")
        await db.profiles.update_one(
            {"email": email},
            {"$set": {"role": role, "status": status}}
        )
        print(f"[OK] Updated '{email}'")
        print(f"     role:   {old_role} → {role}")
        print(f"     status: {old_status} → {status}")
    else:
        print(f"[!] Account '{email}' not found. To create it, sign up via the app first.")
        print("    Then re-run this script to promote the account.")
        client.close()
        sys.exit(1)

    # Confirm
    updated = await db.profiles.find_one({"email": email}, {"full_name": 1, "role": 1, "status": 1})
    print(f"\n[Confirmed] {updated.get('full_name', email)} | role={updated['role']} | status={updated['status']}")
    client.close()


def main():
    parser = argparse.ArgumentParser(description="Promote a Performance Pulse account")
    parser.add_argument("--email",  required=True, help="Account email to promote")
    parser.add_argument("--role",   required=True, choices=VALID_ROLES, help="Target role")
    parser.add_argument("--status", default="active", choices=VALID_STATUSES, help="Target status (default: active)")
    args = parser.parse_args()

    if not MONGO_URL or not DB_NAME:
        print("ERROR: MONGO_URL or DB_NAME not set in /app/backend/.env")
        sys.exit(1)

    asyncio.run(promote(args.email.strip().lower(), args.role, args.status))


if __name__ == "__main__":
    main()
