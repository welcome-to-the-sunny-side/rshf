import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import TableBox from '../components/TableBox';
import { getRatingColor } from '../utils/ratingUtils';
import styles from './ContestPage.module.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

const ContestPage = () => {
  const { contest_id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // State for contest data
  const [contestData, setContestData] = useState(null);
  // State for current user's participations in this contest (across all their groups)
  const [currentUserParticipations, setCurrentUserParticipations] = useState([]);
  // State for all groups the current user is a member of
  const [userGroupMemberships, setUserGroupMemberships] = useState([]);
  // State for contest registration counts for each of the user's groups
  const [groupContestCounts, setGroupContestCounts] = useState({});
  
  // Loading and error states
  const [loading, setLoading] = useState({
    contest: true,
    currentUserParticipations: true,
    userGroupMemberships: true,
    groupContestCounts: false, // Initially false, true when fetching counts
  });
  const [error, setError] = useState({
    contest: null,
    currentUserParticipations: null,
    userGroupMemberships: null,
    groupContestCounts: null,
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchContestData();
    fetchCurrentUserParticipations();
    fetchUserGroupMemberships();
  }, [contest_id, token, navigate, user]); // Added user dependency for user.user_id

  useEffect(() => {
    if (contestData && !contestData.finished && userGroupMemberships.length > 0) {
      fetchGroupContestCountsForAllGroups();
    }
  }, [contestData, userGroupMemberships, contest_id, token]);

  // Function to fetch contest data
  const fetchContestData = async () => {
    try {
      setLoading(prev => ({ ...prev, contest: true }));
      setError(prev => ({ ...prev, contest: null }));
      const response = await axios.get('/api/contest', {
        headers: { Authorization: `Bearer ${token}` },
        params: { contest_id: contest_id }
      });
      setContestData(response.data);
    } catch (err) {
      console.error('Error fetching contest data:', err);
      setError(prev => ({ ...prev, contest: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, contest: false }));
    }
  };

  // Function to fetch current user's participation data for this contest
  const fetchCurrentUserParticipations = async () => {
    if (!user || !user.user_id) return; // Ensure user context is loaded
    try {
      setLoading(prev => ({ ...prev, currentUserParticipations: true }));
      setError(prev => ({ ...prev, currentUserParticipations: null }));
      const response = await axios.get('/api/contest_participations', {
        headers: { Authorization: `Bearer ${token}` },
        params: { cid: contest_id, uid: user.user_id }
      });
      setCurrentUserParticipations(response.data);
    } catch (err) {
      console.error('Error fetching current user participation data:', err);
      setError(prev => ({ ...prev, currentUserParticipations: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, currentUserParticipations: false }));
    }
  };

  // Function to fetch all groups the current user is a member of
  const fetchUserGroupMemberships = async () => {
    if (!user || !user.user_id) return; // Ensure user context is loaded
    try {
      setLoading(prev => ({ ...prev, userGroupMemberships: true }));
      setError(prev => ({ ...prev, userGroupMemberships: null }));
      const response = await axios.get(`/api/user?user_id=${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserGroupMemberships(response.data.group_memberships || []);
    } catch (err) {
      console.error('Error fetching user group memberships:', err);
      setError(prev => ({ ...prev, userGroupMemberships: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, userGroupMemberships: false }));
    }
  };

  // Function to fetch contest group counts for all user's groups
  const fetchGroupContestCountsForAllGroups = async () => {
    setLoading(prev => ({ ...prev, groupContestCounts: true }));
    setError(prev => ({ ...prev, groupContestCounts: null }));
    const counts = {};
    try {
      for (const membership of userGroupMemberships) {
        const groupId = membership.group_id;
        try {
          const response = await axios.get('/api/contest_group_counts', {
            headers: { Authorization: `Bearer ${token}` },
            params: { contest_id: contest_id, group_id: groupId }
          });
          counts[groupId] = response.data || { total_participation: 0, total_members: 'N/A' }; // Handle null response from API
        } catch (err) {
          console.error(`Error fetching contest counts for group ${groupId}:`, err);
          counts[groupId] = { total_participation: 'Error', total_members: 'Error' }; 
        }
      }
      setGroupContestCounts(counts);
    } catch (err) {
      // This catch is for errors in the loop logic itself, individual fetch errors are handled inside
      console.error('Error in fetchGroupContestCountsForAllGroups loop:', err);
      setError(prev => ({ ...prev, groupContestCounts: 'Error fetching some group counts' }));
    } finally {
      setLoading(prev => ({ ...prev, groupContestCounts: false }));
    }
  };

  // Format date for display
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'TBD';
    const dateTime = new Date(timestamp * 1000);
    return dateTime.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };
  
  // Handle registration/unregistration button click
  const handleRegistrationClick = (groupId, currentStatus) => {
    // TODO: Implement actual registration/unregistration API call
    console.log(`${currentStatus ? 'Unregistering from' : 'Registering for'} contest ${contest_id} in group ${groupId}`);
    // After successful API call, you would typically refetch relevant data:
    // fetchCurrentUserParticipations();
    // fetchGroupContestCountsForAllGroups(); 
  };
  
  const upcomingColumns = ["Group", "Registered", "Action"];
  const completedColumns = ["Group", "Rank/Participants/Members", "Rating Change", "Final Rating"];
  
  const getTableData = () => {
    if (!contestData) return [];

    if (!contestData.finished) {
      // Upcoming contests: Iterate through user's groups
      if (loading.userGroupMemberships || loading.groupContestCounts || loading.currentUserParticipations) {
        // Return a placeholder or an empty array if critical data is still loading
        return []; // Or a single row indicating loading for these parts
      }
      return userGroupMemberships.map(membership => {
        const groupId = membership.group_id;
        const counts = groupContestCounts[groupId] || { total_participation: '...', total_members: '...' };
        const registeredText = `${counts.total_participation || 0} / ${counts.total_members || 'N/A'}`;
        
        const isCurrentUserRegistered = currentUserParticipations.some(p => p.group_id === groupId);

        return [
          <Link key={`${groupId}-link`} to={`/group/${groupId}/contest/${contest_id}`} className="tableCellLink">
            {groupId} {/* Ideally, this would be group_name */}
          </Link>,
          registeredText,
          <button 
            key={`${groupId}-action`}
            className={`global-button ${isCurrentUserRegistered ? 'red' : 'green'}`}
            onClick={() => handleRegistrationClick(groupId, isCurrentUserRegistered)}
            // disabled={true} // Enable for interaction, actual API call is TODO
          >
            {isCurrentUserRegistered ? 'Unregister' : 'Register'}
          </button>
        ];
      });
    } else {
      // Completed contests: Iterate through current user's participations
      if (loading.currentUserParticipations) return [];
      if (!currentUserParticipations || currentUserParticipations.length === 0) return [];

      return currentUserParticipations.map(participation => {
        const ratingChange = (participation.rating_after != null && participation.rating_before != null) 
          ? participation.rating_after - participation.rating_before 
          : null;
        const ratingChangeText = ratingChange === null ? 'N/A' : (ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString());
        const ratingChangeColor = ratingChange === null ? 'gray' : (ratingChange > 0 ? 'green' : 'red');
        
        // Get total participants and members for this group in this contest from group_views
        const groupViewData = contestData.group_views && contestData.group_views[participation.group_id];
        const participantCount = groupViewData ? groupViewData.total_participation : 0;
        const totalMembers = groupViewData ? groupViewData.total_members : 0;

        return [
          <Link key={`${participation.group_id}-link`} to={`/group/${participation.group_id}/contest/${contest_id}`} className="tableCellLink">
            {participation.group_id} {/* Ideally, group_name */}
          </Link>,
          <>
            <span style={{ fontWeight: 'bold' }}>{participation.rank || 'N/A'}</span>
            <span style={{ fontSize: '0.7rem' }}>
              /{participantCount || 0}/{totalMembers || 0}
            </span>
          </>,
          <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
          <span style={{ color: getRatingColor(participation.rating_after), fontWeight: 'bold' }}>
            {participation.rating_after != null ? participation.rating_after : 'N/A'}
          </span>
        ];
      });
    }
  };
  
  // Determine overall loading state for the main content sections
  const isPageLoading = loading.contest || (contestData && !contestData.finished && (loading.userGroupMemberships || loading.currentUserParticipations));
  const pageError = error.contest || (contestData && !contestData.finished && (error.userGroupMemberships || error.currentUserParticipations || error.groupContestCounts));

  return (
    <div className="page-container">
      {isPageLoading ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : pageError ? (
        <div className="api-feedback-container error-message">
          {pageError} {/* Display the first relevant error */}
        </div>
      ) : contestData ? (
        <>
          {/* Contest Info Box */}
          <ContentBoxWithTitle title="Contest Info" backgroundColor="rgb(240, 240, 255)">
            <div>
              <h2 className="profileName" style={{ margin: '2.5px 0 5px 0' }}>{contestData.contest_name}</h2>
              <div className={`${styles.statsList}`}>
                <div className={`${styles.statItem} standardTextFont`}>
                  Status: <span style={{ color: !contestData.finished ? 'green' : '#E6A700' }}>
                    {!contestData.finished ? 'Upcoming/Active' : 'Completed'}
                  </span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Link: {contestData.link === 'TBA' ? (
                    <span>{contestData.link}</span>
                  ) : (
                    <a href={contestData.link} target="_blank" rel="noopener noreferrer">{contestData.link}</a>
                  )}
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Date/Time: <span>{formatDateTime(contestData.start_time_posix)}</span>
                </div>
                {contestData.duration_seconds && (
                  <div className={`${styles.statItem} standardTextFont`}>
                    Duration: <span>{Math.floor(contestData.duration_seconds / 3600)} hours {Math.floor((contestData.duration_seconds % 3600) / 60)} minutes</span>
                  </div>
                )}
                <div className={`${styles.statItem} standardTextFont`}>
                  Platform: <span>{contestData.platform.charAt(0).toUpperCase() + contestData.platform.slice(1)}</span>
                </div>
              </div>
            </div>
          </ContentBoxWithTitle>
          
          {/* Group View Box */}
          {/* Specific loading/error for table section if needed, or rely on overall pageError */}
          { (loading.groupContestCounts && !contestData.finished) ? (
              <div className="api-feedback-container loading-message" style={{ marginTop: '20px' }}>
                Loading group registration data...
              </div>
            ) : error.groupContestCounts && !contestData.finished ? (
              <div className="api-feedback-container error-message" style={{ marginTop: '20px' }}>
                {error.groupContestCounts}
              </div>
            ) : (
            <div style={{ marginTop: '20px' }}>
              <TableBox 
                title="Group View"
                columns={!contestData.finished ? upcomingColumns : completedColumns}
                data={getTableData()}
                backgroundColor="rgb(230, 255, 230)"
                emptyMessage={API_MESSAGES.NO_DATA} // Or more specific message if data is empty due to no groups/participations
              />
            </div>
          )}
        </>
      ) : (
        // This case implies contestData is null and not loading, and no primary error shown yet.
        // Typically means contest not found or initial fetch failed without setting specific error.
        <div className="api-feedback-container error-message">
          {API_MESSAGES.NOT_FOUND} 
        </div>
      )}
    </div>
  );
};

export default ContestPage;