import React from 'react';
import { useParams, Link } from 'react-router-dom';
import UserNavBar from '../components/UserNavBar'; // Import the new component

// Import styles if needed
import styles from './UserSettings.module.css';

export default function UserSettings() {
  const { username } = useParams();
  
  return (
    <div className="page-container">
      {/* Floating button box - same as in User.jsx */}
      <UserNavBar username={username} />
      
      {/* Empty content box */}
      <div className="contentBox">
        {/* Content will be added later */}
      </div>
    </div>
  );
} 