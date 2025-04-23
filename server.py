# run continuously and listen for requests from the website
control class:
    map<group_id, group> groups
    map<contest_id, contest> completed_contests, upcoming_contests
    map<user_id, user> users

    void add_group(group g)
    void add_contest(contest c)
    void add_user(user u)

import database

# Call this once when your server starts
database.init_db()

# Later, when processing requests:
# Example: Handle a request to add a user
# (Assume you get username and password from the request)
# password_hash = hash_the_password(password) # Implement hashing
# user_id = database.add_user(username, password_hash, cf_handle)
# ...

# Example: Handle a request to get user info
# user_data = database.get_user_by_username(username)
# ...

