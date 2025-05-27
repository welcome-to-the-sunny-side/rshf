#!/usr/bin/env python
"""
rebuild and seed the database with deterministic dummy data.
now commits each table separately for clearer progress feedback and to
keep transactions small and independent.
"""

import random
import time
from typing import List

import numpy as np
import requests
from faker import Faker
from sqlalchemy import func

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

# ───────────────────────────── constants / seeds ─────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
Faker.seed(SEED)
faker = Faker()

NUM_USERS = 5_000
NUM_GROUPS = 30
NUM_CONTESTS = 7  # grand total (includes the three real ones)
NUM_REPORTS = 100
NUM_ANNOUNCEMENTS = 40
DEFAULT_PASS = "devpass"

REAL_CF_CONTESTS = [2050, 2051, 2109]

# ───────────────────────────── helpers ─────────────────────────────

def banner(msg: str):
    print("\n»", msg)


def get_cf_standings(contest_id: int):
    url = "https://codeforces.com/api/contest.standings"
    banner(f"cf api → contest {contest_id}")
    try:
        resp = requests.get(url, params={"contestId": contest_id, "from": 1, "count": 2000}, timeout=10)
        data = resp.json()
    except Exception as e:
        print("   ⚠️  api error:", e)
        return None
    if data.get("status") != "OK":
        print("   ⚠️  api returned", data.get("comment", "bad status"))
        return None
    return [row["party"]["members"][0]["handle"] for row in data["result"]["rows"]]


def gather_unique_cf_handles(cids: List[int]) -> List[str]:
    handles: set[str] = set()
    for cid in cids:
        for h in get_cf_standings(cid) or []:
            handles.add(h)
    banner(f"cf handles gathered ➜ {len(handles)} unique")
    return list(handles)

# ─────────────────────── builders ───────────────────────

def build_users(cfhandles: List[str]) -> List[User]:
    banner("building users")
    users: list[User] = [
        User(user_id="negative-xp", role=Role.admin, cf_handle="negative-xp", email_id="shrey@example.com", trusted_score=88, hashed_password=hash_password(DEFAULT_PASS)),
        User(user_id="roomTemperatureIQ", role=Role.admin, cf_handle="roomTemperatureIQ", email_id="ani@example.com", trusted_score=88, hashed_password=hash_password(DEFAULT_PASS)),
    ]
    for h in cfhandles:
        uid = h
        users.append(
            User(
                user_id=uid,
                role=Role.user,
                cf_handle=h,
                atcoder_handle=None if random.random() < 0.5 else f"{uid}_ac",
                codechef_handle=None if random.random() < 0.7 else f"{uid}_cc",
                twitter_handle=None if random.random() < 0.6 else f"{uid}_tw",
                trusted_score=random.randint(0, 100),
                email_id=f"{uid}@example.com",
                hashed_password=hash_password(DEFAULT_PASS),
            )
        )
    while len(users) < NUM_USERS:
        idx = len(users) - 2
        uid = f"testUser{idx}"
        users.append(
            User(
                user_id=uid,
                role=Role.user,
                cf_handle=f"{uid}_cf",
                trusted_score=random.randint(0, 100),
                email_id=f"{uid}@example.com",
                hashed_password=hash_password(DEFAULT_PASS),
            )
        )
    print("   total users:", len(users))
    return users


def build_groups() -> List[Group]:
    banner("building groups")
    groups = [Group(group_id="main", group_name="main", group_description="all users", is_private=False)]
    for i in range(1, NUM_GROUPS):
        gid = f"g{i:02d}"
        groups.append(
            Group(
                group_id=gid,
                group_name=gid,
                group_description=faker.sentence(),
                is_private=random.random() < 0.3,
            )
        )
    print("   total groups:", len(groups))
    return groups


def build_memberships(users: List[User], groups: List[Group]) -> List[GroupMembership]:
    banner("building memberships")
    memberships: list[GroupMembership] = []
    # everyone in main
    for u in users:
        memberships.append(
            GroupMembership(
                user_id=u.user_id,
                group_id="main",
                role=Role.admin if u.user_id in {"negative-xp", "roomTemperatureIQ"} else Role.user,
                user_group_rating=random.randint(1200, 2000),
                user_group_max_rating=random.randint(1400, 2400),
            )
        )
    # other groups random subsets
    size_palette = [5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
    while len(size_palette) < NUM_GROUPS - 1:
        size_palette.append(random.randint(10, 800))
    random.shuffle(size_palette)
    uid_pool = [u.user_id for u in users]
    for grp, sz in zip(groups[1:], size_palette):
        selected = random.sample(uid_pool, sz)
        for j, uid in enumerate(selected):
            memberships.append(
                GroupMembership(
                    user_id=uid,
                    group_id=grp.group_id,
                    role=Role.admin if j == 0 else Role.user,
                    user_group_rating=1500,
                    user_group_max_rating=1500,
                )
            )
    print("   total memberships:", len(memberships))
    return memberships


def build_contests() -> List[Contest]:
    banner("building contests")
    contests = [
        Contest(
            contest_id=f"c{cid}",
            contest_name=f"Codeforces Contest {cid}",
            platform="Codeforces",
            start_time_posix=random.randint(1, 1_000_000_000),
            duration_seconds=7200,
            link=f"https://codeforces.com/contest/{cid}",
            finished=True,
            internal_contest_identifier=str(cid),
        )
        for cid in REAL_CF_CONTESTS
    ]
    for i in range(NUM_CONTESTS - len(REAL_CF_CONTESTS)):
        contests.append(
            Contest(
                contest_id=f"c{3000+i}",
                contest_name=f"CF Contest {random.randint(1000, 99999)}",
                platform="Codeforces",
                start_time_posix=random.randint(1, 100_000_000),
                duration_seconds=1_800_000,
                link="TBA",
                finished=False,
                internal_contest_identifier=str(random.randint(1000, 99999)),
            )
        )
    print("   total contests:", len(contests))
    return contests


def build_contest_participations(groups: List[Group], memberships: List[GroupMembership], contests: List[Contest]) -> List[ContestParticipation]:
    banner("building contest participations (may take a sec)")
    mem_by_group: dict[str, List[GroupMembership]] = {}
    for m in memberships:
        mem_by_group.setdefault(m.group_id, []).append(m)

    parts: list[ContestParticipation] = []
    for grp in groups:
        members = mem_by_group.get(grp.group_id, [])
        if not members:
            continue
        for m in random.sample(members, len(members) // 2):
            rating_prev = m.user_group_rating
            for contest in contests[:3]:
                rating_after = rating_prev + (1 if random.random() < 0.5 else -1) * random.randint(0, 80)
                parts.append(
                    ContestParticipation(
                        user_id=m.user_id,
                        group_id=grp.group_id,
                        contest_id=contest.contest_id,
                        rank=random.randint(1, 2000),
                        rating_before=rating_prev,
                        rating_after=rating_after,
                    )
                )
                rating_prev = rating_after
    print("   total participations:", len(parts))
    return parts


def build_reports(parts: List[ContestParticipation], memberships: List[GroupMembership]) -> List[Report]:
    banner("building reports")
    if not parts:
        print("   ⚠️  no participations → skipping report generation")
        return []
    mem_by_group: dict[str, List[GroupMembership]] = {}
    for m in memberships:
        mem_by_group.setdefault(m.group_id, []).append(m)

    reports: list[Report] = []
    while len(reports) < NUM_REPORTS:
        p = random.choice(parts)
        candidates = mem_by_group.get(p.group_id, [])
        if not candidates:
            continue
        reporter = random.choice(candidates)
        reports.append(
            Report(
                report_id=f"report{len(reports)}",
                group_id=p.group_id,
                contest_id=p.contest_id,
                reporter_user_id=reporter.user_id,
                respondent_user_id=p.user_id,
                report_description=faker.sentence(),
            )
        )
    print("   total reports:", len(reports))
    return reports


def build_announcements() -> List[Announcement]:
    banner("building announcements")
    anns = [
        Announcement(announcement_id=f"anmt{i}", group_id="main", title=faker.sentence(nb_words=6), content="x.com")
        for i in range(NUM_ANNOUNCEMENTS)
    ]
    print("   total announcements:", len(anns))
    return anns

# ───────────────────────────── orchestrator ─────────────────────────────

def commit_batch(db, objs, label: str):
    """helper to add and commit a batch with a banner"""
    if not objs:
        return
    banner(f"committing {label} ({len(objs)})")
    db.add_all(objs)
    db.commit()


def seed():
    banner("RESETTING DATABASE")
    reset_db()

    db = SessionLocal()

    t0 = time.perf_counter()
    cfhandles = gather_unique_cf_handles(REAL_CF_CONTESTS)
    users = build_users(cfhandles)
    commit_batch(db, users, "users")

    groups = build_groups()
    commit_batch(db, groups, "groups")

    memberships = build_memberships(users, groups)
    commit_batch(db, memberships, "memberships")

    contests = build_contests()
    commit_batch(db, contests, "contests")

    participations = build_contest_participations(groups, memberships, contests)
    commit_batch(db, participations, "participations")

    reports = build_reports(participations, memberships)
    commit_batch(db, reports, "reports")

    announcements = build_announcements()
    commit_batch(db, announcements, "announcements")

    print("\ndata generated in", f"{time.perf_counter() - t0:.1f}s")

    banner("row counts")
    for mdl in [User, Group, GroupMembership, Contest, ContestParticipation, Report, Announcement]:
        print(f"  {mdl.__tablename__:24} {db.query(mdl).count()}")

    banner("largest groups")
    top = (
        db.query(Group.group_name, func.count(GroupMembership.user_id))
        .join(GroupMembership, Group.group_id == GroupMembership.group_id)
        .group_by(Group.group_name)
        .order_by(func.count(GroupMembership.user_id).desc())
        .limit(3)
        .all()
    )
    for name, cnt in top:
        print(f"  {name:40} {cnt}")

    db.close()
    banner("SEED DONE – happy hacking 🛠️")


if __name__ == "__main__":
    seed()
