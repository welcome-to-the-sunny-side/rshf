#!/usr/bin/env python3
"""
Utility script to count how many users in the database have `is_registered = True`.

Run it from the project root (or the `backend` directory):

    $ python count_registered_users.py
"""
from app.database import SessionLocal
from app.models import User


def main() -> None:
    """Print the total number of registered users to stdout."""
    db = SessionLocal()
    try:
        total_registered = db.query(User).filter(User.is_registered.is_(True)).count()
        print(f"Total registered users: {total_registered}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
