# clean-rating schema setup

this update adds core database models and a starter jupyter notebook for dev experimentation.

## setup

1. create a virtual environment:
   ```
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. create tables:
   ```
   python3 -m app.main
   ```

4. start jupyter lab:
   ```
   python3 -m jupyter lab
   ```

   then open the notebook to interact with the database.

## schema overview

- users: maps user ids to their codeforces handle, group preferences, and trust score.
- groups: defines rating groups with unique names.
- group_memberships: links users to groups with a role (admin / moderator / user) and a group-specific rating.
- contests: stores codeforces contest references using internal and external ids.
- contest_participations: tracks which contests are rated for which (user, group) pairs.

the schema supports many-to-many user-group relationships and group-specific rating forks from global codeforces ratings.

---

ready for that dev_playground.ipynb scaffold next? can include inserts + example queries + pandas views.
