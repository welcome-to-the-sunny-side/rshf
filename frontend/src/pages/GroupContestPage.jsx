import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import LazyLoadingSortablePagedTableBox from '../components/LazyLoadingSortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import styles from './ContestPage.module.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

const ITEMS_PER_PAGE = 15;

const GroupContestPage = () => {
  const { groupId, contestId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [contestData, setContestData] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userContestStatus, setUserContestStatus] = useState(null);
  const [userParticipationLoading, setUserParticipationLoading] = useState(true);
  const [userParticipationError, setUserParticipationError] = useState(null);
  // Per-button loading and error state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Handle registration/unregistration button click
  const handleRegistrationClick = async () => {
    if (!user || !user.user_id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        contest_id: contestId,
        group_id: groupId,
        user_id: user.user_id,
      };
      const url = isRegistered ? '/api/contest/deregister' : '/api/contest/register';
      await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh both user participation and contest data
      await fetchUserParticipationStatus();
      await fetchContestData();
    } catch (err) {
      let msg = API_MESSAGES.ERROR;
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };


  const [pagedParticipationData, setPagedParticipationData] = useState([]);
  const [totalParticipations, setTotalParticipations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'rank',
    direction: 'asc',
  });

  const [loading, setLoading] = useState({
    contest: true,
    participationsTable: true,
  });
  const [error, setError] = useState({
    contest: null,
    participationsTable: null,
  });

  useEffect(() => {
    if (contestData) {
      setSortConfig({
        key: contestData.finished ? 'rank' : 'rating_before',
        direction: contestData.finished ? 'asc' : 'desc',
      });
    }
  }, [contestData]);

  const fetchContestData = useCallback(async () => {
    if (!token || !contestId) return;
    setLoading(prev => ({ ...prev, contest: true }));
    setError(prev => ({ ...prev, contest: null }));
    try {
      const response = await axios.get('/api/contest', {
        headers: { Authorization: `Bearer ${token}` },
        params: { contest_id: contestId },
      });
      setContestData(response.data);
    } catch (err) {
      console.error('Error fetching contest data:', err);
      setError(prev => ({ ...prev, contest: API_MESSAGES.ERROR }));
    } finally {
      setLoading(prev => ({ ...prev, contest: false }));
    }
  }, [contestId, token]);

  const fetchUserParticipationStatus = useCallback(async () => {
    if (!user || !token || !groupId || !contestId) {
      setUserParticipationLoading(false);
      return;
    }
    setUserParticipationLoading(true);
    setUserParticipationError(null);
    setIsRegistered(false);
    setUserContestStatus(null);

    try {
      const response = await axios.get('/api/contest_participations', {
        headers: { Authorization: `Bearer ${token}` },
        params: { gid: groupId, cid: contestId, uid: user.user_id },
      });

      if (response.data && response.data.length > 0) {
        const userParticipation = response.data[0];
        setIsRegistered(true);
        if (contestData?.finished) {
          setUserContestStatus({
            rank: userParticipation.rank,
            ratingChange: userParticipation.rating_after - userParticipation.rating_before,
            finalRating: userParticipation.rating_after,
          });
        }
      } else {
        setIsRegistered(false);
        setUserContestStatus(null);
      }
    } catch (err) {
      console.error('Error fetching user participation status:', err);
      setUserParticipationError(API_MESSAGES.ERROR);
    } finally {
      setUserParticipationLoading(false);
    }
  }, [user, token, groupId, contestId, contestData]);

  const fetchPagedParticipations = useCallback(async () => {
    if (!token || !groupId || !contestId) {
        setLoading(prev => ({ ...prev, participationsTable: false }));
        return;
    }
    setLoading(prev => ({ ...prev, participationsTable: true }));
    setError(prev => ({ ...prev, participationsTable: null }));

    try {
      const sizeResponse = await axios.get('/api/contest_participations_size', {
        headers: { Authorization: `Bearer ${token}` },
        params: { gid: groupId, cid: contestId },
      });
      const count = sizeResponse.data.count;
      setTotalParticipations(count);

      if (count > 0) {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const rangeResponse = await axios.get('/api/contest_participations_range_fetch', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            gid: groupId,
            cid: contestId,
            sort_by: sortConfig.key,
            sort_dir: sortConfig.direction,
            offset: offset,
            limit: ITEMS_PER_PAGE,
          },
        });
        setPagedParticipationData(rangeResponse.data.items);
      } else {
        setPagedParticipationData([]);
      }
    } catch (err) {
      console.error('Error fetching paged participation data:', err);
      setError(prev => ({ ...prev, participationsTable: API_MESSAGES.ERROR }));
      setPagedParticipationData([]);
      setTotalParticipations(0);
    } finally {
      setLoading(prev => ({ ...prev, participationsTable: false }));
    }
  }, [groupId, contestId, token, currentPage, sortConfig]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchContestData();
  }, [token, navigate, fetchContestData]);

  useEffect(() => {
    if (contestData) {
        fetchUserParticipationStatus();
    }
  }, [contestData, fetchUserParticipationStatus]);

  useEffect(() => {
    if (contestData) {
        fetchPagedParticipations();
    }
  }, [contestData, fetchPagedParticipations]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'TBD';
    const dateTime = new Date(timestamp * 1000);
    return dateTime.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSort = (columnKey) => {
    setCurrentPage(1);
    setSortConfig(prevConfig => ({
      key: columnKey,
      direction: prevConfig.key === columnKey && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const registrationColumns = [
    {
      key: 'cf_handle', label: 'Username', sortable: true,
      render: (item) => (
        <Link
          to={`/user/${item.cf_handle}`}
          className="tableCellLink"
          style={{ color: getRatingColor(item.rating_before || 0), fontWeight: 'bold' }}
        >
          {item.cf_handle}
        </Link>
      ),
    },
    {
      key: 'rating_before', label: 'Rating', sortable: true,
      render: (item) => (
        <span style={{ color: getRatingColor(item.rating_before || 0), fontWeight: 'bold' }}>
          {item.rating_before || 'Unrated'}
        </span>
      ),
    },
  ];

  const rankColumns = [
    {
      key: 'rank', label: 'Rank', sortable: true,
      render: (item) => item.rank || '-',
    },
    {
      key: 'cf_handle', label: 'Username', sortable: true,
      render: (item) => (
        <Link
          to={`/user/${item.cf_handle}`}
          className="tableCellLink"
          style={{ color: getRatingColor(item.rating_after || 0), fontWeight: 'bold' }}
        >
          {item.cf_handle}
        </Link>
      ),
    },
    {
      key: 'rating_change', label: 'Rating Change', sortable: true,
      render: (item) => {
        const ratingChange = item.rating_after !== null && item.rating_before !== null
          ? item.rating_after - item.rating_before
          : 0;
        return (
          <span style={{
            color: ratingChange > 0 ? 'green' : (ratingChange < 0 ? 'red' : 'gray'),
            fontWeight: 'bold',
          }}>
            {ratingChange > 0 ? `+${ratingChange}` : ratingChange}
          </span>
        );
      },
    },
    {
      key: 'rating_after', label: 'Final Rating', sortable: true,
      render: (item) => (
        <span style={{ color: getRatingColor(item.rating_after || 0), fontWeight: 'bold' }}>
          {item.rating_after || 'Unrated'}
        </span>
      ),
    },
  ];

  const currentColumns = contestData?.finished ? rankColumns : registrationColumns;

  if (loading.contest) {
    return <div className="api-feedback-container loading-message">{API_MESSAGES.LOADING}</div>;
  }

  if (error.contest) {
    return <div className="api-feedback-container error-message">{API_MESSAGES.ERROR}</div>;
  }
  
  if (!contestData) {
    return <div className="api-feedback-container error-message">{API_MESSAGES.NOT_FOUND}</div>;
  }

  return (
    <div className="page-container">
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
                Registered: <span style={{ fontWeight: 'bold' }}>{totalParticipations}</span>
              </div>
            )}
            
            {/* For completed contests, show user performance */}
            {contestData.finished && userContestStatus && (
              <>
                <div className={`${styles.statItem} standardTextFont`}>
                  Rank/Participants: <span style={{ fontWeight: 'bold' }}>{userContestStatus.rank}</span>
                  <span style={{ fontSize: '0.7rem' }}>
                    /{totalParticipations}
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
            {contestData.finished && (!userContestStatus || userParticipationLoading) && totalParticipations > 0 && (
              <div className={`${styles.statItem} standardTextFont`}>
                Participants: <span style={{ fontWeight: 'bold' }}>{totalParticipations}</span>
              </div>
            )}
          </div>
          
          {/* Registration button - now functional */}
          {!contestData.finished && (
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }} className="align-left">
              <button
                className={`global-button small ${isRegistered ? 'red' : 'green'}`}
                style={{ minWidth: 110 }}
                disabled={userParticipationLoading || actionLoading || contestData.finished}
                onClick={handleRegistrationClick}
              >
                {userParticipationLoading || actionLoading
                  ? (isRegistered ? 'Unregistering...' : 'Registering...')
                  : (isRegistered ? 'Unregister' : 'Register')}
              </button>
              {actionError && (
                <span className="api-feedback-container error-message" style={{ fontSize: '0.8em', marginTop: 2, textAlign: 'left', maxWidth: 180 }}>{actionError}</span>
              )}
            </div>
          )}
        </div>
      </ContentBoxWithTitle>
      
      {/* Registration or Rank list Box */}
      {loading.participationsTable ? (
        <div className="api-feedback-container loading-message" style={{ marginTop: '20px' }}>
          {API_MESSAGES.LOADING}
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <LazyLoadingSortablePagedTableBox 
            title={!contestData.finished ? "Registration List" : "Rank List"}
            columns={currentColumns}
            items={pagedParticipationData}
            totalItems={totalParticipations}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            sortConfig={sortConfig}
            onSortChange={handleSort}
            isLoading={loading.participationsTable}
            error={error.participationsTable}
            noDataMessage={API_MESSAGES.NO_DATA}
            backgroundColor="rgb(230, 255, 230)"
          />
        </div>
      )}
    </div>
  );
};

export default GroupContestPage;
