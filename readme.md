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

3. re-create tables:
   ```
   python3 -m app.main
   ```

4. run the dev server
    ```
    uvicorn app.main:app --reload
    ```

    open ```http://127.0.0.1:8000/docs``` for api docs
    
    root endpoint: ```http://127.0.0.1:8000/api ```


5. start jupyter lab:
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


## todo

- [ ] schemas/models/endpoints are currently being written manually to stay flexible.
- [ ] once schema design stabilizes, introduce a `generate.py` script to dynamically scaffold:
  - pydantic schemas (`schemas.py`)
  - sqlalchemy models (`models.py`)
  - crud functions (`crud.py`)
  - fastapi route stubs (`endpoints.py`)
- [ ] potential format: a minimal json/yaml spec describing tables and fields.
- [ ] revisit automation after 3-4 tables and route patterns are locked in.
