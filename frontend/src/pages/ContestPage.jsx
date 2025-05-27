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

  // State for contest and participation data
  const [contestData, setContestData] = useState(null);
  const [participationData, setParticipationData] = useState([]);
  
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
  }, [contest_id, token, navigate]);

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

  // Function to fetch participation data
  const fetchParticipationData = async () => {
    try {
      setLoading(prev => ({ ...prev, participations: true }));
      setError(prev => ({ ...prev, participations: null }));

      const response = await axios.get('/api/contest_participations', {
        headers: { Authorization: `Bearer ${token}` },
        params: { cid: contest_id, uid: user.user_id }
      });

      setParticipationData(response.data);
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
  
  // Handle registration/unregistration button click (disabled for now)
  const handleRegistrationClick = (groupId, currentStatus) => {
    // This would send a request to the server in a fully implemented version
    console.log(`${currentStatus ? 'Unregistering' : 'Registering'} for group ID ${groupId}`);
  };
  
  // Define columns for the upcoming contest table
  const upcomingColumns = ["Group", "Registered", "Action"];
  
  // Define columns for the completed contest table
  const completedColumns = ["Group", "Rank/Participants/Members", "Rating Change", "Final Rating"];
  
  // Transform participation data for display
  const getTableData = () => {
    if (!contestData || !participationData.length) return [];
    
    if (!contestData.finished) {
      // For upcoming contests
      return participationData.map(participation => [
        <Link to={`/group/${participation.group_id}/contest/${contestId}`} className="tableCellLink">
          {participation.group_id}
        </Link>,
        `${participation.registered_count || 0}/${participation.total_members || 0}`,
        <button 
          className={`global-button ${participation.is_registered ? 'red' : 'green'}`}
          onClick={() => handleRegistrationClick(participation.group_id, participation.is_registered)}
          disabled={true} // Registration functionality disabled
        >
          {participation.is_registered ? 'Unregister' : 'Register'}
        </button>
      ]);
    } else {
      // For completed contests
      return participationData.map(participation => {
        const ratingChange = participation.rating_after - participation.rating_before;
        const ratingChangeText = ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString();
        const ratingChangeColor = ratingChange > 0 ? 'green' : (ratingChange < 0 ? 'red' : 'gray');
        
        return [
          <Link to={`/group/${participation.group_id}/contest/${contest_id}`} className="tableCellLink">
            {participation.group_id}
          </Link>,
          <>
            <span style={{ fontWeight: 'bold' }}>{participation.rank || 'N/A'}</span>
            <span style={{ fontSize: '0.7rem' }}>
              /{participation.participant_count || 0}/{participation.total_members || 0}
            </span>
          </>,
          <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
          <span style={{ color: getRatingColor(participation.rating_after), fontWeight: 'bold' }}>
            {participation.rating_after}
          </span>
        ];
      });
    }
  };
  
  return (
    <div className="page-container">
      {loading.contest ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : error.contest ? (
        <div className="api-feedback-container error-message">
          {error.contest}
        </div>
      ) : contestData ? (
        <>
          {/* Contest Info Box */}
          <ContentBoxWithTitle title="Contest Info" backgroundColor="rgb(240, 240, 255)">
            <div>
              {/* Contest name with drastically reduced padding */}
              <h2 className="profileName" style={{ margin: '2.5px 0 5px 0' }}>{contestData.contest_name}</h2>
              
              {/* Information elements list with standard font - applied to parent */}
              <div className={`${styles.statsList}`}>
                <div className={`${styles.statItem} standardTextFont`}>
                  Status: <span style={{ 
                    color: !contestData.finished ? 'green' : '#E6A700' 
                  }}>
                    {!contestData.finished ? 'active/upcoming' : 'completed'}
                  </span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Link: <a href={contestData.link} target="_blank" rel="noopener noreferrer">{contestData.link}</a>
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
          {loading.participations ? (
            <div className="api-feedback-container loading-message" style={{ marginTop: '20px' }}>
              {API_MESSAGES.LOADING}
            </div>
          ) : error.participations ? (
            <div className="api-feedback-container error-message" style={{ marginTop: '20px' }}>
              {error.participations}
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <TableBox 
                title="Group View"
                columns={!contestData.finished ? upcomingColumns : completedColumns}
                data={getTableData()}
                backgroundColor="rgb(230, 255, 230)"
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

export default ContestPage;