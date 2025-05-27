import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import SortableTableBox from '../components/SortableTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';
import UserNavBar from '../components/UserNavBar';

// Import styles if needed
import styles from './UserGroups.module.css';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

export default function UserGroups() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { username } = useParams(); // This is the user_id from the URL
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userGroupsData, setUserGroupsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (user && username && user.user_id === username) {
      setIsOwnProfile(true);
    } else {
      setIsOwnProfile(false);
    }

    const fetchUserGroups = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/user?user_id=${username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        setUserGroupsData(userData.group_memberships || []);
      } catch (e) {
        console.error("Failed to fetch user groups:", e);
        setError(API_MESSAGES.ERROR);
      } finally {
        setLoading(false);
      }
    };

    if (username && token) {
      fetchUserGroups();
    }
  }, [navigate, token, user, username]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const columns = ["Group", "Rating", "Max Rating", "Date Joined"];
  const data = userGroupsData.map(membership => [
    <Link to={`/group/${membership.group_id}`} className="tableCellLink">{membership.group_id}</Link>,
    <span style={{ color: getRatingColor(membership.user_group_rating), fontWeight: 'bold' }}>
      {membership.user_group_rating}
    </span>,
    <span style={{ color: getRatingColor(membership.user_group_max_rating), fontWeight: 'bold' }}>
      {membership.user_group_max_rating}
    </span>,
    formatDate(membership.timestamp)
  ]);

  if (loading) {
    return <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <div className="api-feedback-container loading-message">{API_MESSAGES.LOADING}</div>
    </div>;
  }

  if (error) {
    return <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <div className="api-feedback-container error-message">{API_MESSAGES.ERROR}</div>
    </div>;
  }
  
  if (userGroupsData.length === 0) {
    return <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <div className="api-feedback-container no-data-message">{API_MESSAGES.NO_DATA}</div>
    </div>;
  }

  return (
    <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <SortableTableBox
        columns={columns}
        data={data}
        initialSortColumnIndex={1} // Sort by rating initially
        initialSortDirection="desc" // Highest ratings first
      />
    </div>
  );
}