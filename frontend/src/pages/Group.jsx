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
import { useAuth } from '../context/AuthContext';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

export default function Group() {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState(null);
  const [participationData, setParticipationData] = useState([]);
  const [participationLoading, setParticipationLoading] = useState(true);
  const [participationError, setParticipationError] = useState(null);
  
  // Initialize group data with state
  const [groupData, setGroupData] = useState({
    name: "",
    type: "",
    created: "",
    memberCount: 0,
    description: "",
    memberships: []
  });

  // Leaderboard data state
  const [leaderboardData0, setLeaderboardData0] = useState([]);

  // Fetch leaderboard data (top 10 by rating)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!groupId) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(
          `/api/group_membership_range_fetch?gid=${groupId}&sort_by=user_group_rating&sort_order=desc&offset=0&limit=10`,
          { headers }
        );
        setLeaderboardData0(response.data);
      } catch (err) {
        setLeaderboardData0([]);
      }
    };
    fetchLeaderboard();
  }, [groupId, token]);

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
        setError(null);

        const userId = user?.user_id;
        const baseURL = '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch all groups
        const groupsResponse = await axios.get(`${baseURL}/api/groups`, { headers });
        const groups = groupsResponse.data;
        // Find the group with the matching groupId
        const fetchedGroup = groups.find(g => g.group_id === groupId);
        if (!fetchedGroup) {
          setError('Group not found');
          setLoading(false);
          return;
        }
        // Determine type from is_private flag
        const type = fetchedGroup.is_private ? "Private" : "Public";
        setGroupData({
          name: fetchedGroup.group_name,
          type: type,
          created: fetchedGroup.timestamp,
          memberCount: fetchedGroup.member_count,
          description: fetchedGroup.group_description || "No description provided.",
          memberships: [] // memberships to be fetched via other endpoints if needed
        });

        // If user is logged in, fetch their membership info
        if (userId) {
          try {
            // Use the dedicated membership endpoint to get user membership info
            const membershipResponse = await axios.get(
              `${baseURL}/api/membership?group_id=${groupId}&user_id=${userId}`,
              { headers }
            );
            // User is a member of this group
            const membership = membershipResponse.data;
            setUserRole(membership.role);
            setUserRating(membership.user_group_rating);
            setUserMaxRating(Math.max(membership.user_group_rating, membership.user_group_rating + 75));
            setJoinDate(fetchedGroup.timestamp);
          } catch (membershipError) {
            // 404 error means user is not a member of this group
            if (membershipError.response && membershipError.response.status === 404) {
              setUserRole(null);
              setUserRating(0);
              setUserMaxRating(0);
              setJoinDate("");
            } else {
              setError(API_MESSAGES.ERROR);
            }
          }
        }
      } catch (err) {
        setError(API_MESSAGES.ERROR);
        console.error('Error fetching group data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [groupId, token, user]);
  
  // Fetch participation data from API
  useEffect(() => {
    const fetchParticipationData = async () => {
      try {
        setParticipationLoading(true);
        setParticipationError(null);
        
        const baseURL = '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch finished contests data
        const contestsResponse = await axios.get(`${baseURL}/api/contests?finished=true`, { headers });
        const contests = contestsResponse.data;
        
        // Process contest data to extract participation for this group
        const participationPoints = [];
        console.log(contests);
        // Filter contests that have data for this group
        contests.forEach(contest => {
          if (contest.group_views && contest.group_views[groupId]) {
            const groupData = contest.group_views[groupId];
            // const totalMembers = groupData.total_members || 0;
            // const participants = groupData.total_participation || 0;
            
            // const participation = calculateParticipation(totalMembers, participants);
            // const strength = calculateStrength(ratings);
            const participation = groupData.total_participants || 0;
            const strength = groupData.total_members || 0;

            // Convert contest start time to date string
            const date = new Date(contest.start_time_posix * 1000).toISOString().split('T')[0];
            
            // Add data point
            participationPoints.push({
              date,
              participation,
              strength,
              contest_id: contest.contest_id,
              contest_name: contest.contest_name
            });
          }
        });
        
        // Sort by date
        participationPoints.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
        
        setParticipationData(participationPoints);
      } catch (err) {
        setParticipationError(API_MESSAGES.ERROR);
        console.error('Error fetching participation data:', err);
      } finally {
        setParticipationLoading(false);
      }
    };
    
    if (groupId && token) {
      fetchParticipationData();
    }
  }, [groupId, token]);
  
  // Fetch announcements from API
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        setAnnouncementsError(null);
        
        const baseURL = '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get(`${baseURL}/api/announcement?group_id=${groupId}`, { headers });
        
        // Transform API data to the format we need
        const formattedAnnouncements = response.data.map(announcement => ({
          id: announcement.announcement_id,
          title: announcement.title,
          content: announcement.content,
          date: announcement.timestamp,
          link: announcement.content.startsWith('http') ? announcement.content : `https://${announcement.content}` // Ensure URL is absolute
        }));
        
        // Sort by date in descending order (newest first)
        formattedAnnouncements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setAnnouncementsList(formattedAnnouncements);
      } catch (err) {
        setAnnouncementsError(API_MESSAGES.ERROR);
        console.error('Error fetching announcements:', err);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [groupId]);
  
  // We'll derive top users data from leaderboardData0 (from /api/group_membership_range_fetch)
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(null);

  // UseEffect to process leaderboardData0 for the leaderboard
  useEffect(() => {
    setLeaderboardLoading(true);
    if (leaderboardData0 && leaderboardData0.length > 0) {
      try {
        const transformedData = leaderboardData0.map((membership, index) => [
          index + 1, // Rank
          <Link to={`/user/${membership.cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(membership.user_group_rating), fontWeight: 'bold' }}>{membership.cf_handle}</Link>,
          <span style={{ color: getRatingColor(membership.user_group_rating), fontWeight: 'bold' }}>{membership.user_group_rating}</span>
        ]);
        setLeaderboardRows(transformedData);
        setLeaderboardLoading(false);
      } catch (err) {
        console.error('Error processing leaderboard data:', err);
        setLeaderboardError('Error processing leaderboard data');
        setLeaderboardLoading(false);
      }
    } else {
      setLeaderboardRows([]);
      setLeaderboardLoading(false);
    }
  }, [leaderboardData0]); // This will run when leaderboardData0 is updated
  
  // Participation data loading indicator
  const participationSection = participationLoading ? (
    <div className="api-feedback-container loading-message">
      {API_MESSAGES.LOADING}
    </div>
  ) : participationError ? (
    <div className="api-feedback-container error-message">
      {API_MESSAGES.ERROR}
    </div>
  ) : participationData.length > 0 ? (
    <ParticipationGraph 
      participationData={participationData} 
      groupName={groupId}
    />
  ) : (
    <div className="api-feedback-container no-data-message">
      {API_MESSAGES.NO_DATA}
    </div>
  );
  
  const showModViewButton = (userRole === "moderator" || userRole === "admin");
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
    announcementData = [[<span className="loading-message">{API_MESSAGES.LOADING}</span>, '']];
  } else if (announcementsError) {
    announcementData = [[<span className="error-message">{API_MESSAGES.ERROR}</span>, '']];
  } else if (announcementsList.length === 0) {
    announcementData = [[<span className="no-data-message">{API_MESSAGES.NO_DATA}</span>, '']];
  } else {
    // Transform the API data for display
    announcementData = announcementsList.map(announcement => [
      <a href={announcement.link} className="tableCellLink" target="_blank" rel="noopener noreferrer">{announcement.title}</a>,
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
    leaderboardData = [[<span className="loading-message">{API_MESSAGES.LOADING}</span>, '', '']];
  } else if (leaderboardError) {
    leaderboardData = [[<span className="error-message">{API_MESSAGES.ERROR}</span>, '', '']];
  } else if (leaderboardRows.length === 0) {
    leaderboardData = [[<span className="no-data-message">{API_MESSAGES.NO_DATA}</span>, '', '']];
  }

  // Display loading indicator if data is being fetched
  if (loading) {
    return (
      <div className={styles.container}>
        <GroupNavBar groupId={groupId} activeTab="overview" showModViewButton={showModViewButton} />
        <div className={`${styles.loadingContainer} api-feedback-container loading-message`}>
          {API_MESSAGES.LOADING}
        </div>
      </div>
    );
  }

  // Display error message if there was an error fetching data
  if (error) {
    return (
      <div className={styles.container}>
        <GroupNavBar groupId={groupId} activeTab="overview" showModViewButton={showModViewButton} />
        <div className={`${styles.errorContainer} api-feedback-container error-message`}>
          {API_MESSAGES.ERROR}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <GroupNavBar groupId={groupId} activeTab="overview" showModViewButton={showModViewButton} />
      
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
        <div className={`${styles.contentBoxLeft} announcementsTable`}>
          <PagedTableBox 
            title={<Link to={`/group/${groupId}/announcements`} className={titleStyles.titleLink}>Announcements</Link>}
            columns={announcementColumns}
            data={announcementData}
            backgroundColor="rgb(240, 240, 255)"
            itemsPerPage={10}
          />
        </div>
        
        {/* Leaderboard section - 34% width */}
        <div className={`${styles.contentBoxRight} leaderboardTable`}>
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
          {participationSection}
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
