import React, { useState, useEffect } from 'react';

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGroupUsers() {
      try {
        // First fetch the group data to get the memberships
        const groupResponse = await fetch('http://127.0.0.1:8000/api/group?group_id=g1');
        if (!groupResponse.ok) {
          throw new Error('Failed to fetch group data');
        }
        
        const groupData = await groupResponse.json();
        
        // Check if the group exists and has memberships
        if (!groupData.length || !groupData[0].memberships) {
          setUsers([]);
          setLoading(false);
          return;
        }
        
        // Extract user IDs from memberships
        const userIds = groupData[0].memberships.map(membership => membership.user_id);
        
        // Fetch user details for each user ID
        const userDetailsPromises = userIds.map(userId => 
          fetch(`http://127.0.0.1:8000/api/user?uid=${userId}`)
            .then(res => res.json())
        );
        
        const userDetails = await Promise.all(userDetailsPromises);
        setUsers(userDetails.flat());
      } catch (err) {
        console.error('Error fetching group users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGroupUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error: {error}</p>;
  if (users.length === 0) return <p>No users found in group g1</p>;

  return (
    <div>
      <h1>Users in Group g1</h1>
      <ul>
        {users.map(user => (
          <li key={user.user_id}>{user.cf_handle}</li>
        ))}
      </ul>
    </div>
  );
}
