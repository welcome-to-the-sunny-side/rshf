
"""
port of mike mirzayanov's codeforces ratingchange algorithm
adapted for `ContestParticipation` sqlalchemy objects.

public entry:
    apply_codeforces_rating(participations: list[ContestParticipation]) -> list[ContestParticipation]

`participations` must all share the same contest & group, have `took_part`
== True, unique positive `rank`, and a numeric `rating_before` (default 1500
for newcomers). the function mutates each object inplace, assigning
`rating_after`, and returns the list for convenience.
"""
from __future__ import annotations

import math
from typing import List

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _elo_win_prob(ra: float, rb: float) -> float:
    """classical elo win probability"""
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))


def _get_seed(contestants: List["_Contestant"], rating: int) -> float:
    extra = _Contestant(None, 0, 0.0, rating)
    return 1.0 + sum(_elo_win_prob(c.rating, extra.rating) for c in contestants)


def _rating_to_rank(contestants: List["_Contestant"], target_rank: float) -> int:
    left, right = 1, 8000
    while right - left > 1:
        mid = (left + right) // 2
        if _get_seed(contestants, mid) < target_rank:
            right = mid
        else:
            left = mid
    return left

# ---------------------------------------------------------------------------
# internal entity
# ---------------------------------------------------------------------------

class _Contestant:
    __slots__ = (
        "party",
        "rank",
        "points",
        "rating",
        "need_rating",
        "seed",
        "delta",
    )

    def __init__(self, party, rank: int, points: float, rating: int):
        self.party = party  # original ContestParticipation object
        self.rank = rank
        self.points = points  # higher = better
        self.rating = rating
        self.need_rating: int = 0
        self.seed: float = 0.0
        self.delta: int = 0


# ---------------------------------------------------------------------------
# core port
# ---------------------------------------------------------------------------

def _process(contestants: List[_Contestant]):
    if not contestants:
        return

    # --- reassign ranks for ties (based on points desc) ---
    contestants.sort(key=lambda c: (-c.points, c.party.user_id))
    first, cur_points = 0, contestants[0].points
    for i in range(1, len(contestants)):
        if contestants[i].points < cur_points:
            bucket_rank = i  # 1based rank in original algo, but okay
            for j in range(first, i):
                contestants[j].rank = bucket_rank
            first, cur_points = i, contestants[i].points
    for j in range(first, len(contestants)):
        contestants[j].rank = len(contestants)

    # --- seed (expected rank) ---
    for a in contestants:
        a.seed = 1.0 + sum(_elo_win_prob(b.rating, a.rating) for b in contestants if b is not a)

    # --- need_rating & initial delta ---
    for c in contestants:
        mid_rank = math.sqrt(c.rank * c.seed)
        c.need_rating = _rating_to_rank(contestants, mid_rank)
        # integer division truncated toward zero (java's / on ints)
        c.delta = int((c.need_rating - c.rating) / 2)

    # sort by rating desc for invariant adjustments
    contestants.sort(key=lambda c: -c.rating)

    # ---- total sum correction (≤ 0) ----
    total = sum(c.delta for c in contestants)
    inc = int(-total / len(contestants)) - 1  # java truncation
    for c in contestants:
        c.delta += inc

    # ---- topk (4*sqrt(n)) zero correction ----
    k = min(int(4 * round(math.sqrt(len(contestants)))), len(contestants))
    top_sum = sum(c.delta for c in contestants[:k])
    inc_top = max(min(int(-top_sum / k), 0), -10)  # clamp [10, 0]
    for c in contestants:
        c.delta += inc_top

    _validate_deltas(contestants)


def _validate_deltas(contestants: List[_Contestant]):
    contestants.sort(key=lambda c: (-c.points, c.party.user_id))
    for i in range(len(contestants)):
        ci = contestants[i]
        for j in range(i + 1, len(contestants)):
            cj = contestants[j]
            if ci.rating > cj.rating:
                assert (
                    ci.rating + ci.delta >= cj.rating + cj.delta
                ), "first rating invariant failed"
            if ci.rating < cj.rating:
                assert ci.delta >= cj.delta, "second rating invariant failed"


# ---------------------------------------------------------------------------
# public api
# ---------------------------------------------------------------------------

def apply_codeforces_rating(participations: List["ContestParticipation"]):
    """mutates each `ContestParticipation` with `rating_after` and returns list."""
    if not participations:
        return []

    # sanity: same contest & group
    contest_id, group_id = participations[0].contest_id, participations[0].group_id
    for p in participations:
        assert (
            p.contest_id == contest_id
            and p.group_id == group_id
            and p.took_part
            and p.rank is not None
        ), "participation list inconsistent"

    contestants: List[_Contestant] = []
    for p in participations:
        rb = p.rating_before if p.rating_before is not None else 1500
        # convert rank 1..n to descending points so higher rank has more points
        # (codeforces breaks ties by points; here ranks are unique so points= -rank)
        contestants.append(_Contestant(p, p.rank, -p.rank, rb))

    _process(contestants)

    # write back
    for c in contestants:
        part = c.party
        part.rating_after = int(part.rating_before + c.delta)

    return participations


__all__ = ["apply_codeforces_rating"]
