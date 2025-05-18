import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './Group.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import TableBox from '../components/TableBox';
import PagedTableBox from '../components/PagedTableBox';
import GroupNavBar from '../components/GroupNavBar';
import ParticipationGraph from '../components/ParticipationGraph';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import axios from 'axios';

// Generate varied dummy participation data
const generateDummyParticipationData = (numPoints) => {
  const data = [];
  let participation = Math.floor(Math.random() * 50) + 20; // Start between 20-70
  let strength = Math.floor(Math.random() * 60) + 30;     // Start between 30-90
  let currentDate = new Date(2023, 0, 1); // Start date Jan 1, 2023

  for (let i = 0; i < numPoints; i++) {
    // Simulate participation change (can go up or down)
    const participationChange = Math.floor((Math.random() - 0.4) * 15); // Tends to increase slightly
    participation = Math.max(5, Math.min(100, participation + participationChange)); // Between 5-100
    
    // Simulate strength change (tends to follow participation but smoother)
    const strengthChange = Math.floor((Math.random() - 0.3) * 10); // Tends to increase slightly
    strength = Math.max(10, Math.min(100, strength + strengthChange)); // Between 10-100
    
    // Simulate time passing (15-45 days)
    const daysToAdd = Math.floor(Math.random() * 30) + 15;
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    
    // Format date as YYYY-MM-DD
    const dateString = currentDate.toISOString().split('T')[0];
    // Add contest ID
    const contest_id = Math.floor(Math.random() * 10000) + 1;
    
    data.push({ 
      date: dateString, 
      participation: participation, 
      strength: strength, 
      contest_id: contest_id 
    });
  }
  
  // Add one more point closer to today for better visualization
  const today = new Date();
  today.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Within the last 30 days
  
  const lastParticipationChange = Math.floor((Math.random() - 0.3) * 10);
  participation = Math.max(5, Math.min(100, participation + lastParticipationChange));
  
  const lastStrengthChange = Math.floor((Math.random() - 0.2) * 8);
  strength = Math.max(10, Math.min(100, strength + lastStrengthChange));
  
  const last_contest_id = Math.floor(Math.random() * 10000) + 1;
  
  data.push({ 
    date: today.toISOString().split('T')[0], 
    participation: participation, 
    strength: strength, 
    contest_id: last_contest_id 
  });
  
  // Ensure data is sorted by date
  data.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return data;
};

export default function Group() {
  const { groupId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState(null);
  
  // Initialize group data with state
  const [groupData, setGroupData] = useState({
    name: "",
    type: "", // Will be determined from is_private flag
    created: "",
    memberCount: 0,
    description: "A group dedicated to algorithm studies and competitive programming.",
    memberships: [] // Initialize with an empty array to avoid undefined errors
  });
  
  // State variables for current user's membership information
  const [userRole, setUserRole] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [userMaxRating, setUserMaxRating] = useState(0);
  const [joinDate, setJoinDate] = useState("");
  
  // Fetch group data from API
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        // Get the token from localStorage
        const token = localStorage.getItem('token'); // In a real app, use a proper auth system
        
        const userId = localStorage.getItem('userId'); // Get the current user's ID
        
        // For development without token, just use a temporary mock
        if (!token) {
          console.warn('No token found, using mock data');
          // We'll continue without a token during development, but in production would require auth
        }
        
        // Add baseURL for API requests - this should match your backend URL
        // Using relative URL to work with both development and production
        const baseURL = '';  // In production, this might be your API domain

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        try {
          // Attempt to fetch real data
          const response = await axios.get(`${baseURL}/api/group?group_id=${groupId}`, { headers });
          
          const fetchedGroup = response.data;
          
          // Determine type from is_private flag
          const type = fetchedGroup.is_private ? "Private" : "Public";
          
          setGroupData({
            name: fetchedGroup.group_name,
            type: type,
            created: fetchedGroup.timestamp,
            memberCount: fetchedGroup.memberships.length,
            description: fetchedGroup.group_description || "No description provided.",
            memberships: fetchedGroup.memberships || []
          });
          
          // Find the current user's membership in this group
          if (userId && fetchedGroup.memberships) {
            const userMembership = fetchedGroup.memberships.find(membership => 
              membership.user_id === userId
            );
            
            if (userMembership) {
              // User is a member of this group
              setUserRole(userMembership.role);
              setUserRating(userMembership.user_group_rating);
              
              // For max rating, we could either store it separately in the backend
              // or for now, just set it slightly higher than current rating as a placeholder
              // In a real app, you'd want to track this accurately
              setUserMaxRating(Math.max(userMembership.user_group_rating, userMembership.user_group_rating + 75));
              
              // The timestamp when the user joined is not directly available in the API response
              // So we'll use the group creation date as a fallback
              // In a real app, you'd want to store and retrieve the actual join date
              setJoinDate(fetchedGroup.timestamp);
            } else {
              // User is not a member of this group
              setUserRole(null);
              setUserRating(0);
              setUserMaxRating(0);
              setJoinDate("");
            }
          }
          
          console.log('Group API response:', response.data); // Debug log
        } catch (apiError) {
          console.error('API error:', apiError);
          // For development, fall back to dummy data
          console.warn('Falling back to dummy data');
          // Keep original dummy data during development
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in fetch process:', err);
        // Don't show error to user during development, just use dummy data
        setLoading(false);
      }
    };
    
    fetchGroupData();
  }, [groupId]);
  
  // Fetch announcements from the API
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        
        // For development without token, just use a temporary mock
        if (!token) {
          console.warn('No token found, using mock data for announcements');
          // We'll continue without a token during development, but in production would require auth
        }
        
        // Add baseURL for API requests
        const baseURL = '';  // In production, this might be your API domain
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        try {
          // Attempt to fetch real announcement data
          const response = await axios.get(`${baseURL}/api/announcement?group_id=${groupId}`, { headers });
          
          // Transform API data to the format we need
          const formattedAnnouncements = response.data.map(announcement => ({
            id: announcement.announcement_id,
            title: announcement.title,
            content: announcement.content,
            date: announcement.timestamp,
            link: `/group/${groupId}/announcement/${announcement.announcement_id}`
          }));
          
          // Sort by date in descending order (newest first)
          formattedAnnouncements.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setAnnouncementsList(formattedAnnouncements);
        } catch (apiError) {
          console.error('API error fetching announcements:', apiError);
          // For development, provide an error message
          setAnnouncementsError('Failed to load announcements');
        }
        
        setAnnouncementsLoading(false);
      } catch (err) {
        console.error('Error in announcement fetch process:', err);
        setAnnouncementsLoading(false);
        setAnnouncementsError('An unexpected error occurred');
      }
    };
    
    fetchAnnouncements();
  }, [groupId]);
  
  // We'll derive top users data from the group memberships
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(null);
  
  // UseEffect to process group membership data for the leaderboard
  useEffect(() => {
    setLeaderboardLoading(true);
    
    // No need for a separate API call, we can use the group data that contains memberships
    // Debug output to help diagnose the issue
    console.log('Processing leaderboard data:', { 
      groupData, 
      loading, 
      hasMemberships: groupData && groupData.memberships ? 'yes' : 'no',
      membershipCount: groupData && groupData.memberships ? groupData.memberships.length : 0 
    });
    
    if (groupData && !loading && groupData.memberships && groupData.memberships.length > 0) {
      try {
        // Process memberships to create leaderboard data
        // This requires user_ids and ratings
        const memberships = [...groupData.memberships];
        
        // Sort by rating in descending order
        memberships.sort((a, b) => b.user_group_rating - a.user_group_rating);
        
        // Take only the top 10 users
        const topUsers = memberships.slice(0, 10);
        
        // Transform the data for display
        const transformedData = topUsers.map((membership, index) => [
          index + 1, // Rank
          <Link to={`/user/${membership.user_id}`} className="tableCellLink" style={{ color: getRatingColor(membership.user_group_rating), fontWeight: 'bold' }}>{membership.user_id}</Link>,
          <span style={{ color: getRatingColor(membership.user_group_rating), fontWeight: 'bold' }}>{membership.user_group_rating}</span>
        ]);
        
        setLeaderboardRows(transformedData);
        setLeaderboardLoading(false);
      } catch (err) {
        console.error('Error processing leaderboard data:', err);
        setLeaderboardError('Error processing leaderboard data');
        setLeaderboardLoading(false);
      }
    } else if (!loading && (!groupData || !groupData.memberships)) {
      setLeaderboardError('No membership data available');
      setLeaderboardLoading(false);
    }
  }, [groupData, loading]); // This will run when groupData is updated
  
  // Generate dummy participation data
  const participationData = generateDummyParticipationData(12);
  
  // Dummy report accuracy data
  const reportAccuracy = { accepted: 9, total: 12 };
  
  // Determine which buttons to show based on user role
  const showModViewButton = userRole === "moderator";
  
  // Determine join/leave button visibility and text
  const getActionButton = () => {
    if (userRole === undefined) {
      // User is logged out, no button
      return null;
    } else if (userRole) {
      // User is a member or moderator, show "Leave" button
      return (
        <button className="global-button red">
          Leave
        </button>
      );
    } else {
      // User is not a member, show "Join" or "Request" based on group type
      const buttonText = groupData.type === "anyone can join" ? "Join" : "Request to Join";
      return (
        <button className="global-button blue">
          {buttonText}
        </button>
      );
    }
  };

  // Transform the announcements data for the PagedTableBox component
  const announcementColumns = ["Announcement", "Date"];
  
  // Create a loading or error message row if needed
  let announcementData = [];
  
  if (announcementsLoading) {
    announcementData = [[<span>Loading announcements...</span>, '']];
  } else if (announcementsError) {
    announcementData = [[<span>Error: {announcementsError}</span>, '']];
  } else if (announcementsList.length === 0) {
    announcementData = [[<span>No announcements found</span>, '']];
  } else {
    // Transform the API data for display
    announcementData = announcementsList.map(announcement => [
      <Link to={announcement.link} className="tableCellLink">{announcement.title}</Link>,
      new Date(announcement.date).toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    ]);
  }
  
  // Setup columns for the leaderboard table
  const leaderboardColumns = ["Rank", "User", "Rating"];
  
  // Prepare leaderboard data with loading and error states
  let leaderboardData = leaderboardRows;
  
  if (leaderboardLoading) {
    leaderboardData = [[<span>Loading leaderboard...</span>, '', '']];
  } else if (leaderboardError) {
    leaderboardData = [[<span>Error: {leaderboardError}</span>, '', '']];
  } else if (leaderboardRows.length === 0) {
    leaderboardData = [[<span>No rating data available</span>, '', '']];
  }

  // Display loading indicator if data is being fetched
  if (loading) {
    return (
      <div className={styles.container}>
        <GroupNavBar groupId={groupId} activeTab="overview" />
        <div className={styles.loadingContainer}>
          <p className="standardTextFont">Loading group information...</p>
        </div>
      </div>
    );
  }

  // Display error message if there was an error fetching data
  if (error) {
    return (
      <div className={styles.container}>
        <GroupNavBar groupId={groupId} activeTab="overview" />
        <div className={styles.errorContainer}>
          <p className="standardTextFont">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <GroupNavBar groupId={groupId} activeTab="overview" />
      
      {/* Header with group name and description */}
      <div className={styles.contentBoxRow}>
        {/* Left content box with name and description */}
        <div className={`contentBox ${styles.contentBoxLeft}`}>
          <div className={styles.groupTitle}>
          <h2 className={styles.groupName}>{groupData.name}</h2>
            {/* <h1 className="standardTextFont">{groupData.name}</h1> */}
            {/* <p className="standardTextFont">{groupData.description}</p> */}
          </div>
          {/* About section enclosed in a box */}
          <div className={styles.aboutBox}>
            <p className="standardTextFont">{groupData.description}</p>
          </div>
          
          {/* Stats list with group information */}
          <div className={`${styles.statsList}`}>
            <div className={`${styles.statItem} standardTextFont`}>
              Type: <span>{groupData.type}</span>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Members: <span>{groupData.memberCount}</span>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Created: <span>{formatDate(groupData.created)}</span>
            </div>
          </div>
        </div>
        
        {/* Right content box with user-specific info */}
        <div className={`contentBox ${styles.contentBoxRight}`}>
          {/* User stats in relation to the group */}
          <div className={`${styles.statsList}`}>
            <div className={`${styles.statItem} standardTextFont`}>
              Your Role: <span style={{ textTransform: 'capitalize' }}>{userRole || "Not a member"}</span>
            </div>
            
            {/* Only show rating for members or moderators */}
            {userRole && (
              <>
                <div className={`${styles.statItem} standardTextFont`}>
                  Your Rating: <span style={{ 
                    color: getRatingColor(userRating),
                    fontWeight: 'bold'
                  }}>
                    {userRating} ({getRankName(userRating)})
                  </span>
                  {' '}
                  (Max: <span style={{ 
                    color: getRatingColor(userMaxRating),
                    fontWeight: 'bold'
                  }}>
                    {userMaxRating}
                  </span>)
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Member since: <span>{formatDate(joinDate)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Action button container */}
          <div className={styles.actionButtonContainer}>
            {getActionButton()}
          </div>
        </div>
      </div>
      

      {/* Announcements and Leaderboard in one row */}
      <div className={styles.contentBoxRow}>
        {/* Announcements section - 75% width */}
        <div className={styles.contentBoxLeft}>
          <PagedTableBox 
            title={<Link to={`/group/${groupId}/announcements`} className={titleStyles.titleLink}>Announcements</Link>}
            columns={announcementColumns}
            data={announcementData}
            backgroundColor="rgb(240, 240, 255)"
            itemsPerPage={10}
          />
        </div>
        
        {/* Leaderboard section - 25% width */}
        <div className={styles.contentBoxRight}>
          <PagedTableBox 
            title="Leaderboard"
            columns={leaderboardColumns}
            data={leaderboardData}
            backgroundColor="rgb(255, 240, 230)"
            itemsPerPage={10}
          />
        </div>
      </div>
      
      {/* Participation Graph section */}
      <div className={`${styles.fullWidthSection} standardTextFont`}>
        <ContentBoxWithTitle title="Participation" backgroundColor="rgb(230, 255, 255)" contentPadding="5px">
          <ParticipationGraph 
            participationData={participationData} 
            groupName={groupId}
          />
        </ContentBoxWithTitle>
      </div>
    </div>
  );
}

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
