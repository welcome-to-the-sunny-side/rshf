# api spec (v0)

all endpoints are under `/api`.  
authentication: standard bearer jwt (`Authorization: Bearer <token>`).

---

## auth

### `POST /user/register`
register new user.

- **body:** `{ user_id, cf_handle, password, role?, internal_default_rated?, trusted_score? }`
- **returns:** created `UserOut` object.

---

### `POST /user/login`
login user, returns jwt.

- **form-data:** `{ username, password }` (where `username = user_id`)
- **returns:** `{ access_token, token_type }`

---

## user

### `GET /user`
- **query:** optional `uid`.
- **behavior:**
  - no `uid`: list all users (admin-only).
  - with `uid`: fetch specific user.
- **returns:** `List[UserOutExpanded]`
  
  **UserOutExpanded :=**
  ```json
  {
    "user_id": str,
    "cf_handle": str,
    "internal_default_rated": bool,
    "trusted_score": int,
    "role": "admin | moderator | user",
    "memberships": [ GroupMembershipOut ],
    "contest_participations": [ ContestParticipationOut ]
  }
  ```

---

### `PUT /user`
update fields for a user.

- **query:** `user_id`
- **body:** partial `{ cf_handle?, password?, internal_default_rated?, trusted_score?, role? }`
- **returns:** updated `UserOut`.

---

## group

### `POST /group/register`
register new group.

- **body:** `{ group_id, group_name, creator_user_id }`
- **returns:** `GroupOutExpanded`.

---

### `GET /group`
- **query:** optional `group_id`.
- **behavior:**
  - no `group_id`: list all groups.
  - with `group_id`: fetch specific group.
- **returns:** `List[GroupOutExpanded]`

  **GroupOutExpanded :=**
  ```json
  {
    "group_id": str,
    "group_name": str,
    "memberships": [ GroupMembershipOut ],
    "contest_participations": [ ContestParticipationOut ]
  }
  ```

---

### `PUT /group`
update group name.

- **body:** `{ group_id, group_name? }`
- **returns:** updated `GroupOut`.

---

## membership

### `POST /add_to_group`
add user to group.

- **body:** `{ user_id, group_id, role, user_group_rating }`
- **returns:** `GroupMembershipOut`.

---

### `POST /remove_from_group`
remove user from group.

- **body:** `{ user_id, group_id }`
- **returns:** `{ detail: "membership removed" }`

---

## contest

### `POST /register_rated`
register a contest participation.

- **body:** `{ contest_id, group_id, user_id, user_group_rating_before?, user_group_rating_after? }`
- **returns:** `{ detail, participation_id }`

---

### `GET /contest`
filter contest participations.

- **query:** must provide at least one of `gid`, `uid`, `cid`.
- **returns:** `List[ContestParticipationOut]`.

---

## schemas

| object | fields |
|:------:|:------:|
| **UserOut** | `{ user_id, cf_handle, internal_default_rated, trusted_score, role }` |
| **GroupMembershipOut** | `{ user_id, group_id, role, user_group_rating }` |
| **ContestParticipationOut** | `{ user_id, group_id, contest_id, user_group_rating_before, user_group_rating_after }` |
| **GroupOut** | `{ group_id, group_name }` |

---

# notes

- for `/user` and `/group`, expanded views automatically nest memberships and participations.
- jwt token is required for all non-login operations.
- permissions:
  - plain users can only act on themselves.
  - moderators/admins can modify lower-ranked users/groups.

