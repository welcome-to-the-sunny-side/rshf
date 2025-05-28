import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import styles from './ContestPage.module.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

const GroupContestPage = () => {
  const { groupId, contestId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // State for contest and participation data
  const [contestData, setContestData] = useState(null);
  const [participationData, setParticipationData] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userContestStatus, setUserContestStatus] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState({
    contest: true,
    participations: true
  });
  const [error, setError] = useState({
    contest: null,
    participations: null
  });

  useEffect(() => {
    // Check if the user is authenticated
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch contest and participation data
    fetchContestData();
    fetchParticipationData();
  }, [contestId, groupId, token, navigate]);

  // Function to fetch contest data
  const fetchContestData = async () => {
    try {
      setLoading(prev => ({ ...prev, contest: true }));
      setError(prev => ({ ...prev, contest: null }));

      const response = await axios.get('/api/contest', {
        headers: { Authorization: `Bearer ${token}` },
        params: { contest_id: contestId }
      });

      setContestData(response.data);
    } catch (err) {
      console.error('Error fetching contest data:', err);
      setError(prev => ({ ...prev, contest: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, contest: false }));
    }
  };

  // Function to fetch participation data
  const fetchParticipationData = async () => {
    try {
      setLoading(prev => ({ ...prev, participations: true }));
      setError(prev => ({ ...prev, participations: null }));

      const response = await axios.get('/api/contest_participations', {
        headers: { Authorization: `Bearer ${token}` },
        params: { gid: groupId, cid: contestId }
      });

      setParticipationData(response.data);

      // Check if the current user is registered
      if (user) {
        const userParticipation = response.data.find(p => p.cf_handle === user.cf_handle);
        setIsRegistered(!!userParticipation);
      }
    } catch (err) {
      console.error('Error fetching participation data:', err);
      setError(prev => ({ ...prev, participations: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, participations: false }));
    }
  };

  // Format date for display
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'TBD';

    const dateTime = new Date(timestamp * 1000); // Convert from Unix seconds to JavaScript milliseconds
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Set userContestStatus when both contestData and participationData are loaded and contest is finished
  useEffect(() => {
    if (!contestData || !contestData.finished || !user || !participationData.length) {
      setUserContestStatus(null);
      return;
    }
    const userParticipation = participationData.find(p => p.cf_handle === user.cf_handle);
    if (userParticipation) {
      setUserContestStatus({
        rank: userParticipation.rank,
        participantCount: participationData.length,
        ratingChange: userParticipation.rating_after - userParticipation.rating_before,
        finalRating: userParticipation.rating_after
      });
    } else {
      setUserContestStatus(null);
    }
  }, [contestData, participationData, user]);

  // Prepare data for the registration list table (for upcoming contests)
  const registrationColumns = [
    "Username",
    "Rating"
  ];

  const registrationRows = !loading.participations && !error.participations && participationData.length > 0
    ? participationData.map(user => [
        <Link 
          to={`/user/${user.cf_handle}`}
          className="tableCellLink"
          style={{ color: getRatingColor(user.rating_before || 0), fontWeight: 'bold' }}
        >
          {user.cf_handle}
        </Link>,
        <span style={{ color: getRatingColor(user.rating_before || 0) }}>{user.rating_before || 'Unrated'}</span>
      ])
    : [];


  // Prepare data for the rank list table (for completed contests)
  const rankColumns = [
    "Rank",
    "Username",
    "Rating Change",
    "Final Rating"
  ];

  const rankRows = !loading.participations && !error.participations && participationData.length > 0
    ? participationData
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity)) // Sort by rank
        .map(user => {
          const ratingChange = user.rating_after !== null && user.rating_before !== null
            ? user.rating_after - user.rating_before
            : 0;
          
          // Get final rating for color
          const finalRating = user.rating_after || 0;
            
          return [
            user.rank || '-',
            <Link to={`/user/${user.cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(finalRating), fontWeight: 'bold' }}>{user.cf_handle}</Link>,
            <span style={{ 
              color: ratingChange > 0 ? 'green' : (ratingChange < 0 ? 'red' : 'gray'),
              fontWeight: 'bold'
            }}>
              {ratingChange > 0 ? `+${ratingChange}` : ratingChange}
            </span>,
            <span style={{ color: getRatingColor(finalRating), fontWeight: 'bold' }}>
              {user.rating_after || 'Unrated'}
            </span>
          ];
        })
    : [];

  return (
    <div className="page-container">
      {/* Error messages */}
      {error.contest && (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      )}
      
      {error.participations && (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      )}
      
      {/* Loading state */}
      {loading.contest ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : contestData ? (
        <>
          {/* Contest Info Box */}
          <ContentBoxWithTitle title="Contest Info" backgroundColor="rgb(240, 240, 255)">
            <div>
              {/* Contest name with group name */}
              <h2 className="profileName" style={{ margin: '2.5px 0 5px 0' }}>
  <Link to={`/contest/${contestId}`} className="contestLink" style={{ textDecoration: 'none', color: 'inherit' }}>
    {contestData.contest_name}
  </Link> (<Link to={`/group/${groupId}`}>{groupId}</Link>)
</h2>
              
              {/* Information elements list */}
              <div className={`${styles.statsList}`}>
                <div className={`${styles.statItem} standardTextFont`}>
                  Status: <span style={{ 
                    color: !contestData.finished ? 'green' : '#E6A700' 
                  }}>
                    {!contestData.finished ? 'Active/Upcoming' : 'Completed'}
                  </span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Link: <a href={contestData.link} target="_blank" rel="noopener noreferrer">{contestData.link}</a>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Date/Time: <span>{formatDateTime(contestData.start_time_posix)}</span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Duration: <span>{contestData.duration_seconds ? `${Math.floor(contestData.duration_seconds / 3600)} hours ${Math.floor((contestData.duration_seconds % 3600) / 60)} minutes` : 'Not specified'}</span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Platform: <span>{contestData.platform.charAt(0).toUpperCase() + contestData.platform.slice(1)}</span>
                </div>
                {/* Registered stat for upcoming contests */}
                {!contestData.finished && (
                  <div className={`${styles.statItem} standardTextFont`}>
                    Registered: <span style={{ fontWeight: 'bold' }}>{participationData.length}</span>
                  </div>
                )}
                
                {/* For completed contests, show user performance */}
                {contestData.finished && userContestStatus && (
                  <>
                    <div className={`${styles.statItem} standardTextFont`}>
                      Rank/Participants: <span style={{ fontWeight: 'bold' }}>{userContestStatus.rank}</span>
                      <span style={{ fontSize: '0.7rem' }}>
                        /{userContestStatus.participantCount}
                      </span>
                    </div>
                    <div className={`${styles.statItem} standardTextFont`}>
                      Rating Change: <span style={{ 
                        color: userContestStatus.ratingChange > 0 ? 'green' : (userContestStatus.ratingChange < 0 ? 'red' : 'gray'),
                        fontWeight: 'bold' 
                      }}>
                        {userContestStatus.ratingChange > 0 ? `+${userContestStatus.ratingChange}` : userContestStatus.ratingChange}
                      </span>
                    </div>
                    <div className={`${styles.statItem} standardTextFont`}>
                      Final Rating: <span style={{ 
                        color: getRatingColor(userContestStatus.finalRating),
                        fontWeight: 'bold' 
                      }}>
                        {userContestStatus.finalRating}
                      </span>
                    </div>
                  </>
                )}
                {contestData.finished && !userContestStatus && participationData.length > 0 && (
                  <div className={`${styles.statItem} standardTextFont`}>
                    Participants: <span style={{ fontWeight: 'bold' }}>{participationData.length}</span>
                  </div>
                )}
              </div>
              
              {/* Registration button placeholder - functionality disabled as requested */}
              {!contestData.finished && (
                <div style={{ marginTop: '15px' }}>
                  <button 
                    className={`global-button ${isRegistered ? 'red' : 'green'}`}
                    disabled={true} // Disabled as requested
                  >
                    {isRegistered ? 'Unregister' : 'Register'}
                  </button>
                  <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#666' }}>
                    Registration functionality temporarily unavailable
                  </span>
                </div>
              )}
            </div>
          </ContentBoxWithTitle>
          
          {/* Registration or Rank list Box */}
          {loading.participations ? (
            <div className="api-feedback-container loading-message" style={{ marginTop: '20px' }}>
              {API_MESSAGES.LOADING}
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <SortablePagedTableBox 
                title={!contestData.finished ? "Registration List" : "Rank List"}
                columns={!contestData.finished ? registrationColumns : rankColumns}
                data={!contestData.finished ? registrationRows : rankRows}
                backgroundColor="rgb(230, 255, 230)"
                itemsPerPage={15}
                initialSortColumnIndex={!contestData.finished ? 1 : 0} // Rating column for registrations, Rank for results
                initialSortDirection={!contestData.finished ? "desc" : "asc"} // Descending for rating, ascending for rank
                emptyMessage={API_MESSAGES.NO_DATA}
              />
            </div>
          )}
        </>
      ) : (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.NOT_FOUND}
        </div>
      )}
    </div>
  );
};

export default GroupContestPage;
