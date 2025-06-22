#!/usr/bin/env python
"""Utility script to create a group called "now" and enrol a fixed list of
users into it.

Run this once (e.g. `python backend/create_now_group.py`) after you have your
DATABASE_URL configured so that it points at the correct Postgres instance.
The script is idempotent – running it again will have no side-effects if the
objects already exist.
"""
from __future__ import annotations

from typing import List

from app.database import SessionLocal
from app import crud, schemas

# ───────────────────────────── configuration ─────────────────────────────
GROUP_ID = "now"
USERS: List[str] = [
    "amhdaimm",
    "Yolandina",
    "limit074",
    "sudo013",
    "DrPaulVazo",
    "A_G",
    "244mhq",
]
DEFAULT_PASSWORD = "devpass"  # password for newly-created users (if needed)


def ensure_user_exists(db, user_id: str) -> None:
    """Create a minimal user row if it doesn't exist already."""
    if crud.get_user(db, user_id):
        return

    payload = schemas.UserRegister(
        user_id=user_id,
        cf_handle=user_id,
        email_id=f"{user_id}@example.com",
        password=DEFAULT_PASSWORD,
    )
    crud.create_user(db, payload)
    print(f"✓ created user {user_id}")


def ensure_group_exists(db, creator_user_id: str) -> None:
    """Create the group `now` with *creator_user_id* as its admin if missing."""
    if crud.get_group(db, GROUP_ID):
        return

    payload = schemas.GroupRegister(
        group_id=GROUP_ID,
        creator_user_id=creator_user_id,
        group_description="Created by automation script.",
        is_private=False,
        group_name=None,
    )
    crud.create_group(db, payload)
    print(f"✓ created group {GROUP_ID}")


def ensure_membership(db, user_id: str) -> None:
    """Add *user_id* to the group if they are not a member yet."""
    if crud.get_membership(db, user_id, GROUP_ID):
        return
    payload = schemas.GroupMembershipAdd(user_id=user_id, group_id=GROUP_ID)
    crud.add_membership(db, payload)
    print(f"✓ added {user_id} → {GROUP_ID}")


def main() -> None:
    db = SessionLocal()
    try:
        # 1. ensure every user exists
        for uid in USERS:
            ensure_user_exists(db, uid)

        # 2. ensure the group exists (use the first handle as creator)
        ensure_group_exists(db, USERS[0])

        # 3. add users to the group
        for uid in USERS:
            ensure_membership(db, uid)

    finally:
        db.close()
        print("Done!")


if __name__ == "__main__":
    main()
