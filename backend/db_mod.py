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

def create_group(group_id, group_name, creator_user_id=None, group_description=None, is_private=False):
    """
    Create a group in the database.
    Args:
        group_id (str): Unique group ID
        group_name (str): Name of the group
        creator_user_id (str, optional): User ID of the creator. If provided, adds as admin member.
        group_description (str, optional): Description of the group
        is_private (bool, optional): Whether the group is private
    Returns:
        Group: The created Group instance
    Raises:
        Exception: If group creation fails
    """
    db = SessionLocal()
    try:
        # Check if group already exists
        existing = db.query(Group).filter(Group.group_id == group_id).first()
        if existing:
            raise Exception(f"Group with id {group_id} already exists.")
        group = Group(
            group_id=group_id,
            group_name=group_name,
            group_description=group_description,
            is_private=is_private,
        )
        db.add(group)
        db.commit()
        db.refresh(group)
        # Add creator as admin member if provided
        if creator_user_id:
            membership = GroupMembership(
                user_id=creator_user_id,
                group_id=group_id,
                role=Role.admin,
                user_group_rating=0,
                user_group_max_rating=0,
            )
            db.add(membership)
            db.commit()
        return group
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


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
    create_group("haha", "haha")
