from app.models import *
from app.db_utils import *
import logging as logger

def prodseed():
    with open("handles.txt","r",encoding="utf-8") as f:
        handles = f.read().splitlines()

    default_password = "devpass"

    uw = [
        'negative-xp',
        'roomTemperatureIQ'
    ]
    users = [
        User(
            user_id='negative-xp',
            role='admin',
            cf_handle='negative-xp',
            email_id='nonadhocproblems@gmail.com',
            hashed_password=hash_password(default_password),
        ),
        User(
            user_id='roomTemperatureIQ',
            role='admin',
            cf_handle='roomTemperatureIQ',
            email_id='evapilotno17@gmail.com',
            hashed_password=hash_password(default_password),
        )
    ]

    for h in handles:
        if h in uw:
            continue
        users.append(
            User(
                user_id=h,
                role='user',
                cf_handle=h,
                email_id=h+'@gmail.com',
                hashed_password=hash_password(default_password),
            )
        )

    groups = [
        Group(
            group_id='main',
            group_name='main',
            group_description='A common group for all registered RSHF users',
            is_private=False
        ),
    ]

    memberships = []

    for u in users:
        memberships.append(
            GroupMembership(
                user_id=u.user_id,
                group_id='main',
                role='admin' if u.user_id in uw else 'user',
                cf_handle = u.cf_handle,
            )
        )

    logger.info("Resetting database...")
    reset_db()
    logger.info("Adding users...")
    db = SessionLocal()
    db.add_all(users)
    logger.info("Adding groups...")
    db.add_all(groups)
    logger.info("Adding memberships...")
    db.add_all(memberships)
    db.commit()
    db.close()
    logger.info("Database reset and seeded successfully.")

    
if __name__ == "__main__":
    prodseed()