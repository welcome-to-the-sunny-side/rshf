"""
Codeforces API Client
A comprehensive Python implementation of all Codeforces API endpoints.
"""

import requests
import time
import hashlib
import secrets
from typing import List, Dict, Any, Optional, Union
from datetime import datetime


class CodeforcesAPI:
    """
    A client for interacting with the Codeforces API.
    
    Supports both anonymous and authenticated requests.
    Rate limit: 5 requests per second.
    """
    
    BASE_URL = "https://codeforces.com/api"
    
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        """
        Initialize the Codeforces API client.
        
        Args:
            api_key: Codeforces API key (optional for anonymous access)
            api_secret: Codeforces API secret (optional for anonymous access)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.session = requests.Session()
        self.last_request_time = 0
        
    def _rate_limit(self):
        """Ensure we don't exceed 5 requests per second."""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        if time_since_last_request < 0.2:  # 5 requests per second = 0.2 seconds between requests
            time.sleep(0.2 - time_since_last_request)
        self.last_request_time = time.time()
    
    def _generate_api_sig(self, method: str, params: Dict[str, Any]) -> str:
        """
        Generate API signature for authenticated requests.
        
        Args:
            method: API method name
            params: Request parameters
            
        Returns:
            API signature string
        """
        rand = secrets.token_hex(3)  # 6 random hex characters
        
        # Sort parameters
        sorted_params = sorted(params.items())
        param_string = "&".join(f"{key}={value}" for key, value in sorted_params)
        
        # Create signature string
        sig_string = f"{rand}/{method}?{param_string}#{self.api_secret}"
        
        # Generate SHA-512 hash
        hash_hex = hashlib.sha512(sig_string.encode()).hexdigest()
        
        return rand + hash_hex
    
    def _make_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make a request to the Codeforces API.
        
        Args:
            method: API method name
            params: Request parameters
            
        Returns:
            API response as dictionary
            
        Raises:
            Exception: If API returns error status
        """
        self._rate_limit()
        
        if params is None:
            params = {}
            
        # Add authentication if available
        if self.api_key and self.api_secret:
            params['apiKey'] = self.api_key
            params['time'] = int(time.time())
            params['apiSig'] = self._generate_api_sig(method, params)
        
        url = f"{self.BASE_URL}/{method}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] != 'OK':
            raise Exception(f"API Error: {data.get('comment', 'Unknown error')}")
            
        return data.get('result', {})
    
    # ========== BLOG METHODS ==========
    
    def blogEntry_comments(self, blog_entry_id: int) -> List[Dict[str, Any]]:
        """
        Returns a list of comments to the specified blog entry.
        
        Args:
            blog_entry_id: Id of the blog entry
            
        Returns:
            List of Comment objects
        """
        return self._make_request("blogEntry.comments", {"blogEntryId": blog_entry_id})
    
    def blogEntry_view(self, blog_entry_id: int) -> Dict[str, Any]:
        """
        Returns blog entry.
        
        Args:
            blog_entry_id: Id of the blog entry
            
        Returns:
            BlogEntry object
        """
        return self._make_request("blogEntry.view", {"blogEntryId": blog_entry_id})
    
    # ========== CONTEST METHODS ==========
    
    def contest_hacks(self, contest_id: int, as_manager: bool = False) -> List[Dict[str, Any]]:
        """
        Returns list of hacks in the specified contests.
        Requires authentication.
        
        Args:
            contest_id: Id of the contest
            as_manager: If true, only manager hacks are returned
            
        Returns:
            List of Hack objects
        """
        params = {"contestId": contest_id}
        if as_manager:
            params["asManager"] = "true"
        return self._make_request("contest.hacks", params)
    
    def contest_list(self, gym: bool = False) -> List[Dict[str, Any]]:
        """
        Returns information about all available contests.
        
        Args:
            gym: If true, gym contests are returned. Otherwise, regular contests are returned.
            
        Returns:
            List of Contest objects
        """
        params = {}
        if gym:
            params["gym"] = "true"
        return self._make_request("contest.list", params)
    
    def contest_ratingChanges(self, contest_id: int) -> List[Dict[str, Any]]:
        """
        Returns rating changes after the contest.
        
        Args:
            contest_id: Id of the contest
            
        Returns:
            List of RatingChange objects
        """
        return self._make_request("contest.ratingChanges", {"contestId": contest_id})
    
    def contest_standings(self, contest_id: int, from_: int = 1, count: int = 100,
                         handles: Optional[List[str]] = None, room: Optional[int] = None,
                         show_unofficial: bool = False, as_manager: bool = False) -> Dict[str, Any]:
        """
        Returns the description of the contest and the requested part of the standings.
        
        Args:
            contest_id: Id of the contest
            from_: 1-based index of the standings row to start from
            count: Number of standing rows to return
            handles: List of handles to filter by
            room: If specified, only participants from this room are shown
            show_unofficial: If true, all participants are shown
            as_manager: If true, only manager standings are shown
            
        Returns:
            Object with three fields: "contest", "problems" and "rows"
        """
        params = {
            "contestId": contest_id,
            "from": from_,
            "count": count
        }
        
        if handles:
            params["handles"] = ";".join(handles)
        if room is not None:
            params["room"] = room
        if show_unofficial:
            params["showUnofficial"] = "true"
        if as_manager:
            params["asManager"] = "true"
            
        return self._make_request("contest.standings", params)
    
    def contest_status(self, contest_id: int, handle: Optional[str] = None,
                      from_: int = 1, count: int = 100, as_manager: bool = False) -> List[Dict[str, Any]]:
        """
        Returns submissions for specified contest.
        
        Args:
            contest_id: Id of the contest
            handle: Codeforces user handle
            from_: 1-based index of the first submission to return
            count: Number of returned submissions
            as_manager: If true, only manager submissions are shown
            
        Returns:
            List of Submission objects
        """
        params = {
            "contestId": contest_id,
            "from": from_,
            "count": count
        }
        
        if handle:
            params["handle"] = handle
        if as_manager:
            params["asManager"] = "true"
            
        return self._make_request("contest.status", params)
    
    # ========== PROBLEMSET METHODS ==========
    
    def problemset_problems(self, tags: Optional[List[str]] = None,
                           problemset_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns all problems from problemset.
        
        Args:
            tags: List of tags to filter by
            problemset_name: Custom problemset's short name
            
        Returns:
            Object with two fields: "problems" and "problemStatistics"
        """
        params = {}
        if tags:
            params["tags"] = ";".join(tags)
        if problemset_name:
            params["problemsetName"] = problemset_name
            
        return self._make_request("problemset.problems", params)
    
    def problemset_recentStatus(self, count: int = 50,
                               problemset_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns recent submissions.
        
        Args:
            count: Number of submissions to return (max 1000)
            problemset_name: Custom problemset's short name
            
        Returns:
            List of Submission objects
        """
        params = {"count": count}
        if problemset_name:
            params["problemsetName"] = problemset_name
            
        return self._make_request("problemset.recentStatus", params)
    
    # ========== RECENT ACTIONS METHODS ==========
    
    def recentActions(self, max_count: int = 30) -> List[Dict[str, Any]]:
        """
        Returns recent actions.
        
        Args:
            max_count: Number of recent actions to return (max 100)
            
        Returns:
            List of RecentAction objects
        """
        return self._make_request("recentActions", {"maxCount": max_count})
    
    # ========== USER METHODS ==========
    
    def user_blogEntries(self, handle: str) -> List[Dict[str, Any]]:
        """
        Returns a list of all user's blog entries.
        
        Args:
            handle: Codeforces user handle
            
        Returns:
            List of BlogEntry objects in short form
        """
        return self._make_request("user.blogEntries", {"handle": handle})
    
    def user_friends(self, only_online: bool = False) -> List[str]:
        """
        Returns authorized user's friends.
        Requires authentication.
        
        Args:
            only_online: If true, only online friends are returned
            
        Returns:
            List of strings — users' handles
        """
        params = {}
        if only_online:
            params["onlyOnline"] = "true"
            
        return self._make_request("user.friends", params)
    
    def user_info(self, handles: Union[str, List[str]],
                  check_historic_handles: bool = True) -> List[Dict[str, Any]]:
        """
        Returns information about one or several users.
        
        Args:
            handles: Single handle or list of handles (max 10000)
            check_historic_handles: If true, historic handles are checked
            
        Returns:
            List of User objects
        """
        if isinstance(handles, list):
            handles = ";".join(handles)
            
        params = {"handles": handles}
        if not check_historic_handles:
            params["checkHistoricHandles"] = "false"
            
        return self._make_request("user.info", params)
    
    def user_ratedList(self, active_only: bool = True,
                       include_retired: bool = False) -> List[Dict[str, Any]]:
        """
        Returns list of users who have participated in at least one rated contest.
        
        Args:
            active_only: If true, only users with active accounts are shown
            include_retired: If true, retired users are included
            
        Returns:
            List of User objects, sorted in decreasing order of rating
        """
        params = {}
        if active_only:
            params["activeOnly"] = "true"
        if include_retired:
            params["includeRetired"] = "true"
            
        return self._make_request("user.ratedList", params)
    
    def user_rating(self, handle: str) -> List[Dict[str, Any]]:
        """
        Returns rating history of the specified user.
        
        Args:
            handle: Codeforces user handle
            
        Returns:
            List of RatingChange objects
        """
        return self._make_request("user.rating", {"handle": handle})
    
    def user_status(self, handle: str, from_: int = 1, count: int = 50) -> List[Dict[str, Any]]:
        """
        Returns submissions of specified user.
        
        Args:
            handle: Codeforces user handle
            from_: 1-based index of the first submission to return
            count: Number of returned submissions
            
        Returns:
            List of Submission objects
        """
        return self._make_request("user.status", {
            "handle": handle,
            "from": from_,
            "count": count
        })

    def fetch_upcoming_contests(self, cutoff_days: Optional[int] = None):
        """
            fetch upcoming contests from cf api
        """
        cf_contests = self.contest_list(gym=False)
        fetched_contests = []
        for contest in cf_contests:
            td = (datetime.now() - datetime.fromtimestamp(contest['startTimeSeconds'])).days
            if (contest['phase'] == 'BEFORE') and ('div' in contest['name'].lower()) and (cutoff_days is None or td < cutoff_days):
                fetched_contests.append(contest)

        return fetched_contests

    def fetch_finished_contests(self, cutoff_days: Optional[int] = None):
        """
            fetch finished contests from cf api
        """
        cf_contests = self.contest_list(gym=False)
        fetched_contests = []
        for contest in cf_contests:
            td = (datetime.now() - datetime.fromtimestamp(contest['startTimeSeconds'])).days
            if (contest['phase'] == 'FINISHED') and ('div' in contest['name'].lower()) and (cutoff_days is None or td < cutoff_days):
                fetched_contests.append(contest)

        return fetched_contests

cf_api = CodeforcesAPI()

# Example usage
if __name__ == "__main__":
    # Initialize API client (anonymous access)
    cf = CodeforcesAPI()
    
    # Example 1: Get user info
    print("=== User Info ===")
    users = cf.user_info("tourist")
    for user in users:
        print(f"Handle: {user['handle']}, Rating: {user.get('rating', 'N/A')}")
    
    # Example 2: Get recent contests
    print("\n=== Recent Contests ===")
    contests = cf.contest_list()
    for contest in contests[:5]:  # Show first 5
        print(f"Contest: {contest['name']}, Phase: {contest['phase']}")
    
    # Example 3: Get problems by tag
    print("\n=== DP Problems ===")
    result = cf.problemset_problems(tags=["dp"])
    problems = result['problems']
    for problem in problems[:5]:  # Show first 5
        print(f"Problem: {problem['name']} ({problem['contestId']}{problem['index']})")
    
    # Example 4: Get user's recent submissions
    print("\n=== Recent Submissions ===")
    submissions = cf.user_status("tourist", count=5)
    for sub in submissions:
        verdict = sub.get('verdict', 'TESTING')
        print(f"Problem {sub['problem']['name']}: {verdict}")
    
    # Example with authentication (uncomment and add your credentials)
    # cf_auth = CodeforcesAPI(api_key="your_key", api_secret="your_secret")
    # friends = cf_auth.user_friends()
    # print(f"Friends: {friends}")