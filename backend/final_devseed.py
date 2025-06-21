import time
import psutil
import os

start_time = time.time()
process = psutil.Process(os.getpid())

from app.models import *
from app.db_utils import *
from sqlalchemy import func
import random
from faker import Faker
from app.codeforces_api import cf_api
from app.utils import hash_password
import inspect
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session, joinedload
from app import rating
load_dotenv()
from app.cf_contest_utils import *
import logging

logger = logging.getLogger(__name__)


def devseed():
    BATCH_SIZE = 100  # Define a batch size for memory-efficient operations
    contest_ids = [1853, 1854, 1855, 1856, 1857, 1858, 1859]
    default_password = "devpass"
    seed = 32324
    random.seed(seed)
    Faker.seed(seed)
    faker = Faker()
    reset_db()
    
    # ---------------------------------------------------------------- #
    # 1. Admin users and group setup (smaller operations can use one session)
    # ---------------------------------------------------------------- #
    bootstrap = SessionLocal()
    
    # Admin users
    admin_users = [
        User(
            user_id='negative-xp',
            role='admin',
            cf_handle='negative-xp',
            email_id='nonadhocproblems@gmail.com',
            hashed_password=hash_password(default_password),
            is_registered=True
        ),
        User(
            user_id='roomTemperatureIQ',
            role='admin',
            cf_handle='roomTemperatureIQ',
            email_id='evapilotno17@gmail.com',
            hashed_password=hash_password(default_password),
            is_registered=True
        )
    ]
    
    # Groups
    groups = [
        Group(
            group_id='main',
            group_name='main',
            group_description='the main group - all users will be a part of this group',
            is_private=False
        ),
        Group(
            group_id='some_private_group',
            group_name='some_private_group',
            group_description='a group to test out private group interactions',
            is_private=True
        ),
        Group(
            group_id='some_public_group',
            group_name='some_public_group',
            group_description='a group to test out public group interactions',
            is_private=False
        )
    ]
    
    # Add initial admin users and groups
    bootstrap.add_all(admin_users)
    bootstrap.add_all(groups)
    bootstrap.commit()
    bootstrap.close()
    
    # Define user whitelist
    uw = {'negative-xp', 'roomTemperatureIQ'}
    
    # ---------------------------------------------------------------- #
    # 2. Collect handles from contest standings
    # ---------------------------------------------------------------- #
    handles = set()
    for i in contest_ids:
        st = cf_api.get_full_standings(i)
        for h in st["rows"]:
            handles.add(h["handle"])
    
    # ---------------------------------------------------------------- #
    # 3. Create regular users in batches
    # ---------------------------------------------------------------- #
    write_users = SessionLocal()
    
    user_batch = []
    for h in handles:
        if h in uw:  # Skip if handle is already an admin
            continue
            
        user_batch.append(
            User(
                user_id=h,
                role='user',
                cf_handle=h,
                email_id=h+'@gmail.com',
                hashed_password=hash_password(default_password),
                is_registered=True
            )
        )
        
        if len(user_batch) >= BATCH_SIZE:
            write_users.bulk_save_objects(user_batch)
            write_users.commit()
            user_batch.clear()  # Clear batch to free memory
            
    # Commit any remaining users
    if user_batch:
        write_users.bulk_save_objects(user_batch)
        write_users.commit()
        
    write_users.close()
    
    # ---------------------------------------------------------------- #
    # 4. Create group memberships in batches
    # ---------------------------------------------------------------- #
    read_session = SessionLocal()  # For reading users
    write_session = SessionLocal()  # For writing memberships
    
    present_in_private_grp = set(uw)  # Admin users are always in private group
    membership_batch = []
    request_batch = []
    request_counter = 0
    
    # Stream users from database to minimize memory usage
    for user_id, cf_handle in (
        read_session.query(User.user_id, User.cf_handle)
        .yield_per(1000)  # Server-side cursor
        .execution_options(stream_results=True)
    ):
        # Main group - everyone is a member
        membership_batch.append(
            GroupMembership(
                user_id=user_id,
                group_id='main',
                role='admin' if user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                cf_handle=cf_handle,
            )
        )
        
        # Private group - admins and 70% of users
        if user_id in uw or random.random() < 0.7:
            present_in_private_grp.add(user_id)
            membership_batch.append(
                GroupMembership(
                    user_id=user_id,
                    group_id='some_private_group',
                    role='admin' if user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                    cf_handle=cf_handle,
                )
            )
        else:  # Not in private group, might request to join
            if random.random() < 0.7:
                request_counter += 1
                request_batch.append(
                    Request(
                        request_id=f'rq_{request_counter}',
                        user_id=user_id,
                        group_id='some_private_group'
                    )
                )
                
        # Public group - admins and 70% of users
        if user_id in uw or random.random() < 0.7:
            membership_batch.append(
                GroupMembership(
                    user_id=user_id,
                    group_id='some_public_group',
                    role='admin' if user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                    cf_handle=cf_handle,
                )
            )
            
        # Commit batches when they reach the size limit
        if len(membership_batch) >= BATCH_SIZE:
            write_session.bulk_save_objects(membership_batch)
            write_session.commit()
            membership_batch.clear()  # Free memory
            
        if len(request_batch) >= BATCH_SIZE:
            write_session.bulk_save_objects(request_batch)
            write_session.commit()
            request_batch.clear()  # Free memory
    
    # Commit any remaining items
    if membership_batch:
        write_session.bulk_save_objects(membership_batch)
        write_session.commit()
        membership_batch.clear()
        
    if request_batch:
        write_session.bulk_save_objects(request_batch)
        write_session.commit()
        request_batch.clear()
        
    read_session.close()
    
    # ---------------------------------------------------------------- #
    # 5. Create announcements in batches
    # ---------------------------------------------------------------- #
    announcement_batch = []
    announcement_counter = 0
    
    # Store just the group IDs instead of using detached group objects
    group_ids = ['main', 'some_private_group', 'some_public_group']
    
    for group_id in group_ids:
        for i in range(30):
            announcement_counter += 1
            announcement_batch.append(
                Announcement(
                    announcement_id=f'an_{announcement_counter}',
                    user_id=random.choice(list(uw)),
                    group_id=group_id,  # Use the group_id directly
                    title=faker.sentence(nb_words=6),
                    content=faker.url()
                )
            )
            
            if len(announcement_batch) >= BATCH_SIZE:
                write_session.bulk_save_objects(announcement_batch)
                write_session.commit()
                announcement_batch.clear()  # Free memory
    
    # Commit any remaining announcements
    if announcement_batch:
        write_session.bulk_save_objects(announcement_batch)
        write_session.commit()
        
    # Add global announcements (NULL group_id)
    global_announcement_batch = []
    for i in range(5):  # Add 5 global announcements
        announcement_counter += 1
        global_announcement_batch.append(
            Announcement(
                announcement_id=f'an_global_{announcement_counter}',
                user_id=random.choice(list(uw)),
                group_id=None,  # NULL group_id for global announcements
                title=f"Global Announcement: {faker.sentence(nb_words=5)}",
                content=faker.url()
            )
        )
    
    # Save global announcements
    write_session.bulk_save_objects(global_announcement_batch)
    write_session.commit()
    
    write_session.close()
    
    # ---------------------------------------------------------------- #
    # 6. Simulate contest events
    # ---------------------------------------------------------------- #
    # Create a new session for contest events
    contest_session = SessionLocal()
    for i in contest_ids:
        simulate_contest_events(contest_session, i)
    contest_session.close()
    
    logger.info("Seeding finished successfully!")


if __name__ == "__main__":
    devseed()
    end_time = time.time()
    memory_info = process.memory_info()

    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"RSS memory: {memory_info.rss / (1024 * 1024):.2f} MB")
    