import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import styles from './Contests.module.css';

// Backend URL
const BACKEND_URL = 'http://localhost:8000/api';

export default function Contests() {
  const navigate = useNavigate();
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [pastContests, setPastContests] = useState([]);
  const [loading, setLoading] = useState({ upcoming: false, past: false });
  const [error, setError] = useState({ upcoming: null, past: null });
  
  useEffect(() => {
    // Check if the user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch contests when component mounts
    fetchUpcomingContests();
    fetchPastContests();
  }, [navigate]);
  
  const fetchUpcomingContests = async () => {
    try {
      setLoading(prev => ({ ...prev, upcoming: true }));
      
      // Fetch active/upcoming contests (finished=false)
      const response = await fetch(`${BACKEND_URL}/contests?finished=false`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming contests: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upcoming contests:', data);
      setUpcomingContests(data);
    } catch (err) {
      console.error('Error fetching upcoming contests:', err);
      setError(prev => ({ ...prev, upcoming: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, upcoming: false }));
    }
  };
  
  const fetchPastContests = async () => {
    try {
      setLoading(prev => ({ ...prev, past: true }));
      
      // Fetch past contests (finished=true)
      const response = await fetch(`${BACKEND_URL}/contests?finished=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch past contests: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Past contests:', data);
      setPastContests(data);
    } catch (err) {
      console.error('Error fetching past contests:', err);
      setError(prev => ({ ...prev, past: err.message }));
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
  const upcomingData = loading.upcoming
    ? [["Loading contests...", "", ""]]
    : error.upcoming
      ? [[`Error: ${error.upcoming}`, "", ""]]
      : upcomingContests.length === 0
        ? [["No upcoming contests", "", ""]]
        : upcomingContests.map(contest => [
            createContestLink(contest),
            contest.platform,
            formatDateTime(contest.start_time_posix)
          ]);
  
  // Format data for past contests
  const pastData = loading.past
    ? [["Loading contests...", "", ""]]
    : error.past
      ? [[`Error: ${error.past}`, "", ""]]
      : pastContests.length === 0
        ? [["No past contests", "", ""]]
        : pastContests.map(contest => [
            createContestLink(contest),
            contest.platform,
            formatDateTime(contest.start_time_posix)
          ]);

  return (
    <div className="page-container contestsPage">
      {/* Active/Upcoming Contests */}
      <TableBox 
        title={<span className={titleStyles.titleText}>Active/Upcoming Contests</span>}
        columns={columns}
        data={upcomingData}
        backgroundColor="rgb(230, 255, 230)" // Light green background
      />

      {/* Past Contests - Using PagedTableBox */}
      {pastContests.length > 0 || loading.past || error.past ? (
        <PagedTableBox 
          title={<span className={titleStyles.titleText}>Past Contests</span>}
          columns={columns}
          data={pastData}
          backgroundColor="rgb(245, 245, 245)" // Light gray background
          itemsPerPage={15}
        />
      ) : null}
    </div>
  );
}
