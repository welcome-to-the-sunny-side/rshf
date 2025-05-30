#!/usr/bin/env python
"""
Special seeder for 'main' group based on contest 2107 participants and custom contest/rating logic.
"""
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

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
Faker.seed(SEED)
faker = Faker()

DEFAULT_PASS = "devpass"

# --- Contest IDs ---
MAIN_CONTEST = 2084
PAST_CONTESTS = [2087, 2093, 2094, 2096, 2103, 2106, 2098, 2097, 2104, 2108, 2107, 2101, 2109, 2110, 2114]
# PAST_CONTESTS = [2101, 2109]
# PAST_CONTESTS = [2109]
UPCOMING_CONTEST = 2115

SPECIAL_USERS = ["negative-xp", "roomTemperatureIQ"]

def banner(msg: str):
    print("\n[1m»", msg, "\u001b[0m")


def get_cf_standings(contest_id: int):
    """Return list of (handle, rank) for each participant in the contest standings."""
    url = "https://codeforces.com/api/contest.standings"
    banner(f"cf api → contest {contest_id}")
    try:
        resp = requests.get(url, params={"contestId": contest_id, "from": 1, "count": 2000}, timeout=10)
        data = resp.json()
        time.sleep(2)
        time.sleep(2)
    except Exception as e:
        print("   ⚠️  api error:", e)
        return []
    if data.get("status") != "OK":
        print("   ⚠️  api returned", data.get("comment", "bad status"))
        return []
    result = []
    for row in data["result"]["rows"]:
        party = row["party"]
        handle = party["members"][0]["handle"]
        rank = row.get("rank")
        result.append((handle, rank))
    return result

def get_cf_rating_after_map(contest_id: int):
    """Return dict: handle -> newRating (after contest)."""
    url = "https://codeforces.com/api/contest.ratingChanges"
    banner(f"cf api → rating changes {contest_id}")
    try:
        resp = requests.get(url, params={"contestId": contest_id}, timeout=10)
        data = resp.json()
        time.sleep(2)
    except Exception as e:
        print("   ⚠️  api error:", e)
        return {}
    if data.get("status") != "OK":
        print("   ⚠️  api returned", data.get("comment", "bad status"))
        return {}
    return {row["handle"]: row["newRating"] for row in data["result"]}


def seed():
    t0 = time.perf_counter()
    reset_db()
    db = SessionLocal()

    # --- Step 0: Pre-fetch and sort contest info ---
    # Fetch contest info for MAIN_CONTEST and all PAST_CONTESTS
    def get_cf_contest_info(contest_id: int):
        url = "https://codeforces.com/api/contest.standings"
        try:
            resp = requests.get(url, params={"contestId": contest_id, "from": 1, "count": 1}, timeout=10)
            data = resp.json()
        except Exception as e:
            print(f"   ⚠️  api error (contest info for {contest_id}):", e)
            return None
        if data.get("status") != "OK":
            print(f"   ⚠️  api returned bad status for contest info {contest_id}")
            return None
        return data["result"]["contest"]

    # Fetch contest info for main and past contests
    contest_infos = []
    main_info = get_cf_contest_info(MAIN_CONTEST)
    past_infos = []
    for cid in PAST_CONTESTS:
        info = get_cf_contest_info(cid)
        if info:
            past_infos.append(info)
    # Sort past contests by startTimeSeconds
    past_infos_sorted = sorted(past_infos, key=lambda c: c.get("startTimeSeconds", 0))
    # Ensure main contest is first
    contest_infos = ([main_info] if main_info else []) + past_infos_sorted
    contest_id_set = set()
    contest_id_list = []
    for cinfo in contest_infos:
        cid = cinfo["id"]
        if cid not in contest_id_set:
            contest_id_list.append(cid)
            contest_id_set.add(cid)

    # 1. Gather main group members from contest 2107 (excluding special users)
    standings_2107 = get_cf_standings(MAIN_CONTEST)
    handles_2107 = [h for (h, _) in standings_2107 if h not in SPECIAL_USERS]
    ratings_2107_map = get_cf_rating_after_map(MAIN_CONTEST)
    ratings_2107 = {h: ratings_2107_map.get(h, 1500) for h in handles_2107}

    # Add special users manually
    all_handles = handles_2107 + SPECIAL_USERS

    print("number of handles is", len(all_handles))

    # 2. Build users
    users = []
    for h in all_handles:
        role = Role.admin if h in SPECIAL_USERS else Role.user
        email = f"{h}@example.com"
        users.append(User(user_id=h, role=role, cf_handle=h, email_id=email, hashed_password=hash_password(DEFAULT_PASS)))
    banner(f"built {len(users)} users")
    db.add_all(users)
    db.commit()

    # 2. Build groups
    groups = [Group(group_id="main", group_name="main", group_description="all users", is_private=False)]
    db.add_all(groups)
    db.commit()

    # 3. Build memberships for all users in 'main' group
    from app.models import Status
    memberships = []
    user_id_to_obj = {u.user_id: u for u in users}
    group_id_to_obj = {g.group_id: g for g in groups}
    for u in users:
        rating = ratings_2107.get(u.user_id, 0)
        if not isinstance(rating, int):
            rating = 0
        role = Role.admin if u.user_id in SPECIAL_USERS else Role.user
        membership = GroupMembership(
            user_id=u.user_id,
            group_id="main",
            cf_handle=u.cf_handle,
            role=role,
            user_group_rating=rating,
            user_group_max_rating=rating,
            status=Status.active,
        )
        memberships.append(membership)
    db.add_all(memberships)
    db.commit()

    # Refresh in-memory user objects to update their state from the database,
    # ensuring their 'memberships' relationship reflects the committed GroupMembership records.
    banner("Refreshing in-memory User objects from database")
    refreshed_count = 0
    for user_obj_in_list in users: # 'users' is the list of User objects created earlier
        try:
            db.refresh(user_obj_in_list)
            refreshed_count += 1
        except Exception as e:
            print(f"   ⚠️  Could not refresh user {user_obj_in_list.user_id}: {e}")
    print(f"   Refreshed {refreshed_count}/{len(users)} user objects in memory.")

    # 5. Add main and past contests using pre-fetched, sorted contest info
    contest_objs = []
    for cinfo in contest_infos:
        cid = cinfo["id"]
        contest = Contest(
            contest_id=str(cid),
            contest_name=cinfo.get("name", f"CF {cid}"),
            platform="Codeforces",
            start_time_posix=cinfo.get("startTimeSeconds", int(time.time())),
            duration_seconds=cinfo.get("durationSeconds", 7200),
            link=f"https://codeforces.com/contest/{cid}",
            finished=(cinfo.get("phase", "FINISHED") == "FINISHED")
        )
        db.add(contest)
        contest_objs.append(contest)
    db.commit()

    for cid in PAST_CONTESTS:
        standings = get_cf_standings(cid)
        rating_map = get_cf_rating_after_map(cid)
        # Build a mapping from handle to rank for this contest
        handle_to_rank = {handle: rank for handle, rank in standings}
        # Build a mapping from handle to rating info for this contest
        rating_info_map = {}
        url = "https://codeforces.com/api/contest.ratingChanges"
        try:
            resp = requests.get(url, params={"contestId": cid}, timeout=10)
            data = resp.json()
        except Exception as e:
            print(f"   ⚠️  api error (ratingChanges for {cid}):", e)
            data = {"status": "FAILED", "result": []}
        if data.get("status") == "OK":
            for row in data["result"]:
                handle = row["handle"]
                rating_info_map[handle] = {
                    "oldRating": row.get("oldRating"),
                    "newRating": row.get("newRating"),
                    "delta": row.get("newRating", 0) - row.get("oldRating", 0),
                    "rating_change": row.get("delta"),
                }
        for h in all_handles:
            # Only create participation if user is present in the ranklist
            if h not in handle_to_rank:
                continue
            info = rating_info_map.get(h)
            # Update group rating for member
            rating_after = info["newRating"] if info and info["newRating"] is not None else 0
            gm = db.query(GroupMembership).filter_by(user_id=h, group_id="main").first()
            if gm and rating_after is not None:
                gm.user_group_rating = rating_after
                gm.user_group_max_rating = max(gm.user_group_max_rating, rating_after)
            # Defensive: only add participation if not already present
            exists = db.query(ContestParticipation).filter_by(user_id=h, group_id="main", contest_id=str(cid)).first()
            if not exists:
                rank = handle_to_rank.get(h)
                cp = ContestParticipation(
                    user_id=h,
                    group_id="main",
                    contest_id=str(cid),
                    rank=rank,
                    delta=info["rating_change"] if info else None,
                    rating_before=info["oldRating"] if info else 0,
                    rating_after=info["newRating"] if info else 0,
                    rating_change=info["rating_change"] if info else None,
                    cf_handle=h
                )
                db.add(cp)
        db.commit()

    # 6. Add upcoming contest and random registrations
    contest_upcoming = Contest(contest_id=str(UPCOMING_CONTEST), contest_name=f"CF {UPCOMING_CONTEST}", platform="Codeforces", start_time_posix=int(time.time())+86400, duration_seconds=7200, link=f"https://codeforces.com/contest/{UPCOMING_CONTEST}", finished=False)
    db.add(contest_upcoming)
    db.commit()
    # Randomly register 60% of group members
    reg_handles = random.sample(all_handles, k=int(0.6*len(all_handles)))
    for h in reg_handles:
        cp = ContestParticipation(user_id=h, group_id="main", contest_id=str(UPCOMING_CONTEST), rank=None, delta=None, rating_before=None, rating_after=None, rating_change=None, cf_handle=h)
        db.add(cp)
    db.commit()

    # 7. Create reports (active and processed)
    banner("creating reports")
    # Pick random pairs for reports
    report_pairs = [(random.choice(all_handles), random.choice([u for u in all_handles if u != a])) for a in all_handles[:min(10, len(all_handles))]]
    reports = []
    for idx, (reporter, respondent) in enumerate(report_pairs):
        resolved = idx % 2 == 0
        resolver = random.choice(SPECIAL_USERS) if resolved else None
        report = Report(
            report_id=f"r{idx}",
            group_id="main",
            contest_id=str(PAST_CONTESTS[0]),
            reporter_user_id=reporter,
            respondent_user_id=respondent,
            reporter_cf_handle=reporter,
            respondent_cf_handle=respondent,
            report_description=faker.sentence(),
            resolved=resolved,
            resolver_user_id=resolver,
            resolver_cf_handle=resolver if resolver else None,
            accepted=bool(random.getrandbits(1)) if resolved else None
        )
        reports.append(report)
    db.add_all(reports)
    db.commit()

    # 7. Create announcements for main group
    def build_announcements(num=10):
        banner("building announcements")
        anns = [
            Announcement(announcement_id=f"anmt{i}", group_id="main", title=faker.sentence(nb_words=6), content=faker.text(max_nb_chars=100))
            for i in range(num)
        ]
        print(f"   total announcements: {len(anns)}")
        return anns
    announcements = build_announcements(num=10)
    db.add_all(announcements)
    db.commit()

    # 8. Populate group_views for each contest
    from sqlalchemy import func as sa_func
    contests = db.query(Contest).all()
    for contest in contests:
        # Participations for this contest
        participations = db.query(ContestParticipation).filter_by(contest_id=contest.contest_id).all()
        group_participants = {}
        for part in participations:
            group_participants.setdefault(part.group_id, set()).add(part.user_id)
        group_views = {}
        for group_id in group_participants:
            # Total members in group
            total_members = db.query(sa_func.count(GroupMembership.user_id)).filter_by(group_id=group_id).scalar()
            total_participants = len(group_participants[group_id])
            group_views[group_id] = {
                "total_members": total_members,
                "total_participants": total_participants
            }
        contest.group_views = group_views
    db.commit()

    print("\ndata generated in", f"{time.perf_counter() - t0:.1f}s")

    banner("SEED2 DONE – happy hacking 🛠️")

if __name__ == "__main__":
    seed()
