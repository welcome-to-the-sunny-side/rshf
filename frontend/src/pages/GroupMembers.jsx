import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './GroupMembers.module.css';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

export default function GroupMembers() {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  
  // User role and permission state
  const [userRole, setUserRole] = useState(null);
  const [showModViewButton, setShowModViewButton] = useState(false);
  
  // State for members data
  const [membersData, setMembersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create placeholder for report accuracy data since it's not in the API
  const generateReportAccuracy = () => {
    return { accepted: 0, total: 0 };
  };
  
  // Check user's membership in the group to determine role
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !token) {
        setUserRole(null);
        setShowModViewButton(false);
        return;
      }
      
      try {
        const response = await axios.get(`/api/membership`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId, user_id: user.user_id }
        });
        
        if (response.data && response.data.role) {
          setUserRole(response.data.role);
          setShowModViewButton(response.data.role === "moderator" || response.data.role === "admin");
        } else {
          setUserRole(null);
          setShowModViewButton(false);
        }
      } catch (err) {
        console.error('Failed to check membership:', err);
        setUserRole(null);
        setShowModViewButton(false);
      }
    };
    
    if (groupId) {
      checkMembership();
    }
  }, [groupId, user, token]);

  // Fetch members data from API
  useEffect(() => {
    const fetchMembersData = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`/api/group_members_custom_data`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId }
        });
        
        const data = response.data;
        
        // Transform API data to match expected format
        const transformedData = data.map(member => ({
          username: member.cf_handle,
          role: member.role,
          rating: member.user_group_rating,
          maxRating: member.user_group_max_rating,
          ratedContests: member.number_of_rated_contests,
          reportAccuracy: generateReportAccuracy(), // Placeholder for report accuracy
          dateJoined: member.date_joined
        }));
        
        setMembersData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch members data:', err);
        setError(API_MESSAGES.ERROR);
        setMembersData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (groupId) {
      fetchMembersData();
    }
  }, [groupId, token]);
  
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
    member.reportAccuracy.total > 0 ? (
      <span title={`${member.reportAccuracy.accepted} accepted out of ${member.reportAccuracy.total} reports`}>
        {Math.round((member.reportAccuracy.accepted / member.reportAccuracy.total) * 100)}% ({member.reportAccuracy.accepted}/{member.reportAccuracy.total})
      </span>
    ) : (
      <span>hmmm...</span>
    ),
    formatDate(member.dateJoined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Error message */}
      
      
      {/* Loading indicator */}
      {loading ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : error ? (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      ) : membersData.length === 0 ? (
        <div className="api-feedback-container no-data-message">
          {API_MESSAGES.NO_DATA}
        </div>
      ) : (
        /* Members table */
        <div className={styles.membersTableWrapper}>
          <SortablePagedTableBox 
            columns={columns}
            data={tableRows}
            backgroundColor="rgb(230, 240, 255)"
            itemsPerPage={15}
            initialSortColumnIndex={2} // Rating column
            initialSortDirection="desc" // Descending order
            className="membersTable"
          />
        </div>
      )}
    </div>
  );
} 