class Contest:
    def __init__(self, internal_contest_id, official_cf_id, rated_users, start_time, end_time):
        self._internal_contest_id = internal_contest_id
        self._official_cf_id = official_cf_id
        self._rated_users = rated_users # Expected format: [{'user_id': id, 'groups': [group_id1, group_id2, ...]}]
        self._start_time = start_time
        self._end_time = end_time

    # Getters
    def get_internal_contest_id(self):
        return self._internal_contest_id

    def get_official_cf_id(self):
        return self._official_cf_id

    def get_rated_users(self):
        return self._rated_users

    def get_start_time(self):
        return self._start_time

    def get_end_time(self):
        return self._end_time

    # Setters
    def set_internal_contest_id(self, internal_contest_id):
        self._internal_contest_id = internal_contest_id

    def set_official_cf_id(self, official_cf_id):
        self._official_cf_id = official_cf_id

    def set_rated_users(self, rated_users):
        self._rated_users = rated_users

    def set_start_time(self, start_time):
        self._start_time = start_time

    def set_end_time(self, end_time):
        self._end_time = end_time 