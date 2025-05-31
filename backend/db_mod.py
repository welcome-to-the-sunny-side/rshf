import random
import time
from typing import List
from collections import defaultdict

import numpy as np
import requests
from faker import Faker
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.database import SessionLocal
from app.utils import hash_password, reset_db
from app.models import (
    Announcement,
    Contest,
    ContestParticipation,
    Group,
    GroupMembership,
    Report,
    Role,
    User,
)

def delete_group(group_id):
    """
    Delete a group from the database
    """
    # Create database engine and session
    db = SessionLocal()

    try:
        # Query the group
        group = db.query(Group).filter(Group.group_id == group_id).first()
        if group:
            # Delete the group and all related memberships
            db.delete(group)
            db.commit()
            print(f"Successfully deleted group '{group.group_name}' with ID '{group_id}'")
        else:
            print(f"Group with ID '{group_id}' not found")
    except Exception as e:
        db.rollback()
        print(f"Error deleting group: {str(e)}")
    finally:
        db.close()

def delete(contest_id):
    """
    Delete a contest from the database
    """
    # Create database engine and session
    db = SessionLocal()

    try:
        # Query the contest
        participations = db.query(ContestParticipation).filter(ContestParticipation.contest_id == contest_id)
        if participations:
            # Delete the contest and all related participations
            for participation in participations:
                db.delete(participation)
            db.commit()
            print(f"Successfully deleted contest participations for contest with ID '{contest_id}'")
        else:
            print(f"Contest with ID '{contest_id}' not found")
    except Exception as e:
        db.rollback()
        print(f"Error deleting contest: {str(e)}")

if __name__ == "__main__":
    delete("2115")
