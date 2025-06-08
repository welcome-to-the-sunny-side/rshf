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

contest_ids = [2096, 2110, 2114, 2116, 2115, 2111]
default_password = "devpass"
seed = 88
random.seed(seed)
Faker.seed(seed)
faker = Faker()


def map_cf_contest_to_internal(cf_contest):
    contest_name = cf_contest.get("name", "Unknown Contest").lower()

    # Determine contest type based on name
    contest_type = models.ContestType.DIV1  # Default to DIV1
    if "div. 1" in contest_name or "div 1" in contest_name or "div.1" in contest_name or "global" in contest_name:
        contest_type = models.ContestType.DIV1
    elif "div. 2" in contest_name or "div 2" in contest_name or "div.2" in contest_name:
        contest_type = models.ContestType.DIV2
    elif "div. 3" in contest_name or "div 3" in contest_name or "div.3" in contest_name:
        contest_type = models.ContestType.DIV3
    elif "div. 4" in contest_name or "div 4" in contest_name or "div.4" in contest_name:
        contest_type = models.ContestType.DIV4
    elif "educational" in contest_name:
        contest_type = models.ContestType.EDU
    else:
        contest_type = models.ContestType.DIV1

    return {
        "contest_id": f"cf_{cf_contest['id']}",
        "contest_name": cf_contest.get("name", "Unknown Contest"),
        "platform": "Codeforces",
        "start_time_posix": cf_contest.get("startTimeSeconds", 0),
        "duration_seconds": cf_contest.get("durationSeconds", 0),
        "link": f"https://codeforces.com/contest/{cf_contest['id']}",
        "internal_contest_identifier": str(cf_contest["id"]),
        "finished": cf_contest.get("phase", "BEFORE") == "FINISHED",
        "contest_type": contest_type,
    }


def fetch_and_add_contest_to_db_from_cf(db, contest_id):
    print(f"🌟 Checking if contest cf_{contest_id} already lives in the DB...")

    existing = db.query(Contest).filter(Contest.contest_id == f"cf_{contest_id}").first()
    if existing:
        print("😺 contest already exists in db — skipping the hustle!")
        return existing

    print(f"🚀 Fetching full standings for contest {contest_id} from Codeforces...")
    contest_data = cf_api.get_full_standings(contest_id)

    print("📬 Standings arrived — mapping to our cozy internal format...")
    contest = Contest(
        **map_cf_contest_to_internal(contest_data['contest'])
    )

    print("💖 Adding the shiny new contest to the DB...")
    db.add(contest)
    db.commit()
    print("🎉 Contest committed — all snug and safe!")
    return contest


def update_finished_contest_from_cf(db, cf_contest_id: str):
    print(f"🔎 Retrieving contest cf_{cf_contest_id} from DB...")
    contest = (
        db.query(Contest)
        .filter(Contest.contest_id == f"cf_{cf_contest_id}")
        .first()
    )
    if contest is None:
        print("😢 contest not in db — nothing to update.")
        return

    print("🛰️ Contacting Codeforces for fresh standings...")
    standings = cf_api.get_full_standings(cf_contest_id)
    handles = [r["handle"] for r in standings["rows"]]

    print(f"👥 Pulling {len(handles)} users in a single swoop...")
    users = (
        db.query(User)
        .filter(User.cf_handle.in_(handles))
        .all()
    )
    user_by_handle = {u.cf_handle: u for u in users}

    # Bulk‑create the missing / unregistered ones
    new_users, new_memberships = [], []
    for h in handles:
        if h not in user_by_handle:
            new_users.append(
                User(user_id=h, cf_handle=h, is_registered=False)
            )
            new_memberships.append(
                GroupMembership(
                    user_id=h,
                    group_id="main",
                    cf_handle=h,
                    role="user",
                )
            )
    if new_users:
        print(f"🌱 Sprouting {len(new_users)} new baby users (and memberships)!")
    db.add_all(new_users + new_memberships)
    db.flush()  # we need their PKs in memory only

    print("📊 Gathering existing participations...")
    parts = (
        db.query(ContestParticipation)
        .filter(
            ContestParticipation.contest_id == contest.contest_id,
            ContestParticipation.user_id.in_([u.user_id for u in users]),
        )
        .all()
    )

    parts_by_user = {}
    for p in parts:
        parts_by_user.setdefault(p.user_id, []).append(p)

    print("📏 Pre‑computing group sizes for ranking magic...")
    total_members_by_group = dict(
        db.query(
            GroupMembership.group_id,
            func.count(GroupMembership.user_id),
        )
        .group_by(GroupMembership.group_id)
        .all()
    )

    print("✨ Crunching standings and updating ranks (this is pure Python, no DB)...")
    group_rank, group_views = {}, {}
    for row in standings["rows"]:
        user = user_by_handle.get(row["handle"])
        if not user or not user.is_registered:
            continue

        for part in parts_by_user.get(user.user_id, []):
            gid = part.group_id
            part.rank = group_rank[gid] = group_rank.get(gid, 0) + 1

            gv = group_views.setdefault(
                gid,
                {
                    "total_members": total_members_by_group[gid],
                    "total_participants": 0,
                },
            )
            gv["total_participants"] += 1

    print("🏁 Ranking done — time to persist!")

    contest.finished = True
    contest.standings = standings
    contest.group_views = group_views

    print("💾 Committing contest updates to DB...")
    db.commit()
    print("✅ Contest update committed — all good!")
    return contest


def update_contest_ratings_for_group(db: Session, group_id: str, contest_id: str):
    contest = db.query(models.Contest).filter(
        models.Contest.contest_id == contest_id
    ).first()

    if not contest or not contest.contest_type:
      return [] 

    valid_participations = db.query(models.ContestParticipation).filter(
        models.ContestParticipation.group_id == group_id,
        models.ContestParticipation.contest_id == contest_id,
        models.ContestParticipation.rank.isnot(None),
        models.ContestParticipation.rating_before <= contest.contest_type.rating_upper_bound
    ).all()

    updated_participations = rating.apply_codeforces_rating(valid_participations)

    for participation in updated_participations:
        if participation.user_id is not None and hasattr(participation, 'rating_after') and participation.rating_after is not None:
            membership = db.query(models.GroupMembership).filter(
                models.GroupMembership.user_id == participation.user_id,
                models.GroupMembership.group_id == group_id 
            ).first()

            if membership:
                membership.user_group_rating = participation.rating_after
                membership.user_group_max_rating = max(membership.user_group_max_rating, participation.rating_after)
    
    db.commit()
    return updated_participations



def simulate_contest_events(db, cid):
    print(f"🎲 Starting simulation for contest {cid}...")
    c = fetch_and_add_contest_to_db_from_cf(db, cid)
    if c.processed:
        print("Contest already processed")
        return

    print("🧑‍💻 Fetching standings for fake registration phase...")
    participations = []
    st = cf_api.get_full_standings(cid)['rows']
    users = db.query(User).all()
    groups = db.query(Group).all()

    print("🎯 Generating faux participations — hang tight...")

    ii = 0
    for el in st:
        ii += 1
        if ii > 1500:
            break
        h = el['handle']
        u = db.query(User).filter(
            User.cf_handle == h
        ).first()

        if not u:
            continue

        for g in groups:
            m = db.query(GroupMembership).filter(
                GroupMembership.user_id == u.user_id,
                GroupMembership.group_id == g.group_id,
            ).first()

            if not m:
                continue

            if random.random() < 0.8:
                continue

            participations.append(
                ContestParticipation(
                    user_id=u.user_id,
                    group_id=g.group_id,
                    contest_id=f'cf_{cid}',
                    cf_handle=u.cf_handle,
                    rating_before=m.user_group_rating,
                )
            )

    print(f"✏️ Generated {len(participations)} participations; adding to DB...")
    db.add_all(participations)
    db.commit()
    print("📚 Participations committed!")

    print("🔄 Updating contest with final standings and views...")
    c = update_finished_contest_from_cf(db, cid)

    print("⭐ Applying Codeforces‑style rating changes...")
    for g in groups:
        update_contest_ratings_for_group(db, g.group_id, c.contest_id)
    
    c.processed = True
    db.commit()

    print("🌟 Rating updates complete — simulation wrapped!")
    print("-"*100)





def simulate_contest_events_2(db, cid, N: int):
    
    print(f"🎲 Starting simulation for contest {cid}...")
    c = fetch_and_add_contest_to_db_from_cf(db, cid)

    if c.processed:
        print("Contest already processed")
        return

    print("🧑‍💻 Fetching standings for fake registration phase...")
    st = cf_api.get_full_standings(cid)['rows']


    print(f"Adding top {N} standings to users")
    users = db.query(User).all()
    groups = db.query(Group).all()
    already_present = {
        i.cf_handle: i for i in  users
    }

    new_users = []
    new_memberships = []
    # add the top N ppl from standings to our users and as memberships
    for i in range(min(len(st), N)):
        h = st[i]["handle"]
        if h in already_present:
            continue
        new_users.append(
            User(
                user_id=h,
                cf_handle=h,
                role='user',
                email_id=h+'@gmail.com'
            )
        )
        already_present[h] = new_users[-1]

        for g in groups:
            new_memberships.append(
                GroupMembership(
                    user_id=h,
                    cf_handle=h,
                    group_id=g.group_id,
                    role='user',
                )
            )
        
    db.add_all(new_users)
    db.add_all(new_memberships)
    db.commit()
    
    participations = []


    print("🎯 Generating faux participations — hang tight...")
    for i in range(min(len(st), N)):
        h = st[i]["handle"]
        u = already_present.get(h)
        if not u:
            continue
        for g in groups:
            m = db.query(GroupMembership).filter(
                GroupMembership.user_id == u.user_id,
                GroupMembership.group_id == g.group_id,
            ).first()

            if not m:
                continue
            participations.append(
                ContestParticipation(
                    user_id=u.user_id,
                    group_id=g.group_id,
                    contest_id=f'cf_{cid}',
                    cf_handle=u.cf_handle,
                    rating_before=m.user_group_rating,
                )
            )
                
    print(f"✏️ Generated {len(participations)} participations; adding to DB...")
    db.add_all(participations)
    db.commit()
    print("📚 Participations committed!")

    print("🔄 Updating contest with final standings and views...")
    c = update_finished_contest_from_cf(db, cid)

    print("⭐ Applying Codeforces‑style rating changes...")
    for g in groups:
        update_contest_ratings_for_group(db, g.group_id, c.contest_id)

    c.processed = True
    db.commit()

    print("🌟 Rating updates complete — simulation wrapped!")
    print("-"*100)

