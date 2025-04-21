class User:
    def __init__(self, internal_user_id, username, password, cf_handle, groups, internal_default_rated, trusted_score):
        self._internal_user_id = internal_user_id
        self._username = username
        self._password = password  # Consider hashing the password in a real application
        self._cf_handle = cf_handle
        self._groups = groups  # Expected format: [{'group_id': id, 'is_moderator': bool}]
        self._internal_default_rated = internal_default_rated
        self._trusted_score = trusted_score

    # Getters
    def get_internal_user_id(self):
        return self._internal_user_id

    def get_username(self):
        return self._username

    def get_password(self):
        return self._password # In a real app, avoid returning plain password

    def get_cf_handle(self):
        return self._cf_handle

    def get_groups(self):
        return self._groups

    def get_internal_default_rated(self):
        return self._internal_default_rated

    def get_trusted_score(self):
        return self._trusted_score

    # Setters
    def set_internal_user_id(self, internal_user_id):
        self._internal_user_id = internal_user_id

    def set_username(self, username):
        self._username = username

    def set_password(self, password):
        self._password = password # Consider hashing before storing

    def set_cf_handle(self, cf_handle):
        self._cf_handle = cf_handle

    def set_groups(self, groups):
        self._groups = groups

    def set_internal_default_rated(self, internal_default_rated):
        self._internal_default_rated = internal_default_rated

    def set_trusted_score(self, trusted_score):
        self._trusted_score = trusted_score

