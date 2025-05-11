 import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import { getGroups, getContest } from '../api';

// We'll replace sample data with real API data

// Sample posts data for now - ideally would come from a backend posts API
const samplePosts = [
  { date: "2024-03-20", link: "/post/135", title: "New Rating System Announcement" },
  { date: "2024-03-20", link: "/post/134", title: "Important: Server Maintenance Schedule" },
  { date: "2024-03-19", link: "/post/133", title: "March Contest Results" },
  { date: "2024-03-19", link: "/post/132", title: "Weekly Challenge Winners" },
  { date: "2024-03-18", link: "/post/131", title: "Interview Preparation Guide" },
  { date: "2024-03-18", link: "/post/130", title: "New Learning Resources Added" },
  { date: "2024-03-17", link: "/post/129", title: "Weekly Algorithm Challenge #45" },
  { date: "2024-03-17", link: "/post/128", title: "Community Spotlight: Top Contributors" },
  { date: "2024-03-16", link: "/post/127", title: "Community Highlights: February" },
  { date: "2024-03-16", link: "/post/126", title: "Upcoming Contest Schedule" },
  { date: "2024-03-15", link: "/post/125", title: "Site Update: New Features Released" },
  { date: "2024-03-15", link: "/post/124", title: "Group Study Session Recordings" },
  { date: "2024-03-14", link: "/post/123", title: "Monthly Programming Challenge Results" },
  { date: "2024-03-14", link: "/post/122", title: "New Learning Paths Launched" },
  { date: "2024-03-13", link: "/post/121", title: "Community Guidelines Update" },
  { date: "2024-03-12", link: "/post/120", title: "Coding Contest Winners April" },
  { date: "2024-03-11", link: "/post/119", title: "New Platform Feature: Rating Charts" },
  { date: "2024-03-10", link: "/post/118", title: "Top Performers of the Month" },
  { date: "2024-03-09", link: "/post/117", title: "API Documentation Update" },
  { date: "2024-03-08", link: "/post/116", title: "Women in Tech: Special Event" }
].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

// We'll fetch contests data from the API

// Column definitions
const groupColumns = ["Group", "Members"];
const postColumns = ["Post", "Date"];
const contestColumns = ["Contest", "Date"];

export default function Home() {
  // State for API data
  const [groups, setGroups] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transform posts data for the table
  const postData = samplePosts.map(post => [
    <Link to={post.link} className="tableCellLink">{post.title}</Link>,
    new Date(post.date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  ]);

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch groups data
        const groupsResponse = await getGroups();
        console.log('Fetched groups:', groupsResponse);
        setGroups(groupsResponse);
        
        // For contests, we need to provide at least one filter parameter
        // Since we don't have a specific contest ID, let's try to get the logged-in user's contests
        try {
          const currentUserId = JSON.parse(localStorage.getItem('currentUser'))?.username;
          
          if (currentUserId) {
            const contestsResponse = await getContest({ uid: currentUserId });
            console.log('Fetched contests for user:', contestsResponse);
            setContests(Array.isArray(contestsResponse) ? contestsResponse : []);
          } else {
            // No user ID available, set empty contests array
            console.log('No user ID available for contest query');
            setContests([]);
          }
        } catch (contestErr) {
          console.error('Error fetching contests:', contestErr);
          setContests([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sort groups by number of members (descending)
  const sortedGroups = [...groups].sort((a, b) => {
    const aMemberCount = a.memberships ? a.memberships.length : 0;
    const bMemberCount = b.memberships ? b.memberships.length : 0;
    return bMemberCount - aMemberCount; // Descending order
  });

  // Transform groups data for the table (using sorted groups)
  const groupData = sortedGroups.map(group => [
    <Link to={`/group/${group.group_id}`} className="tableCellLink">{group.group_name}</Link>,
    // Display member count
    group.memberships ? group.memberships.length.toLocaleString() : '0'
  ]);

  // Transform contests data for the table - handle case when contests might not be an array
  const contestData = Array.isArray(contests) && contests.length > 0 
    ? contests.map(contest => [
        <Link to={`/contest/${contest.contest_id}`} className="tableCellLink">{contest.contest_id}</Link>,
        // If you have contest date information, format it here
        'Upcoming' // Placeholder for now
      ])
    : [["No contests found", ""]]; // Display a message when no contests are available

  return (
    <div className="page-container">
      <div className={styles['content-container']}>
        {loading ? (
          <div className="loading">Loading data...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            <div className={styles['left-sidebar']}>
              <TableBox 
                title={<Link to="/groups" className={titleStyles.titleLink}>Top Groups</Link>}
                columns={groupColumns}
                data={groupData}
                backgroundColor="rgb(230, 240, 255)"
              />

              <TableBox 
                title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
                columns={contestColumns}
                data={contestData}
                backgroundColor="rgb(230, 255, 230)"
              />
            </div>
            
            {/* Using PagedTableBox for Posts */}
            <PagedTableBox 
              title={<Link to="/posts" className={titleStyles.titleLink}>Posts</Link>}
              columns={postColumns}
              data={postData}
              backgroundColor="rgb(255, 230, 230)"
              className={styles['main-content']}
              itemsPerPage={15}
            />
          </>
        )}
      </div>
    </div>
  );
}
