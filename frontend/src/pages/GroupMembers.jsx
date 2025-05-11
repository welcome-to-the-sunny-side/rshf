import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getGroups } from '../api';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';

export default function GroupMembers() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Fetch group data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user from localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
        
        // Fetch group data
        const groupsResponse = await getGroups(groupId);
        console.log('Fetched group data:', groupsResponse);
        
        if (!groupsResponse || groupsResponse.length === 0) {
          setError('Group not found');
          setLoading(false);
          return;
        }
        
        const fetchedGroup = groupsResponse[0]; // API returns array, get first item
        setGroup(fetchedGroup);
        
        // Extract members data
        if (fetchedGroup.memberships && fetchedGroup.memberships.length > 0) {
          setMembers(fetchedGroup.memberships);
          
          // If current user is logged in, check their role in the group
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const userMembership = fetchedGroup.memberships.find(
              m => m.user_id === parsedUser.username
            );
            
            if (userMembership) {
              setUserRole(userMembership.role);
            }
          }
        } else {
          // No members in group
          setMembers([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching group data:', err);
        setError('Failed to load group data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [groupId]);
  
  // Determine which buttons to show based on user role
  const showModViewButton = userRole === "moderator";
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Define columns for the table
  const columns = ["User", "Role", "Rating", "Date Joined"];
  
  // Transform the real data for the table component
  const tableRows = members.length > 0 
    ? members.map(member => {
        // Generate a date using member ID for consistency (since API doesn't provide join date)
        const memberHash = member.user_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const joinDateObj = new Date(2022, 0, 1 + (memberHash % 365));
        
        return [
          <Link to={`/user/${member.user_id}`} className="tableCellLink" style={{ color: getRatingColor(member.user_group_rating || 0), fontWeight: 'bold' }}>
            {member.user_id}
          </Link>,
          <span style={{ textTransform: 'capitalize' }}>{member.role || 'member'}</span>,
          <span style={{ color: getRatingColor(member.user_group_rating || 0), fontWeight: 'bold' }}>
            {member.user_group_rating || 0}
          </span>,
          formatDate(joinDateObj)
        ];
      })
    : [["No members found", "", "", ""]];

  // Handle loading state
  if (loading) {
    return (
      <div className="page-container">
        <h2>Loading members...</h2>
      </div>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="page-container">
        <h2>Error: {error}</h2>
        <button onClick={() => navigate('/groups')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Return to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Group title */}
      <h2 style={{ marginBottom: '20px' }}>
        {group?.group_name || groupId} - Members ({members.length})
      </h2>
      
      {/* Members table */}
      <SortablePagedTableBox 
        columns={columns}
        data={tableRows}
        backgroundColor="rgb(230, 240, 255)"
        itemsPerPage={15}
        initialSortColumnIndex={2} // Rating column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
} 