# API Reference

This document provides a detailed reference for all available API endpoints.

## Authentication

The API uses OAuth2 with JWT (JSON Web Tokens) for authentication. Most endpoints require a valid Bearer Token to be included in the `Authorization` header.

**Token Format:**
`Authorization: Bearer <your_access_token>`

To obtain an access token, use the `/api/user/login` endpoint.

---

## User Endpoints

### 1. Register User
- **URL**: `/api/user/register`
- **Method**: `POST`
- **Auth Required**: No
- **Description**: Creates a new user account.
- **Request Body**: `schemas.UserRegister`
  ```json
  {
    "user_id": "string (unique username/ID for the user)",
    "cf_handle": "string (Codeforces handle)",
    "password": "string",
    "role": "string (Optional, default: 'user'. Enum: 'admin', 'moderator', 'user')",
    "internal_default_rated": "boolean (Optional, default: true)",
    "trusted_score": "integer (Optional, default: 0)"
  }
  ```
- **Response**: `schemas.UserOut`
  ```json
  {
    "user_id": "string",
    "cf_handle": "string",
    "internal_default_rated": true,
    "trusted_score": 0,
    "role": "string"
  }
  ```
- **Error Responses**:
    - `400 Bad Request`: If the `user_id` already exists.

### 2. Login for Access Token
- **URL**: `/api/user/login`
- **Method**: `POST`
- **Auth Required**: No
- **Description**: Authenticates a user and returns an access token.
- **Request Body**: `OAuth2PasswordRequestForm` (form data, not JSON)
  - `username`: "string" (This should be the `user_id`)
  - `password`: "string"
- **Response**: `schemas.TokenOut`
  ```json
  {
    "access_token": "string (JWT token)",
    "token_type": "string (bearer)"
  }
  ```
- **Error Responses**:
    - `401 Unauthorized`: If credentials are invalid.

### 3. Get User Information
- **URL**: `/api/user`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves information for a specific user. The `email_id` field is only returned if the authenticated user is querying their own profile.
- **Query Parameters**:
  - `user_id`: "string" (Required, User ID to retrieve)
- **Response**: `schemas.UserOut` (extended with email and other handles)
  ```json
  {
    "user_id": "string",
    "cf_handle": "string",
    "internal_default_rated": true,
    "trusted_score": 0,
    "role": "string",
    "email_id": "string (Optional, only for self)",
    "group_memberships": [ /* schemas.GroupMembershipOut */ ],
    "contest_participations": [ /* schemas.ContestParticipationOut */ ],
    "atcoder_handle": "string (Optional)",
    "codechef_handle": "string (Optional)",
    "twitter_handle": "string (Optional)"
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If the user with the given `user_id` does not exist.
    - `401 Unauthorized`: If the token is invalid or missing.

### 4. Update User Information
- **URL**: `/api/user`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Description**: Updates information for a specific user. Regular users can only update their own profiles. Moderators and admins can update any user's profile.
- **Query Parameters**:
  - `user_id`: "string" (Required, User ID of the user to update)
- **Request Body**: `schemas.UserUpdate`
  ```json
  {
    "cf_handle": "string (Optional)",
    "password": "string (Optional, new password)",
    "internal_default_rated": "boolean (Optional)",
    "trusted_score": "integer (Optional)",
    "role": "string (Optional, Enum: 'admin', 'moderator', 'user'. Only updatable by admin)"
  }
  ```
- **Response**: `schemas.UserOut`
- **Error Responses**:
    - `404 Not Found`: If the user with the given `user_id` does not exist.
    - `403 Forbidden`: If a user attempts to update another user's profile without moderator or admin privileges, or if a non-admin user attempts to change a user's role.
    - `401 Unauthorized`: If the token is invalid or missing.

---

## Group Endpoints

### 1. Register New Group
- **URL**: `/api/group/register`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Creates a new group. The user creating the group automatically becomes an admin of that group.
- **Request Body**: `schemas.GroupRegister`
  ```json
  {
    "group_id": "string (Unique ID for the group)",
    "group_name": "string (Display name for the group)",
    "creator_user_id": "string (User ID of the creator)"
  }
  ```
- **Response**: `schemas.GroupOut`
  ```json
  {
    "group_id": "string",
    "group_name": "string",
    "group_description": "string (Optional)",
    "is_private": false,
    "timestamp": "datetime",
    "member_count": 1 // Initially just the creator
  }
  ```
- **Error Responses**:
    - `400 Bad Request`: If a group with the same `group_id` already exists.
    - `401 Unauthorized`.

### 2. List All Groups
- **URL**: `/api/groups`
- **Method**: `GET`
- **Auth Required**: No (publicly accessible)
- **Description**: Retrieves a list of all public groups along with their member count.
- **Response**: `List[schemas.GroupOut]`
  ```json
  [
    {
      "group_id": "string",
      "group_name": "string",
      "group_description": "string (Optional)",
      "is_private": false,
      "timestamp": "datetime",
      "member_count": "integer"
    }
    // ... more groups
  ]
  ```

### 3. Get Single Group Details
- **URL**: `/api/group`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves detailed information for a single group, including its members. Access to private groups or full member lists might be restricted.
- **Query Parameters**:
  - `group_id`: "string" (Required, ID of the group to retrieve)
- **Response**: `schemas.GroupSingle` (includes list of `GroupMembershipOut`)
  ```json
  {
    "group_id": "string",
    "group_name": "string",
    "group_description": "string (Optional)",
    "is_private": false,
    "timestamp": "datetime",
    "memberships": [
      {
        "user_id": "string",
        "group_id": "string",
        "role": "string (Enum: 'admin', 'moderator', 'user')",
        "user_group_rating": "integer",
        "user_group_max_rating": "integer",
        "timestamp": "datetime (Date and time of joining the group)"
      }
      // ... more members
    ]
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If the group does not exist.
    - `403 Forbidden`: If trying to access a private group without permission.
    - `401 Unauthorized`.

### 4. Update Group Information
- **URL**: `/api/group`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Description**: Updates information for an existing group. Requires group admin or moderator privileges.
- **Request Body**: `schemas.GroupUpdate`
  ```json
  {
    "group_id": "string (Required, ID of the group to update)",
    "group_name": "string (Optional, new name for the group)",
    "group_description": "string (Optional, new description)",
    "is_private": "boolean (Optional)"
  }
  ```
- **Response**: `schemas.GroupOut`
- **Error Responses**:
    - `404 Not Found`: If the group does not exist.
    - `403 Forbidden`: If the user does not have sufficient privileges in the group.
    - `401 Unauthorized`.

### 5. Add User to Group
- **URL**: `/api/add_to_group`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Adds a user to a group. The requesting user must have a higher role within the group than the user being added.
- **Request Body**: `schemas.GroupMembershipAdd`
  ```json
  {
    "user_id": "string (User ID of the user to add)",
    "group_id": "string (Group ID to add the user to)",
    "role": "string (Optional, default: 'user'. Enum: 'admin', 'moderator', 'user')",
    "user_group_rating": "integer (Optional, default: 0)"
  }
  ```
- **Response**: `schemas.GroupMembershipOut`
- **Error Responses**:
    - `404 Not Found`: If the user or group does not exist.
    - `400 Bad Request`: If the user is already a member of the group.
    - `403 Forbidden`: If the requesting user's role in the group is not higher than the role of the user being added.
    - `401 Unauthorized`.

### 6. Remove User from Group
- **URL**: `/api/remove_from_group`
- **Method**: `POST` (Consider `DELETE` for semantic correctness, but current implementation is `POST`)
- **Auth Required**: Yes
- **Description**: Removes a user from a group. The requesting user must have a higher role within the group than the user being removed.
- **Request Body**: `schemas.GroupMembershipRemove`
  ```json
  {
    "user_id": "string (User ID of the user to remove)",
    "group_id": "string (Group ID from which to remove the user)"
  }
  ```
- **Response**: Success message (e.g., `{"message": "User removed successfully"}`) or `204 No Content`.
- **Error Responses**:
    - `404 Not Found`: If the user, group, or membership does not exist.
    - `403 Forbidden`: If the requesting user's role in the group is not higher than the role of the user being removed.
    - `401 Unauthorized`.

### 7. Check Group Membership
- **URL**: `/api/membership`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Checks if a specific user is a member of a specific group and returns their membership details. Access restricted to admins, group moderators/admins, or the user checking their own membership.
- **Query Parameters**:
    - `group_id`: "string" (Required)
    - `user_id`: "string" (Required)
- **Response**: `schemas.GroupMembershipOut`
  ```json
  {
    "user_id": "string",
    "group_id": "string",
    "role": "string",
    "user_group_rating": "integer"
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If membership does not exist.
    - `403 Forbidden`: If insufficient permissions to view membership.
    - `401 Unauthorized`.

---

## Contest Endpoints

### 1. Register User for a Rated Contest in a Group
- **URL**: `/api/register_rated`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Registers a user's participation in a specific contest within a group. This is typically used to track rated participation.
- **Request Body**: `schemas.ContestRegistration`
  ```json
  {
    "contest_id": "string (ID of the contest)",
    "group_id": "string (ID of the group)",
    "user_id": "string (ID of the user)",
    "rating_before": "integer (Optional, user's group rating before the contest)",
    "rating_after": "integer (Optional, user's group rating after the contest)"
  }
  ```
- **Response**:
  ```json
  {
    "detail": "participation recorded",
    "participation_id": "string (contest_id of the participation)"
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If user, group, or contest does not exist.
    - `400 Bad Request`: If user is not a member of the group, or already registered.
    - `403 Forbidden`: If a non-moderator/non-admin user tries to register another user.
    - `401 Unauthorized`.

### 2. Get Contest Participations
- **URL**: `/api/contest_participations`
- **Method**: `GET`
- **Auth Required**: Yes (implicitly, as it queries based on user/group/contest)
- **Description**: Retrieves contest participation records, filterable by group, user, or contest.
- **Query Parameters**:
  - `gid`: "string" (Optional, Group ID)
  - `uid`: "string" (Optional, User ID)
  - `cid`: "string" (Optional, Contest ID)
- **Response**: `List[schemas.ContestParticipationOut]`
- **Error Responses**:
    - `400 Bad Request`: If none of `gid`, `uid`, or `cid` are provided.

### 3. List Contests
- **URL**: `/api/contests`
- **Method**: `GET`
- **Auth Required**: Yes (or at least some contests might be restricted)
- **Description**: Retrieves a list of contests, optionally filtered by their finished status.
- **Query Parameters**:
  - `finished`: "boolean" (Optional, filter by contest finished status)
- **Response**: `List[schemas.ContestOut]`
  ```json
  [
    {
      "contest_id": "string",
      "contest_name": "string",
      "platform": "string (e.g., 'Codeforces')",
      "start_time_posix": "integer (Unix timestamp)",
      "duration_seconds": "integer (Optional)",
      "link": "string (URL to the contest)",
      "internal_contest_identifier": "string (Optional, e.g., CF contest ID)",
      "standings": "object (Optional, raw standings data)",
      "finished": "boolean"
    }
    // ... more contests
  ]
  ```
- **Error Responses**:
    - `401 Unauthorized`.

### 4. Get Single Contest Details
- **URL**: `/api/contest`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves detailed information for a single contest.
- **Query Parameters**:
  - `contest_id`: "string" (Required, ID of the contest)
- **Response**: `schemas.ContestOut`
- **Error Responses**:
    - `404 Not Found`: If the contest with the given `contest_id` does not exist.
    - `401 Unauthorized`.

---

## Report Endpoints

### 1. Create Report
- **URL**: `/api/report`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Allows a user to create a report against another user within the context of a group and a contest.
- **Request Body**: `schemas.ReportCreate`
  ```json
  {
    "group_id": "string",
    "contest_id": "string",
    "reporter_user_id": "string (User ID of the one making the report)",
    "respondent_user_id": "string (User ID of the one being reported)",
    "report_description": "string (Details of the report)"
  }
  ```
- **Response**: `schemas.ReportOut`
  ```json
  {
    "report_id": "string (Auto-generated)",
    "group_id": "string",
    "contest_id": "string",
    "reporter_user_id": "string",
    "respondent_user_id": "string",
    "report_description": "string",
    "timestamp": "datetime",
    "resolved": false,
    "resolved_by": "string (Optional)",
    "resolve_message": "string (Optional)"
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If group, contest, reporter, or respondent not found.
    - `400 Bad Request`: If reporter and respondent are the same, or other validation errors.
    - `403 Forbidden`: If the reporting user is not a member of the specified group.
    - `401 Unauthorized`.

### 2. Get Reports
- **URL**: `/api/report`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves reports. Can be filtered by `group_id` and `unresolved_only` status. Regular users querying by `group_id` must be a member of that group. Moderators/Admins have broader access.
- **Query Parameters**:
  - `group_id`: "string" (Optional, ID of the group to filter by)
  - `unresolved_only`: "boolean" (Optional, default: `false`. If `true`, only unresolved reports are returned)
- **Response**: `List[schemas.ReportOut]`
- **Error Responses**:
    - `403 Forbidden`: If a regular user tries to list reports for a group they are not a member of.
    - `401 Unauthorized`.

### 3. Resolve Report
- **URL**: `/api/report/resolve`
- **Method**: `PUT`
- **Auth Required**: Yes (Requires group moderator/admin privileges for the relevant group)
- **Description**: Marks a report as resolved.
- **Error Responses**:
    - `404 Not Found`: If the report with the given `report_id` does not exist.
    - `403 Forbidden`: If the user lacks moderator/admin privileges in the report's group.
    - `401 Unauthorized`.
- **Request Body**: `schemas.ReportResolve`
  ```json
  {
    "report_id": "string",
    "resolved_by": "string (User ID of the resolver, must be mod/admin in group)",
    "resolve_message": "string (Optional, message about the resolution)"
  }
  ```
- **Response**: `schemas.ReportOut` (updated report)
- **Error Responses**:
    - `404 Not Found`: If report not found.
    - `403 Forbidden`: If resolver lacks privileges in the group or report already resolved.
    - `401 Unauthorized`.

---

## Announcement Endpoints

### 1. Create Announcement
- **URL**: `/api/announcement`
- **Method**: `POST`
- **Auth Required**: Yes (Requires group moderator/admin privileges)
- **Description**: Creates an announcement for a specific group.
- **Request Body**: `schemas.AnnouncementCreate`
  ```json
  {
    "group_id": "string",
    "title": "string",
    "content": "string"
  }
  ```
- **Response**: `schemas.AnnouncementOut`
  ```json
  {
    "announcement_id": "string (Auto-generated)",
    "group_id": "string",
    "timestamp": "datetime",
    "title": "string",
    "content": "string"
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If group not found.
    - `403 Forbidden`: If user lacks privileges.
    - `401 Unauthorized`.

### 2. Get Announcements for a Group
- **URL**: `/api/announcement`
- **Method**: `GET`
- **Auth Required**: Yes (Access to announcements might depend on group privacy and user membership)
- **Description**: Retrieves announcements. Can be filtered by `group_id`. If `group_id` is provided, regular users must be a member of that group to view its announcements. Moderators/Admins have broader access. If `group_id` is not provided, behavior depends on backend logic (e.g., may list all accessible announcements).
- **Query Parameters**:
  - `group_id`: "string" (Optional, ID of the group to filter announcements by)
- **Response**: `List[schemas.AnnouncementOut]`
- **Error Responses**:
    - `404 Not Found`: If the specified group (when `group_id` is provided) does not exist.
    - `403 Forbidden`: If a regular user tries to list announcements for a specific group they are not a member of.
    - `401 Unauthorized`.

### 3. Update Announcement
- **URL**: `/api/announcement`
- **Method**: `PUT`
- **Auth Required**: Yes (Requires group moderator/admin who created or has rights to edit)
- **Description**: Updates an existing announcement.
- **Request Body**: `schemas.AnnouncementUpdate`
  ```json
  {
    "announcement_id": "string",
    "title": "string (Optional)",
    "content": "string (Optional)"
  }
  ```
- **Response**: `schemas.AnnouncementOut` (updated announcement)
- **Error Responses**:
    - `404 Not Found`: If announcement not found.
    - `403 Forbidden`: If user lacks privileges.
    - `401 Unauthorized`.

---

## Custom Group Data Endpoints

### 1. Get Group Members Custom Data
- **URL**: `/api/group_members_custom_data`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Retrieves custom membership data for all members in a specified group, including the number of rated contests they have participated in. Regular users must be a member of the group to access this data; administrators have unrestricted access.
- **Query Parameters**:
  - `group_id`: "string" (Required, ID of the group to retrieve custom data for)
- **Response**: `List[schemas.CustomMembershipData]`
  ```json
  // Example structure (actual fields depend on schemas.CustomMembershipData)
  [
    {
      "user_id": "string",
      // ... other fields from CustomMembershipData like username, rated_contests_count
    }
  ]
  ```
- **Error Responses**:
    - `404 Not Found`: If the group with the given `group_id` does not exist.
    - `403 Forbidden`: If a regular user (non-admin) tries to access data for a group they are not a member of.
    - `401 Unauthorized`.

---

## Membership Endpoints

### 1. Check Membership
- **URL**: `/api/membership`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Checks if a specified user is a member of a specified group. Access to this information is restricted: the requesting user must either be an admin, the user whose membership is being checked, or a moderator/admin of the group in question.
- **Query Parameters**:
  - `group_id`: "string" (Required, ID of the group)
  - `user_id`: "string" (Required, ID of the user)
- **Response**: `schemas.GroupMembershipOut`
  ```json
  // Example structure (actual fields depend on schemas.GroupMembershipOut)
  {
    "user_id": "string",
    "group_id": "string",
    "role": "member", // or "moderator", "admin"
    "date_joined": "datetime",
    "user_group_rating": 1500,
    "user_group_max_rating": 1600
    // ... other fields from GroupMembershipOut
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If the specified user is not a member of the specified group.
    - `403 Forbidden`: If the requesting user does not have sufficient permissions to view this membership information.
    - `401 Unauthorized`.

---

## Extension Endpoints

These endpoints provide specialized queries or functionalities.

### 1. Get Group Ratings by CF Handles
- **URL**: `/api/extension_query_1`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: For a given group and a list of Codeforces handles, returns their respective `user_group_rating` within that group.
- **Request Body**: `schemas.ExtensionQuery1Request`
  ```json
  {
    "group_id": "string",
    "cf_handles": ["string", "string", ...]
  }
  ```
- **Response**: `schemas.ExtensionQuery1Response`
  ```json
  {
    "ratings": [null, 1500, 1650, null, ...] // List of ratings, null if user not in group or no CF handle match
  }
  ```
- **Error Responses**:
    - `404 Not Found`: If group not found.
    - `401 Unauthorized`.

---

## Admin Endpoints

These endpoints are typically restricted to users with global 'admin' roles.

### 1. Update Finished Contests from Codeforces
- **URL**: `/api/admin/update-finished-contests`
- **Method**: `POST`
- **Auth Required**: Yes (Admin role required)
- **Description**: Triggers an update to fetch and store information about recently finished contests from Codeforces.
- **Query Parameters**:
  - `cutoff_days`: "integer" (Optional, number of days to look back for finished contests. Default might be set in backend.)
- **Response**: `{"message": "Finished contests updated successfully"}`
- **Error Responses**:
    - `403 Forbidden`: If user is not an admin.
    - `401 Unauthorized`.

### 2. Update Upcoming Contests from Codeforces
- **URL**: `/api/admin/update-upcoming-contests`
- **Method**: `POST`
- **Auth Required**: Yes (Admin role required)
- **Description**: Triggers an update to fetch and store information about upcoming contests from Codeforces.
- **Response**: `{"message": "Upcoming contests updated successfully"}`
- **Error Responses**:
    - `403 Forbidden`: If user is not an admin.
    - `401 Unauthorized`.

---

## Development Endpoints

These endpoints are intended for development and testing purposes only and should not be exposed or used in a production environment.

### 1. Seed Database
- **URL**: `/api/dev/seed`
- **Method**: `POST`
- **Auth Required**: No (This endpoint is intentionally open for development ease)
- **Description**: Resets and seeds the database with test data. **USE WITH EXTREME CAUTION.**
- **Response**: `{"message": "Database has been reset and seeded with test data"}`

---
    ]
  }
  ```
- **Description**: Returns detailed information about a specific group including all its memberships
- **Error Responses**: 404 if group not found

### Update Group
- **URL**: `/api/group`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "group_id": "string",
    "group_name": "string"  // Optional
  }
  ```
- **Response**: Updated `GroupOut` object
- **Description**: Updates group information (requires moderator/admin privileges in the group)
- **Error Responses**:
  - 404 if group not found
  - 403 if insufficient privilege
  - 409 if new group name already exists

### Group Members Custom Data
- **URL**: `/api/group_members_custom_data`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `group_id` (required): ID of the group to retrieve custom data for
- **Response**: List of `CustomMembershipData` objects
  ```json
  [
    {
      "cf_handle": "string",
      "role": "user",
      "user_group_rating": 1500,
      "user_group_max_rating": 1600,
      "date_joined": "2025-05-17T14:25:36Z",
      "number_of_rated_contests": 5
    }
  ]
  ```
- **Description**: Returns detailed membership data for all members in a group, including the number of rated contests each member has participated in within the group
- **Error Responses**:
  - 404 if group not found
  - 403 if not a member of the group

### Add Member to Group
- **URL**: `/api/add_to_group`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "user_id": "string",
    "group_id": "string",
    "role": "user",  // Optional, default: "user"
    "user_group_rating": 0  // Optional, default: 0
  }
  ```
- **Response**: `GroupMembershipOut` object
  ```json
  {
    "user_id": "string",
    "group_id": "string",
    "role": "user",
    "user_group_rating": 0
  }
  ```
- **Description**: Adds a user to a group (requires moderator/admin privileges)
- **Error Responses**:
  - 404 if user or group not found
  - 403 if insufficient privilege
  - 400 if membership already exists

### Remove Member from Group
- **URL**: `/api/remove_from_group`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "user_id": "string",
    "group_id": "string"
  }
  ```
- **Response**: Success message
  ```json
  {
    "detail": "membership removed"
  }
  ```
- **Description**: Removes a user from a group (requires moderator/admin privileges that outrank the target)
- **Error Responses**:
  - 404 if membership not found
  - 403 if insufficient privilege

---

## Contest Endpoints

### Register Rated Contest
- **URL**: `/api/register_rated`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "contest_id": "string",
    "group_id": "string",
    "user_id": "string",
    "rating_before": 0,  // Optional
    "rating_after": 0  // Optional
  }
  ```
- **Response**: Success message
  ```json
  {
    "detail": "participation recorded",
    "participation_id": "string"
  }
  ```
- **Description**: Registers a user for a rated contest in a group
- **Error Responses**:
  - 404 if user, group, or contest not found
  - 403 if insufficient privilege
  - 400 if already registered

### Get Contest Participations
- **URL**: `/api/contest_participations`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `gid` (optional): filter by group ID
  - `uid` (optional): filter by user ID
  - `cid` (optional): filter by contest ID
- **Response**: List of `ContestParticipationOut` objects
  ```json
  [
    {
      "user_id": "string",
      "group_id": "string",
      "contest_id": "string",
      "rating_before": 0,
      "rating_after": 0,
      "rank": 0
    }
  ]
  ```
- **Description**: Get contest participations with optional filters (must provide at least one filter)
- **Error Responses**: 400 if no filter is provided

### List Contests
- **URL**: `/api/contests`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `finished` (optional): filter by finished status
- **Response**: List of `ContestOut` objects
  ```json
  [
    {
      "contest_id": "string",
      "contest_name": "string",
      "platform": "string",
      "start_time_posix": 1621345678,
      "duration_seconds": 7200,
      "link": "string",
      "internal_contest_identifier": "string",
      "standings": {},
      "finished": true
    }
  ]
  ```
- **Description**: Get all contests, optionally filtered by their finished status

### Get Contest
- **URL**: `/api/contest`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `contest_id`: ID of the contest to retrieve
- **Response**: `ContestOut` object
- **Description**: Get a single contest by its ID
- **Error Responses**: 404 if contest not found

---

## Report Endpoints

### Create Report
- **URL**: `/api/report`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "group_id": "string",
    "contest_id": "string",
    "reporter_user_id": "string",
    "respondent_user_id": "string",
    "report_description": "string"
  }
  ```
- **Response**: `ReportOut` object
- **Description**: Creates a new report in a group (requires group membership)
- **Error Responses**: 403 if not a member of the group

### List Reports
- **URL**: `/api/report`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `group_id` (optional): filter by group ID
  - `unresolved_only` (optional, default=false): show only unresolved reports
- **Response**: List of `ReportOut` objects
- **Description**: Lists reports, optionally filtered by group and resolution status
- **Error Responses**: 403 if insufficient privilege when filtering by group

### Resolve Report
- **URL**: `/api/report/resolve`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "report_id": "string",
    "resolved_by": "string",
    "resolve_message": "string"  // Optional
  }
  ```
- **Response**: Updated `ReportOut` object
- **Description**: Resolves a report (requires moderator/admin privileges in the group)
- **Error Responses**:
  - 404 if report not found
  - 403 if insufficient privilege

---

## Announcement Endpoints

### Create Announcement
- **URL**: `/api/announcement`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "group_id": "string",
    "title": "string",
    "content": "string"
  }
  ```
- **Response**: `AnnouncementOut` object
- **Description**: Creates a new announcement in a group (requires moderator/admin privileges)
- **Error Responses**: 403 if insufficient privilege

### List Announcements
- **URL**: `/api/announcement`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `group_id` (optional): filter by group ID
- **Response**: List of `AnnouncementOut` objects
- **Description**: Lists announcements, optionally filtered by group
- **Error Responses**: 403 if insufficient privilege when filtering by group

### Update Announcement
- **URL**: `/api/announcement`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "announcement_id": "string",
    "title": "string",  // Optional
    "content": "string"  // Optional
  }
  ```
- **Response**: Updated `AnnouncementOut` object
- **Description**: Updates an announcement (requires moderator/admin privileges in the group)
- **Error Responses**:
  - 404 if announcement not found
  - 403 if insufficient privilege

---

## Extension Endpoints

### Get Ratings by CF Handles
- **URL**: `/api/extension_query_1`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "group_id": "string",
    "cf_handles": ["string"]
  }
  ```
- **Response**: List of ratings (nullable)
  ```json
  {
    "ratings": [0, null, 1500]
  }
  ```
- **Description**: Gets user_group_ratings for a list of CF handles in a specific group. For users without membership, returns null.
- **Error Responses**: 404 if group not found
