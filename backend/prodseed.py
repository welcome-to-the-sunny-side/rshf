from app.models import *
from app.db_utils import *
import logging
logger = logging.getLogger(__name__)


def prodseed():
    BATCH = 500
    uw = {"negative-xp", "roomTemperatureIQ"}
    default_pwd = "devpass"

    reset_db()

    # ---------------------------------------------------------------- #
    # 1. Admin + group bootstrap (small, just use one session)
    # ---------------------------------------------------------------- #
    bootstrap = SessionLocal()
    bootstrap.add_all([
        User(user_id=u, role='admin', cf_handle=u,
             email_id=f"{u}@gmail.com",
             hashed_password=hash_password(default_pwd))
        for u in uw
    ])
    bootstrap.add(
        Group(group_id='main',
              group_name='main',
              group_description='A common group for all registered RSHF users',
              is_private=False)
    )
    bootstrap.commit()
    bootstrap.close()

    # ---------------------------------------------------------------- #
    # 2. Stream handles file → insert Users
    # ---------------------------------------------------------------- #
    write_users = SessionLocal()

    with open("handles.txt", encoding="utf-8") as f:
        batch = []
        for line in f:
            h = line.strip()
            if not h or h in uw:
                continue
            batch.append(
                User(user_id=h,
                     role='user',
                     cf_handle=h,
                     email_id=f"{h}@gmail.com",
                     hashed_password=hash_password(default_pwd))
            )
            if len(batch) >= BATCH:
                write_users.bulk_save_objects(batch)   # lightweight
                write_users.commit()
                batch.clear()
        if batch:
            write_users.bulk_save_objects(batch)
            write_users.commit()

    write_users.close()

    # ---------------------------------------------------------------- #
    # 3. Stream users out of the DB → insert GroupMemberships
    #    READ session streams; WRITE session commits.
    # ---------------------------------------------------------------- #
    read = SessionLocal()   # read-only
    write = SessionLocal()  # write-only

    membership_batch = []
    for uid, cf in (
        read.query(User.user_id, User.cf_handle)
            .yield_per(1000)                    # server-side cursor
            .execution_options(stream_results=True)
    ):
        membership_batch.append(
            GroupMembership(
                user_id=uid,
                group_id='main',
                role='admin' if uid in uw else 'user',
                cf_handle=cf
            )
        )
        if len(membership_batch) >= BATCH:
            write.bulk_save_objects(membership_batch)
            write.commit()
            membership_batch.clear()

    if membership_batch:
        write.bulk_save_objects(membership_batch)
        write.commit()

    read.close()
    write.close()
    logger.info("Seeding finished successfully!")

    
if __name__ == "__main__":
    prodseed()