
class Group:
    def __init__(self, internal_group_id, group_name, rating_calculation_formula, moderators, users, official_default_rated):
        self._internal_group_id = internal_group_id
        self._group_name = group_name
        self._rating_calculation_formula = rating_calculation_formula
        self._moderators = moderators # List of user_ids
        self._users = users # Expected format: [{'user_id': id, 'group_rating': rating, 'misc': data}]
        self._official_default_rated = official_default_rated

    # Getters
    def get_internal_group_id(self):
        return self._internal_group_id

    def get_group_name(self):
        return self._group_name

    def get_rating_calculation_formula(self):
        return self._rating_calculation_formula

    def get_moderators(self):
        return self._moderators

    def get_users(self):
        return self._users

    def get_official_default_rated(self):
        return self._official_default_rated

    # Setters
    def set_internal_group_id(self, internal_group_id):
        self._internal_group_id = internal_group_id

    def set_group_name(self, group_name):
        self._group_name = group_name

    def set_rating_calculation_formula(self, formula):
        self._rating_calculation_formula = formula

    def set_moderators(self, moderators):
        self._moderators = moderators

    def set_users(self, users):
        self._users = users

    def set_official_default_rated(self, official_default_rated):
        self._official_default_rated = official_default_rated
