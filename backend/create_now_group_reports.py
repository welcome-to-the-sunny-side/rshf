#!/usr/bin/env python
"""Populate dummy *accepted* reports for a set of users in the "now" group.

The script:
1. Ensures every respondent exists and is (re-)added to the group so that the
   report creation succeeds.
2. Creates a report against each respondent with `reporter_user_id` =
   `amhdaimm` (who must already be in the group).
3. Immediately resolves the report as *accepted*, kicking the respondent from
   the group.

Running it again is safe – it will skip any work already done.
"""
from __future__ import annotations

from typing import List
from datetime import datetime

from app.database import SessionLocal
from app import crud, schemas, models

GROUP_ID = "now"
REPORTER = "amhdaimm"  # existing admin/member of the group
CONTEST_ID = "cf_1033"  # arbitrary, could be any string present in DB
RESPONDENTS: List[str] = [
    "hsna_agrawal",
    "hondacity",
    "heehey12",
    "AndrewNguyen",
    "scammed",
    "trungdzvcb",
    "hijkopq",
    "d_panchhili",
    "Conquerer_Arrives",
    "cyclop5",
    "top-c1coder",
]
DEFAULT_PASSWORD = "devpass"


def ensure_user(db, uid: str) -> None:
    if crud.get_user(db, uid):
        return
    crud.create_user(
        db,
        schemas.UserRegister(
            user_id=uid,
            cf_handle=uid,
            email_id=f"{uid}@example.com",
            password=DEFAULT_PASSWORD,
        ),
    )
    print(f"✓ user {uid} created")


def ensure_membership(db, uid: str) -> None:
    if crud.get_membership(db, uid, GROUP_ID):
        return
    crud.add_membership(
        db,
        schemas.GroupMembershipAdd(user_id=uid, group_id=GROUP_ID),
    )
    print(f"✓ user {uid} added to {GROUP_ID}")


def ensure_contest_exists(db) -> None:
    if crud.get_contest(db, CONTEST_ID):
        return
    crud.map_cf_contest_to_internal  # placeholder import keeps linters quiet
    # Minimal contest row (many nullable fields)
    db.add(
        models.Contest(
            contest_id=CONTEST_ID,
            contest_name="Placeholder Contest",
            platform="Codeforces",
            start_time_posix=int(datetime.utcnow().timestamp()),
            duration_seconds=7200,
            link="https://codeforces.com/contest/1033",
            internal_contest_identifier=CONTEST_ID,
            finished=True,
        )
    )
    db.commit()
    print("✓ dummy contest created")


def report_exists(db, respondent: str) -> bool:
    return (
        db.query(models.Report)
        .filter(
            models.Report.group_id == GROUP_ID,
            models.Report.respondent_cf_handle == respondent,
            models.Report.accepted == True,
        )
        .first()
        is not None
    )


def main() -> None:
    db = SessionLocal()
    try:
        ensure_contest_exists(db)
        # reporter must exist and be in group as admin.
        ensure_user(db, REPORTER)
        ensure_membership(db, REPORTER)

        for respondent in RESPONDENTS:
            if report_exists(db, respondent):
                continue

            ensure_user(db, respondent)
            ensure_membership(db, respondent)

            # 1. create report
            rpt_payload = schemas.ReportCreate(
                group_id=GROUP_ID,
                contest_id=CONTEST_ID,
                reporter_user_id=REPORTER,
                respondent_user_id=respondent,
                report_description="Cheating detected in contest.",
                accepted=False,  # initial value, will update on resolve
            )
            rpt = crud.create_report(db, rpt_payload)

            # 2. resolve (kick)
            res_payload = schemas.ReportResolve(
                report_id=rpt.report_id,
                resolver_user_id=REPORTER,
                resolve_message="Accepted – user removed for cheating.",
                respondent_role_after=models.Role.kicked,
                accepted=True,
            )
            crud.resolve_report(db, res_payload)
            print(f"✓ report {rpt.report_id} resolved – {respondent} kicked")
    finally:
        db.close()
        print("All done!")


if __name__ == "__main__":
    main()
