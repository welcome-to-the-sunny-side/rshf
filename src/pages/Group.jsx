import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './Group.module.css';

export default function Group() {
  const { groupId } = useParams();
  
  // Dummy data for group information
  const groupData = {
    name: groupId,
    type: "restricted membership",
    created: "2022-06-05",
    memberCount: 621,
    description: "A group dedicated to algorithm studies and competitive programming."
  };
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Determine which buttons to show based on user role
  const showSettingsButton = userRole === "moderator";
  
  return (
    <div className="page-container">
      {/* Floating button box */}
      <div className="floatingButtonBox">
        <Link to={`/group/${groupId}`}>{groupId}</Link>
        <Link to={`/group/${groupId}/members`}>members</Link>
        <Link to={`/group/${groupId}/contests`}>contests</Link>
        {showSettingsButton && <Link to={`/group/${groupId}/settings`}>settings</Link>}
      </div>
      
      {/* Two content boxes side by side */}
      <div className={styles.contentBoxRow}>
        {/* Left content box with group info */}
        <div className={`contentBox ${styles.contentBoxLeft}`}>
          <div className={styles.groupInfo}>
            <h2>{groupData.name}</h2>
            <div className={`${styles.statsList} standardTextFont`}>
              <div className={styles.statItem}>
                Type: <span>{groupData.type}</span>
              </div>
              <div className={styles.statItem}>
                Created: <span>{formatDate(groupData.created)}</span>
              </div>
              <div className={styles.statItem}>
                Members: <span>{groupData.memberCount}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right content box with additional info */}
        <div className={`contentBox ${styles.contentBoxRight}`}>
          <div className={`${styles.statsList} standardTextFont`}>
            <div className={styles.statItem}>
              Your Role: <span style={{ textTransform: 'capitalize' }}>{userRole || "Not a member"}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rating Graph box (full width) */}
      <div className="contentBox">
        <p>{groupData.description}</p>
      </div>
    </div>
  );
}

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};
