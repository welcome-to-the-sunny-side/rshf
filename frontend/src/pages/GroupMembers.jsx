import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';

export default function GroupMembers() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Determine which buttons to show based on user role
  const showModViewButton = userRole === "moderator";
  
  // State for members data
  const [membersData, setMembersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Function to generate random report accuracy data (since it's not in the API)
  const generateReportAccuracy = () => {
    const total = Math.floor(Math.random() * 15) + 5; // 5-20 total reports
    const accepted = Math.floor(Math.random() * (total + 1)); // 0 to total accepted reports
    return { accepted, total };
  };
  
  // Fetch members data from API
  useEffect(() => {
    const fetchMembersData = async () => {
      try {
        setLoading(true);
        
        // Use real API endpoint to get group members data
        const response = await fetch(`/api/group_members_custom_data?group_id=${groupId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Assume token is stored in localStorage
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching group members: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Transform API data to match expected format
        // The API response includes cf_handle, role, user_group_rating, user_group_max_rating, 
        // date_joined, and number_of_rated_contests, but not report accuracy
        const transformedData = data.map(member => ({
          username: member.cf_handle,
          role: member.role,
          rating: member.user_group_rating,
          maxRating: member.user_group_max_rating,
          ratedContests: member.number_of_rated_contests,
          reportAccuracy: generateReportAccuracy(), // Using dummy data for report accuracy
          dateJoined: member.date_joined
        }));
        
        setMembersData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch members data:', err);
        setError('Failed to load group members. Please try again later.');
        
        // Fallback to empty array if there's an error
        setMembersData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (groupId) {
      fetchMembersData();
    }
  }, [groupId]);
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Define columns for the table
  const columns = ["User", "Role", "Rating", "Max Rating", "Rated Contests", "Report Accuracy", "Date Joined"];
  
  // Transform the data for the table component
  const tableRows = membersData.map(member => [
    <Link to={`/user/${member.username}`} className="tableCellLink" style={{ color: getRatingColor(member.rating), fontWeight: 'bold' }}>{member.username}</Link>,
    <span style={{ textTransform: 'capitalize' }}>{member.role}</span>,
    <span style={{ color: getRatingColor(member.rating), fontWeight: 'bold' }}>{member.rating}</span>,
    <span style={{ color: getRatingColor(member.maxRating), fontWeight: 'bold' }}>{member.maxRating}</span>,
    member.ratedContests,
    <span title={`${member.reportAccuracy.accepted} accepted out of ${member.reportAccuracy.total} reports`}>
      {Math.round((member.reportAccuracy.accepted / member.reportAccuracy.total) * 100)}% ({member.reportAccuracy.accepted}/{member.reportAccuracy.total})
    </span>,
    formatDate(member.dateJoined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Error message */}
      {error && (
        <div className="error-message" style={{ color: 'red', margin: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator" style={{ textAlign: 'center', margin: '50px' }}>
          Loading group members...
        </div>
      ) : (
        /* Members table */
        <SortablePagedTableBox 
          columns={columns}
          data={tableRows}
          backgroundColor="rgb(230, 240, 255)"
          itemsPerPage={15}
          initialSortColumnIndex={2} // Rating column
          initialSortDirection="desc" // Descending order
        />
      )}
    </div>
  );
} 