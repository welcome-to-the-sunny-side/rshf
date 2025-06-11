#!/usr/bin/env python3

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User

def update_user_registration_status():
    db = SessionLocal()
    try:
        # Find the user with ID "misaki-nakahara"
        user = db.query(User).filter(User.user_id == "misaki-nakahara").first()
        
        if user:
            # Update is_registered to False
            user.is_registered = False
            db.commit()
            print(f"User '{user.cf_handle}' (ID: {user.user_id}) updated:")
            print(f"  is_registered: {user.is_registered}")
            print(f"  role: {user.role}")
        else:
            print("User with ID 'misaki-nakahara' not found.")
    finally:
        db.close()

if __name__ == "__main__":
    update_user_registration_status()
