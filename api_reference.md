# API REFERENCE DOCUMENTATION

This document provides details on all API endpoints available in the backend.

## Table of Contents
- [Authentication](#authentication)
- [User Endpoints](#user-endpoints)
- [Group Endpoints](#group-endpoints)
- [Contest Endpoints](#contest-endpoints)
- [Report Endpoints](#report-endpoints)
- [Announcement Endpoints](#announcement-endpoints)

## Authentication

The API uses OAuth2 with JWT tokens for authentication. Most endpoints require authentication via a bearer token.

Token format: `Bearer <access_token>`

---

## User Endpoints

### Register User
- **URL**: `/api/user/register`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "user_id": "string",
    "cf_handle": "string",
    "password": "string",
    "role": "user",  // Optional, default: "user" (admin|moderator|user)
    "internal_default_rated": true,  // Optional, default: true
    "trusted_score": 0  // Optional, default: 0
  }
  ```
- **Response**: `UserOut` object
  ```json
  {
    "user_id": "string",
    "cf_handle": "string",
    "internal_default_rated": true,
    "trusted_score": 0,
    "role": "user"
  }
  ```
- **Description**: Creates a new user account
- **Error Responses**: 400 if user already exists

### Login
- **URL**: `/api/user/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**: OAuth2 form with username (uses form data, not JSON)
  ```
  username: "string"  // This is the user_id
  password: "string"
  ```
- **Response**: `TokenOut` object
  ```json
  {
    "access_token": "string",
    "token_type": "bearer"
  }
  ```
- **Description**: Authenticates a user and returns a JWT token
- **Error Responses**: 401 if credentials are invalid

### List or Get User
- **URL**: `/api/user`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `uid` (optional): specific user ID to get
- **Response**: List of `UserOut` objects
- **Description**: 
  - With `uid`: Returns a specific user's details
  - Without `uid`: Lists all users (admin only)
- **Error Responses**: 
  - 404 if user not found
  - 403 if insufficient privilege for listing all users

### Update User
- **URL**: `/api/user`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Query Parameters**:
  - `user_id`: ID of the user to update
- **Request Body**:
  ```json
  {
    "cf_handle": "string",  // Optional
    "password": "string",  // Optional
    "internal_default_rated": true,  // Optional
    "trusted_score": 0,  // Optional
    "role": "user"  // Optional
  }
  ```
- **Response**: Updated `UserOut` object
- **Description**: Updates user information (admin can update any user, users can only update themselves)
- **Error Responses**:
  - 404 if user not found
  - 403 if insufficient privilege

---

## Group Endpoints

### Register Group
- **URL**: `/api/group/register`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "group_id": "string",
    "group_name": "string",
    "creator_user_id": "string"
  }
  ```
- **Response**: `GroupOut` object
  ```json
  {
    "group_id": "string",
    "group_name": "string",
    "group_description": "string",
    "is_private": false,
    "create_date": "2025-05-17T14:25:36Z"
  }
  ```
- **Description**: Creates a new group with the creator as a moderator
- **Error Responses**: 400 if group ID or name already exists

### List or Get Group
- **URL**: `/api/group`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `group_id` (optional): specific group ID to get
- **Response**: List of `GroupOut` objects
  ```json
  [
    {
      "group_id": "string",
      "group_name": "string",
      "group_description": "string",
      "is_private": false,
      "create_date": "2025-05-17T14:25:36Z"
    }
  ]
  ```
- **Description**:
  - With `group_id`: Returns a specific group's details
  - Without `group_id`: Lists all groups
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

### Add Member to Group
- **URL**: `/api/group/add_member`
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
- **Description**: Adds a user to a group (requires moderator/admin privileges)
- **Error Responses**:
  - 404 if user or group not found
  - 403 if insufficient privilege
  - 400 if membership already exists

### Remove Member from Group
- **URL**: `/api/group/remove_member`
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
- **Description**: Removes a user from a group (requires moderator/admin privileges that outrank the target)
- **Error Responses**:
  - 404 if membership not found
  - 403 if insufficient privilege

---

## Contest Endpoints

### Register Rated Contest
- **URL**: `/api/contest/register_rated`
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
- **Response**: `ContestParticipationOut` object
- **Description**: Registers a user for a rated contest in a group
- **Error Responses**:
  - 404 if user, group, or contest not found
  - 403 if insufficient privilege
  - 400 if already registered

### Get Contest Participations
- **URL**: `/api/contest/participations`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `gid` (optional): filter by group ID
  - `uid` (optional): filter by user ID
  - `cid` (optional): filter by contest ID
- **Response**: List of `ContestParticipationOut` objects
- **Description**: Get contest participations with optional filters

### List Contests
- **URL**: `/api/contest/list`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `finished` (optional): filter by finished status
- **Response**: List of `ContestOut` objects
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
