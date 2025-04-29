import React from 'react';
import { useParams, Link } from 'react-router-dom';

// Import styles if needed
import styles from './UserSettings.module.css';

export default function UserSettings() {
  const { username } = useParams();
  
  return (
    <div className="page-container">
      {/* Floating button box - same as in User.jsx */}
      <div className="floatingButtonBox">
        <Link to={`/user/${username}`}>{username}</Link>
        <Link to={`/user/${username}/groups`}>groups</Link>
        <Link to={`/user/${username}/settings`}>settings</Link>
      </div>
      
      {/* Empty content box */}
      <div className="contentBox">
        {/* Content will be added later */}
      </div>
    </div>
  );
} 