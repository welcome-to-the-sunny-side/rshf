import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './Group.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import TableBox from '../components/TableBox';
import GroupNavBar from '../components/GroupNavBar';

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
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Dummy user rating and max rating (would come from auth context in real app)
  const userRating = 1875;
  const userMaxRating = 1950;
  
  // Dummy join date
  const joinDate = "2022-08-15";
  
  // Determine which buttons to show based on user role
  const showSettingsButton = userRole === "moderator";
  
  // Determine join/leave button visibility and text
  const getActionButton = () => {
    if (userRole === undefined) {
      // User is logged out, no button
      return null;
    } else if (userRole) {
      // User is a member or moderator, show "Leave" button
      return (
        <button className={styles.leaveButton}>
          Leave
        </button>
      );
    } else {
      // User is not a member, show "Join" or "Request" based on group type
      const buttonText = groupData.type === "anyone can join" ? "Join" : "Request to Join";
      return (
        <button className={styles.joinButton}>
          {buttonText}
        </button>
      );
    }
  };

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
      <GroupNavBar groupId={groupId} showSettingsButton={showSettingsButton} />
      
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
        {/* Lower left content box with Graph */}
        <div className={styles.contentBoxLeft}>
          <ContentBoxWithTitle title="Graph" backgroundColor="rgb(230, 255, 230)">
            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              Rating graph will be displayed here
            </div>
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
    </div>
  );
}

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
