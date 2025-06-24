#!/usr/bin/env python3
"""
Utility script to list all users whose `is_registered` flag is True.

Run it from the project root (or the `backend` directory):

    $ python list_registered_users.py
"""
from typing import List

from app.database import SessionLocal
from app.models import User


def main() -> None:
    """Query the database and print each registered user's identifier and cf_handle."""
    db = SessionLocal()
    try:
        registered_users: List[User] = db.query(User).filter(User.is_registered.is_(True)).all()
        if not registered_users:
            print("No registered users found.")
            return

        print(f"Found {len(registered_users)} registered users:\n")
        for usr in registered_users:
            print(f"user_id: {usr.user_id}\tcf_handle: {usr.cf_handle}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
