#!/usr/bin/env python3
"""
Performance Pulse - Create First Boss Account
============================================
This script creates the first boss account in the system.
Run it once after setting up the application.

Usage:
    cd /app/scripts
    python create_boss.py

Requirements:
    - Backend .env file must exist at /app/backend/.env
    - MongoDB must be running
"""
import asyncio
import sys
import re
import getpass
from pathlib import Path
from datetime import datetime, timezone

# Load env before imports
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent.parent / "backend"
load_dotenv(ROOT_DIR / ".env")

import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    print("ERROR: MONGO_URL or DB_NAME not found in environment.")
    print("Make sure /app/backend/.env exists and is configured.")
    sys.exit(1)


def validate_email(email: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', email))


async def create_boss():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("\n" + "="*50)
    print("  Performance Pulse — Create Boss Account")
    print("="*50 + "\n")

    # Check for existing boss
    existing_boss = await db.profiles.find_one({"role": "boss"})
    if existing_boss:
        print(f"[!] A boss account already exists:")
        print(f"    Email: {existing_boss['email']}")
        print(f"    Name:  {existing_boss['full_name']}\n")
        confirm = input("Do you want to create an additional boss account? (yes/no): ").strip().lower()
        if confirm != "yes":
            print("Aborted. No changes made.")
            client.close()
            return

    print("Enter details for the new boss account:\n")

    # Full name
    while True:
        full_name = input("Full Name: ").strip()
        if len(full_name) >= 2:
            break
        print("  [!] Name must be at least 2 characters.\n")

    # Email
    while True:
        email = input("Email: ").strip().lower()
        if not validate_email(email):
            print("  [!] Invalid email format.\n")
            continue
        existing = await db.profiles.find_one({"email": email})
        if existing:
            print(f"  [!] Email '{email}' is already registered.\n")
            continue
        break

    # Password (hidden input)
    while True:
        password = getpass.getpass("Password (min 8 characters): ")
        if len(password) < 8:
            print("  [!] Password must be at least 8 characters.\n")
            continue
        confirm_pass = getpass.getpass("Confirm Password: ")
        if password != confirm_pass:
            print("  [!] Passwords do not match.\n")
            continue
        break

    # Hash password
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Create the account
    boss_doc = {
        "full_name": full_name,
        "email": email,
        "password_hash": hashed,
        "role": "boss",
        "status": "active",
        "department": "Management",
        "job_title": "Director",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.profiles.insert_one(boss_doc)

    if result.inserted_id:
        print("\n" + "-"*50)
        print("  Boss account created successfully!")
        print("-"*50)
        print(f"  Name:   {full_name}")
        print(f"  Email:  {email}")
        print(f"  Role:   boss")
        print(f"  Status: active")
        print("-"*50)
        print("\nYou can now log in at the Performance Pulse application.")
        print("The boss account has full dashboard access.\n")
    else:
        print("\n[ERROR] Failed to create boss account. Please try again.")

    client.close()


if __name__ == "__main__":
    asyncio.run(create_boss())
