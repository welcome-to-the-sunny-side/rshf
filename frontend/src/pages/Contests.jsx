import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import styles from './Contests.module.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

export default function Contests() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [pastContests, setPastContests] = useState([]);
  const [loading, setLoading] = useState({ upcoming: true, past: true });
  const [error, setError] = useState({ upcoming: null, past: null });
  
  useEffect(() => {
    // Check if the user is authenticated
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch contests when component mounts
    fetchUpcomingContests();
    fetchPastContests();
  }, [navigate, token]);
  
  const fetchUpcomingContests = async () => {
    try {
      setLoading(prev => ({ ...prev, upcoming: true }));
      setError(prev => ({ ...prev, upcoming: null }));
      
      // Fetch active/upcoming contests (finished=false)
      const response = await axios.get('/api/contests', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { finished: false }
      });
      
      // Sort contests by start datetime in ascending order (upcoming shows soonest first)
      const sortedData = [...response.data].sort((a, b) => a.start_time_posix - b.start_time_posix);
      setUpcomingContests(sortedData);
    } catch (err) {
      console.error('Error fetching upcoming contests:', err);
      setError(prev => ({ 
        ...prev, 
        upcoming: API_MESSAGES.ERROR 
      }));
      setUpcomingContests([]);
    } finally {
      setLoading(prev => ({ ...prev, upcoming: false }));
    }
  };
  
  const fetchPastContests = async () => {
    try {
      setLoading(prev => ({ ...prev, past: true }));
      setError(prev => ({ ...prev, past: null }));
      
      // Fetch past contests (finished=true)
      const response = await axios.get('/api/contests', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { finished: true }
      });
      
      // Sort contests by start datetime in descending order (past shows most recent first)
      const sortedData = [...response.data].sort((a, b) => b.start_time_posix - a.start_time_posix);
      setPastContests(sortedData);
    } catch (err) {
      console.error('Error fetching past contests:', err);
      setError(prev => ({ 
        ...prev, 
        past: API_MESSAGES.ERROR 
      }));
      setPastContests([]);
    } finally {
      setLoading(prev => ({ ...prev, past: false }));
    }
  };

  // Transform the data for the TableBox component
  const columns = ["Contest", "Platform", "Date/Time"];
  
  // Function to create a Link component for all contests
  const createContestLink = (contest) => {
    return <Link to={`/contest/${contest.contest_id}`} className="tableCellLink">{contest.contest_name}</Link>;
  };

  // Function to format date for display
  const formatDateTime = (timestamp) => {
    const dateTime = new Date(timestamp * 1000); // Convert from Unix seconds to JavaScript milliseconds
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format data for upcoming contests
  const upcomingData = upcomingContests.length === 0 && !loading.upcoming && !error.upcoming
    ? [[API_MESSAGES.NO_DATA, "", ""]]
    : upcomingContests.map(contest => [
        createContestLink(contest),
        contest.platform,
        formatDateTime(contest.start_time_posix)
      ]);
  
  // Format data for past contests
  const pastData = pastContests.length === 0 && !loading.past && !error.past
    ? [[API_MESSAGES.NO_DATA, "", ""]]
    : pastContests.map(contest => [
        createContestLink(contest),
        contest.platform,
        formatDateTime(contest.start_time_posix)
      ]);

  return (
    <div className="page-container contestsPage">
      {/* Error messages */}
      {error.upcoming && (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      )}
      
      {error.past && (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      )}
      
      {/* Active/Upcoming Contests */}
      {loading.upcoming ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : (
        <TableBox 
          title={<span className={titleStyles.titleText}>Active/Upcoming Contests</span>}
          columns={columns}
          data={upcomingData}
          backgroundColor="rgb(230, 255, 230)" // Light green background
          className="contestsTable"
        />
      )}

      {/* Past Contests - Using PagedTableBox */}
      {loading.past ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : (
        <PagedTableBox 
          title={<span className={titleStyles.titleText}>Past Contests</span>}
          columns={columns}
          data={pastData}
          backgroundColor="rgb(245, 245, 245)" // Light gray background
          itemsPerPage={15}
          className="contestsTable"
        />
      )}
    </div>
  );
}
