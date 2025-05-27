import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function UserNavBar({ username, isOwnProfile }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Determine which link is active based on the current path
  const isProfileActive = currentPath === `/user/${username}`;
  const isGroupsActive = currentPath === `/user/${username}/groups`;
  const isSettingsActive = currentPath === `/user/${username}/settings`;
  
  return (
    <div className="floatingButtonBox">
      <Link 
        to={`/user/${username}`} 
        style={isProfileActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        {username}
      </Link>
      <Link 
        to={`/user/${username}/groups`} 
        style={isGroupsActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        groups
      </Link>
      {isOwnProfile && (
        <Link 
          to={`/user/${username}/settings`} 
          style={isSettingsActive ? { backgroundColor: '#e0e0e0' } : {}}
        >
          settings
        </Link>
      )}
    </div>
  );
} 