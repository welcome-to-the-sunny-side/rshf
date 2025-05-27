import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Home.module.css';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

// No sample data - all data will be fetched from backend

// Column definitions
const groupColumns = ["Group", "Members"];

const announcementColumns = ["Announcement", "Date"];
const contestColumns = ["Contest", "Date"];

export default function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState({
    groups: true,
    announcements: true,
    contests: true
  });
  const [error, setError] = useState({
    groups: null,
    announcements: null,
    contests: null
  });
  
  // Redirect to login if no token exists
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Fetch groups data from the backend
  // Define backend URL - should match the one in AuthContext.jsx
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Fetch data from the backend
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(prev => ({ ...prev, groups: true }));
        
        console.log('Fetching groups from backend...');
        const response = await fetch(`${BACKEND_URL}/api/groups`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Check if the response is ok before attempting to parse JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
        }
        
        // Check that we have content before parsing
        const text = await response.text();
        console.log('Response text:', text);
        
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        
        // Process the groups to extract member counts
        const processedGroups = data.map(group => ({
          id: group.group_id,
          name: group.group_name,
          memberCount: group.member_count
        }))
        // Sort by member count in descending order
        .sort((a, b) => b.memberCount - a.memberCount)
        // Take only the top 5
        .slice(0, 5);
        
        setGroups(processedGroups);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError(prev => ({ ...prev, groups: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, groups: false }));
      }
    };
    
    const fetchContests = async () => {
      try {
        setLoading(prev => ({ ...prev, contests: true }));
        
        // Using the new /api/contests endpoint with finished=false to get only active/upcoming contests
        const response = await fetch(`${BACKEND_URL}/api/contests?finished=false`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Contests response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch contests: ${response.status} ${response.statusText}`);
        }
        
        const contestsText = await response.text();
        if (!contestsText) {
          throw new Error('Empty contests response from server');
        }
        
        const contestsData = JSON.parse(contestsText);
        console.log('Contests data:', contestsData);
        
 
        const activeContests = contestsData;
        
        // Transform contests data to include necessary display info
        const transformedContests = activeContests.map(contest => ({
          ...contest,
          // Date is already available in start_time_posix (as Unix timestamp in seconds)
          date: new Date(contest.start_time_posix * 1000).toISOString()
        }))
        // Sort by start time in ascending order (earliest first)
        .sort((a, b) => a.start_time_posix - b.start_time_posix);
        
        setContests(transformedContests);
      } catch (err) {
        console.error('Error fetching contests:', err);
        setError(prev => ({ ...prev, contests: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, contests: false }));
      }
    };
    
    const fetchAnnouncements = async () => {
      try {
        setLoading(prev => ({ ...prev, announcements: true }));
        
        console.log('Fetching announcements from backend...');
        const response = await fetch(`${BACKEND_URL}/api/announcement`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Announcements response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch announcements: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Announcements response text:', text);
        
        if (!text) {
          throw new Error('Empty announcements response from server');
        }
        
        const data = JSON.parse(text);
        
        // Transform announcements data to match our UI format
        const transformedAnnouncements = data.map(announcement => ({
          date: new Date(announcement.timestamp).toISOString().split('T')[0],
          link: announcement.content.startsWith('http') ? announcement.content : `https://${announcement.content}`,
          title: announcement.title
        }))
        // Sort announcements by date (newest first)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setAnnouncements(transformedAnnouncements);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError(prev => ({ ...prev, announcements: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, announcements: false }));
      }
    };
    
    // Only fetch data if we have a token
    if (token) {
      fetchGroups();
      fetchContests();
      fetchAnnouncements();
    }
  }, [token, navigate]);

  // Transform the data for the group table
  const groupData = loading.groups
    ? [[API_MESSAGES.LOADING, ""]]
    : error.groups
      ? [[API_MESSAGES.ERROR, ""]]
      : groups.length === 0
        ? [[API_MESSAGES.NO_DATA, ""]]
        : groups.map(group => [
            <Link to={`/group/${group.name}`} className="tableCellLink">{group.name}</Link>,
            group.memberCount.toLocaleString()
          ]);

  const announcementColumns = ["Announcement", "Date"];
  // Transform the data for the announcements table
  const announcementData = loading.announcements
    ? [[API_MESSAGES.LOADING, ""]]
    : error.announcements
      ? [[API_MESSAGES.ERROR, ""]]
      : announcements.length === 0
        ? [[API_MESSAGES.NO_DATA, ""]]
        : announcements.map(announcement => [
            <a href={announcement.link} className="tableCellLink" target="_blank" rel="noopener noreferrer">{announcement.title}</a>,
            new Date(announcement.date).toLocaleDateString('en-US', { 
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          ]);

  const contestColumns = ["Contest", "Date"];
  // Transform the data for the contests table
  const contestData = loading.contests
    ? [[API_MESSAGES.LOADING, ""]]
    : error.contests
      ? [[API_MESSAGES.ERROR, ""]]
      : contests.length === 0 
        ? [[API_MESSAGES.NO_DATA, ""]]
        : contests.map(contest => [
            <Link to={`/contest/${contest.contest_id}`} className="tableCellLink">{contest.contest_name}</Link>,
            contest.date
              ? new Date(contest.date).toLocaleString('en-US', { 
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : "Date not specified"
          ]);

  return (
    <div className="page-container">
      <div className={styles['content-container']}>
        <div className={styles['left-sidebar']}>
          <TableBox 
            title={<Link to="/groups" className={titleStyles.titleLink}>Top Groups</Link>}
            columns={groupColumns}
            data={groupData}
            backgroundColor="rgb(230, 240, 255)"
          />

          {/* Conditionally render contests */}
          {loading.contests ? (
            <ContentBoxWithTitle 
              title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
              backgroundColor="rgb(230, 255, 230)"
            >
              <div className="api-feedback-container loading-message">{API_MESSAGES.LOADING}</div>
            </ContentBoxWithTitle>
          ) : error.contests ? (
            <ContentBoxWithTitle 
              title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
              backgroundColor="rgb(230, 255, 230)"
            >
              <div className="api-feedback-container error-message">{API_MESSAGES.ERROR}</div>
            </ContentBoxWithTitle>
          ) : contests.length > 0 ? (
            <TableBox 
              title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
              columns={contestColumns}
              data={contestData} 
              backgroundColor="rgb(230, 255, 230)"
            />
          ) : (
            <ContentBoxWithTitle 
              title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
              backgroundColor="rgb(230, 255, 230)"
            >
              <div className="api-feedback-container no-data-message">No Active/Upcoming Contests T_T</div>
            </ContentBoxWithTitle>
          )}
        </div>
        
        {/* Using PagedTableBox for Announcements */}
        <PagedTableBox 
          title="Announcements"
          columns={announcementColumns}
          data={announcementData}
          backgroundColor="rgb(255, 230, 230)"
          className={styles['main-content']}
          itemsPerPage={15}
        />
      </div>
    </div>
  );
}
