import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './Group.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import TableBox from '../components/TableBox';
import PagedTableBox from '../components/PagedTableBox';
import GroupNavBar from '../components/GroupNavBar';
import ParticipationGraph from '../components/ParticipationGraph';
import titleStyles from '../components/ContentBoxWithTitle.module.css';

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

// Sample announcements data - in real app this would come from backend
const generateDummyAnnouncements = (groupId) => {
  return [
    { date: "2024-03-20", link: `/group/${groupId}/announcement/135`, title: "New Group Rules Announced" },
    { date: "2024-03-18", link: `/group/${groupId}/announcement/134`, title: "Upcoming Contest Information" },
    { date: "2024-03-16", link: `/group/${groupId}/announcement/133`, title: "March Group Challenge Results" },
    { date: "2024-03-15", link: `/group/${groupId}/announcement/132`, title: "Weekly Winners Announced" },
    { date: "2024-03-14", link: `/group/${groupId}/announcement/131`, title: "New Learning Resources Added" },
    { date: "2024-03-12", link: `/group/${groupId}/announcement/130`, title: "Group Meetup Schedule" },
    { date: "2024-03-10", link: `/group/${groupId}/announcement/129`, title: "Algorithm Contest Series #45" },
    { date: "2024-03-08", link: `/group/${groupId}/announcement/128`, title: "Member Spotlight: Top Contributors" },
    { date: "2024-03-06", link: `/group/${groupId}/announcement/127`, title: "Group Highlights: February" },
    { date: "2024-03-04", link: `/group/${groupId}/announcement/126`, title: "Upcoming Events Calendar" },
    { date: "2024-03-02", link: `/group/${groupId}/announcement/125`, title: "Group Feature: Rating System Update" },
    { date: "2024-02-28", link: `/group/${groupId}/announcement/124`, title: "Study Session Recordings" },
    { date: "2024-02-26", link: `/group/${groupId}/announcement/123`, title: "Monthly Programming Challenge Results" },
    { date: "2024-02-24", link: `/group/${groupId}/announcement/122`, title: "New Member Welcome Guide" },
    { date: "2024-02-22", link: `/group/${groupId}/announcement/121`, title: "Group Guidelines Update" },
    { date: "2024-02-20", link: `/group/${groupId}/announcement/120`, title: "Coding Contest Winners February" },
    { date: "2024-02-18", link: `/group/${groupId}/announcement/119`, title: "New Group Features Released" },
    { date: "2024-02-16", link: `/group/${groupId}/announcement/118`, title: "Top Performers Recognition" },
    { date: "2024-02-14", link: `/group/${groupId}/announcement/117`, title: "Resource Library Update" },
    { date: "2024-02-12", link: `/group/${groupId}/announcement/116`, title: "Special Event: Industry Talk" }
  ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
};

export default function Group() {
  const { groupId } = useParams();
  
  // Dummy data for group information
  const groupData = {
    name: groupId,
    type: "anyone can join", // Options: "restricted membership", "anyone can join"
    created: "2022-06-05",
    memberCount: 621,
    description: "A group dedicated to algorithm studies and competitive programming."
  };
  
  // Dummy top users data for leaderboard
  const topUsers = [
    { username: "monica", rating: 2250 },
    { username: "alice", rating: 2185 },
    { username: "frank", rating: 2100 },
    { username: "rachel", rating: 2050 },
    { username: "bob", rating: 1890 }
  ].sort((a, b) => b.rating - a.rating); // Sort by rating descending
  
  // Generate dummy participation data
  const participationData = generateDummyParticipationData(12);
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Dummy user rating and max rating (would come from auth context in real app)
  const userRating = 1875;
  const userMaxRating = 1950;
  
  // Dummy join date
  const joinDate = "2022-08-15";
  
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

  // Generate dummy announcements for this group
  const announcements = generateDummyAnnouncements(groupId);
  
  // Transform the announcements data for the PagedTableBox component
  const announcementColumns = ["Announcement", "Date"];
  const announcementData = announcements.map(announcement => [
    <Link to={announcement.link} className="tableCellLink">{announcement.title}</Link>,
    new Date(announcement.date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  ]);
  
  // Transform top users data for the leaderboard table
  const leaderboardColumns = ["Rank", "User", "Rating"];
  const leaderboardData = topUsers.map((user, index) => [
    index + 1,
    <Link to={`/user/${user.username}`} className="tableCellLink" style={{ color: getRatingColor(user.rating), fontWeight: 'bold' }}>{user.username}</Link>,
    <span style={{ color: getRatingColor(user.rating), fontWeight: 'bold' }}>{user.rating}</span>
  ]);
  
  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Two content boxes side by side */}
      <div className={styles.contentBoxRow}>
        {/* Left content box with group info */}
        <div className={`contentBox ${styles.contentBoxLeft}`}>
          {/* Group name displayed in black at top */}
          <h2 className={styles.groupName}>{groupData.name}</h2>
          
          {/* About section enclosed in a box */}
          <div className={styles.aboutBox}>
            <p>{groupData.description}</p>
          </div>
          
          {/* Stats list with group information */}
          <div className={`${styles.statsList} standardTextFont`}>
            <div className={styles.statItem}>
              Type: <span>{groupData.type}</span>
            </div>
            <div className={styles.statItem}>
              Members: <span>{groupData.memberCount}</span>
            </div>
            <div className={styles.statItem}>
              Created: <span>{formatDate(groupData.created)}</span>
            </div>
          </div>
        </div>
        
        {/* Right content box with user-specific info */}
        <div className={`contentBox ${styles.contentBoxRight}`}>
          {/* User stats in relation to the group */}
          <div className={`${styles.statsList} standardTextFont`}>
            <div className={styles.statItem}>
              Your Role: <span style={{ textTransform: 'capitalize' }}>{userRole || "Not a member"}</span>
            </div>
            
            {/* Only show rating for members or moderators */}
            {userRole && (
              <>
                <div className={styles.statItem}>
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
                <div className={styles.statItem}>
                  Joined: <span>{formatDate(joinDate)}</span>
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
      

      
      {/* Two lower content boxes side by side */}
      <div className={styles.contentBoxRow}>
        {/* Lower left content box with Participation Graph */}
        <div className={styles.contentBoxLeft}>
          <ContentBoxWithTitle title="Participation" backgroundColor="rgb(230, 255, 255)" contentPadding="5px">
            <ParticipationGraph 
              participationData={participationData} 
              groupName={groupId}
            />
          </ContentBoxWithTitle>
        </div>
        
        {/* Lower right content box with Leaderboard */}
        <div className={styles.contentBoxRight}>
          <TableBox 
            title="Leaderboard"
            columns={leaderboardColumns}
            data={leaderboardData}
            backgroundColor="rgb(255, 240, 230)"
          />
        </div>
      </div>

            {/* Announcements section - full width */}
            <div className={styles.fullWidthSection}>
        <PagedTableBox 
          title={<Link to={`/group/${groupId}/announcements`} className={titleStyles.titleLink}>Announcements</Link>}
          columns={announcementColumns}
          data={announcementData}
          backgroundColor="rgb(240, 240, 255)"
          itemsPerPage={10}
        />
      </div>
    </div>
  );
}

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
