import sqlite3
import json
import os

DATABASE_FILE = 'persistent_data.db' # Name of the SQLite database file

def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row # Return rows as dictionary-like objects
    conn.execute("PRAGMA foreign_keys = ON") # Enforce foreign key constraints
    return conn

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    if os.path.exists(DATABASE_FILE):
        print("Database file already exists.")
        # Optionally add logic here to check schema or migrate
        # return # Keep this commented out if you want to ensure tables exist on every run

    print(f"Initializing database at {DATABASE_FILE}...")
    conn = get_db_connection()
    cursor = conn.cursor()

    # --- Create Tables ---

    # User Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Users (
        internal_user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, -- Remember to HASH passwords in a real app!
        cf_handle TEXT,
        internal_default_rated INTEGER DEFAULT 0, -- Boolean (0 or 1)
        trusted_score REAL DEFAULT 0.0
    )
    ''')
    print("Created Users table (if not exists).")

    # Group Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Groups (
        internal_group_id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT UNIQUE NOT NULL,
        rating_calculation_formula TEXT,
        official_default_rated INTEGER DEFAULT 0 -- Boolean (0 or 1)
    )
    ''')
    print("Created Groups table (if not exists).")

    # User-Group Membership (Junction Table)
    # Handles 'groups' in User, 'moderators' and 'users' in Group
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS UserGroupMembership (
        user_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        is_moderator INTEGER DEFAULT 0, -- Boolean (0 or 1)
        group_rating REAL, -- User's rating within this specific group
        misc TEXT, -- Store additional user-group specific data (e.g., as JSON)
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES Users (internal_user_id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES Groups (internal_group_id) ON DELETE CASCADE
    )
    ''')
    print("Created UserGroupMembership table (if not exists).")

    # Contest Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Contests (
        internal_contest_id INTEGER PRIMARY KEY AUTOINCREMENT,
        official_cf_id INTEGER UNIQUE,
        start_time TEXT, -- Store as ISO 8601 string or INTEGER timestamp
        end_time TEXT   -- Store as ISO 8601 string or INTEGER timestamp
    )
    ''')
    print("Created Contests table (if not exists).")

    # Contest Participation (Junction Table)
    # Handles 'rated_users' in Contest (which user is rated for which group in this contest)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ContestParticipation (
        user_id INTEGER NOT NULL,
        contest_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL, -- The group for which the user is rated in this contest
        PRIMARY KEY (user_id, contest_id, group_id),
        FOREIGN KEY (user_id) REFERENCES Users (internal_user_id) ON DELETE CASCADE,
        FOREIGN KEY (contest_id) REFERENCES Contests (internal_contest_id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES Groups (internal_group_id) ON DELETE CASCADE
    )
    ''')
    print("Created ContestParticipation table (if not exists).")

    conn.commit()
    conn.close()
    print("Database initialization complete.")

# --- Placeholder Functions for Data Manipulation (To be implemented) ---

# Example: Add a user (without handling groups yet)
def add_user(username, password_hash, cf_handle=None, internal_default_rated=False, trusted_score=0.0):
    """Adds a new user to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        INSERT INTO Users (username, password, cf_handle, internal_default_rated, trusted_score)
        VALUES (?, ?, ?, ?, ?)
        ''', (username, password_hash, cf_handle, 1 if internal_default_rated else 0, trusted_score))
        conn.commit()
        user_id = cursor.lastrowid
        print(f"Added user '{username}' with ID: {user_id}")
        return user_id
    except sqlite3.IntegrityError as e:
        print(f"Error adding user: {e}") # e.g., username already exists
        return None
    finally:
        conn.close()

# Example: Get a user by username
def get_user_by_username(username):
    """Retrieves a user's basic info by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE username = ?", (username,))
    user_row = cursor.fetchone()
    conn.close()
    # You'll likely want to fetch associated group memberships as well in a real function
    return dict(user_row) if user_row else None

# --- TODO: Implement functions for ---
# - Adding/Getting/Updating/Deleting Groups
# - Adding/Getting/Updating/Deleting Contests
# - Managing User-Group Memberships (add_user_to_group, set_moderator, update_group_rating, get_user_groups, get_group_members, get_group_moderators)
# - Managing Contest Participation (register_user_for_contest, get_contest_participants)
# - Fetching complete User/Group/Contest objects including their related lists

# --- Backup/Restore ---
# Backup: Simply copy the DATABASE_FILE ('persistent_data.db').
# Restore: Replace the existing DATABASE_FILE with the backup copy (ensure the server is stopped first).

if __name__ == '__main__':
    # This block runs only when the script is executed directly
    # Useful for initializing the database manually if needed
    print("Running database script directly...")
    init_db()
    # Example usage:
    # add_user("testuser", "hashed_password_here", "test_cf_handle")
    # user = get_user_by_username("testuser")
    # print("Fetched user:", user) 