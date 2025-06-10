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



def devseed():
    contest_ids = [1853, 1854, 1855, 1856, 1857, 1858, 1859]
    default_password = "devpass"
    seed = 32324
    random.seed(seed)
    Faker.seed(seed)
    faker = Faker()
    reset_db()
    db = SessionLocal()

    handles = set()
    for i in contest_ids:
        st = cf_api.get_full_standings(i)
        for h in st["rows"]:
            handles.add(h["handle"])

    # populate users

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
        users.append(
            User(
                user_id=h,
                role='user',
                cf_handle=h,
                email_id=h+'@gmail.com',
                hashed_password=hash_password(default_password),
            )
        )

    # we will create three groups for now

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

    # populate memberships and some join requests

    memberships = []
    present_in_private_grp = set()

    for u in users:
        # main group
        memberships.append(
            GroupMembership(
                user_id=u.user_id,
                group_id='main',
                role='admin' if u.user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                cf_handle = u.cf_handle,
            )
        )

        # private grp
        if u.user_id in uw or random.random() < 0.7:
            present_in_private_grp.add(u.user_id)
            memberships.append(
                GroupMembership(
                    user_id=u.user_id,
                    group_id='some_private_group',
                    role='admin' if u.user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                    cf_handle = u.cf_handle,
                )
            )

        # public grp
        if u.user_id in uw or random.random() < 0.7:
            memberships.append(
                GroupMembership(
                    user_id=u.user_id,
                    group_id='some_public_group',
                    role='admin' if u.user_id in uw else ('moderator' if random.random() < 0.01 else 'user'),
                    cf_handle = u.cf_handle,
                )
            )

    requests = []
    for u in users:
        if u.user_id in present_in_private_grp:
            continue
        if random.random() < 0.7:
            requests.append(
                Request(
                    request_id = f'rq_{len(requests)+1}',
                    user_id = u.user_id,
                    group_id = 'some_private_group'
                )
            )

    # populate some announcements
    announcements = []
    for grp in groups:
        for i in range(30):
            announcements.append(
                Announcement(
                    announcement_id = f'an_{len(announcements)+1}',
                    user_id = random.choice(uw),
                    group_id = grp.group_id,
                    title = faker.sentence(nb_words=6),
                    content = faker.url()
                )
            )


    db.add_all(users)
    db.add_all(groups)
    db.commit()
    db.add_all(memberships)
    db.add_all(requests)
    db.add_all(announcements)
    db.commit()

    for i in contest_ids:
        simulate_contest_events(db, i)


if __name__ == "__main__":
    devseed()
    