# unpolluted-elo



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

3. run the dev server
    ```
    uvicorn app.main:app --reload
    ```

    open ```http://127.0.0.1:8000/docs``` for api docs

    root endpoint: ```http://127.0.0.1:8000/api ```


4. start jupyter lab:
   ```
   python3 -m jupyter lab
   ```

   then open the notebook to interact with the database.

## endpoints

---

### post /api/user/register  
create a new user.

**request json**
```json
{
  "user_id": "u123",
  "cf_handle": "ani123",
  "password": "hunter2",
  "internal_default_rated": true,
  "trusted_score": 0
}
```

**response json**
```json
{
  "user_id": "u123",
  "cf_handle": "ani123",
  "internal_default_rated": true,
  "trusted_score": 0
}
```

---

### post /api/user/login  
form-encoded login ➜ jwt.

**form fields**
```
username=u123        # user_id
password=hunter2
```

**response json**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

---

### get /api/user  
list all users or single user by query param `uid`.

**query examples**
```
/api/user                     # returns list[UserOut]
/api/user?uid=u123            # returns [single UserOut]
```

**response snippet**
```json
[
  {
    "user_id": "u123",
    "cf_handle": "ani123",
    "internal_default_rated": true,
    "trusted_score": 0
  }
]
```

---

### put /api/user  
update a user. bearer token required.

**query** `user_id=u123`  
**request json**
```json
{
  "cf_handle": "ani_new",
  "internal_default_rated": false
}
```

**response json** (updated record)
```json
{
  "user_id": "u123",
  "cf_handle": "ani_new",
  "internal_default_rated": false,
  "trusted_score": 0
}
```

---

### post /api/group/register  
create a group.

**request json**
```json
{
  "group_id": "g456",
  "group_name": "team rocket",
  "creator_user_id": "u123"
}
```

**response json**
```json
{
  "group_id": "g456",
  "group_name": "team rocket",
  "memberships": []
}
```

---

### get /api/group  
list all groups or one by `group_id`.

```
/api/group
/api/group?group_id=g456
```

**response snippet**
```json
[
  {
    "group_id": "g456",
    "group_name": "team rocket",
    "memberships": [
      {
        "user_id": "u123",
        "group_id": "g456",
        "role": "admin",
        "user_group_rating": 0
      }
    ]
  }
]
```

---

### put /api/group  
update group name.

**request json**
```json
{
  "group_id": "g456",
  "group_name": "new name"
}
```

**response json** same shape as `GroupOut`.

---

### post /api/add_to_group  
add a user to group.

**request json**
```json
{
  "user_id": "u789",
  "group_id": "g456",
  "role": "user",
  "user_group_rating": 1500
}
```

**response json**
```json
{
  "user_id": "u789",
  "group_id": "g456",
  "role": "user",
  "user_group_rating": 1500
}
```

---

### post /api/remove_from_group  
remove membership.

**request json**
```json
{
  "user_id": "u789",
  "group_id": "g456"
}
```

**response json**
```json
{ "detail": "membership removed" }
```

---

### post /api/register_rated  
record contest participation.

**request json**
```json
{
  "contest_id": "abc/2025",
  "group_id": "g456",
  "user_id": "u123"
}
```

**response json**
```json
{
  "detail": "participation recorded",
  "participation_id": "abc/2025"
}
```

---

done.

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
