import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function GroupNavBar({ groupId, showModViewButton }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Determine which link is active based on the current path
  const isGroupActive = currentPath === `/group/${groupId}`;
  const isMembersActive = currentPath === `/group/${groupId}/members`;
  const isContestsActive = currentPath === `/group/${groupId}/contests`;
  const isReportsActive = currentPath === `/group/${groupId}/reports`;
  const isModViewActive = currentPath === `/group/${groupId}/modview`;
  
  return (
    <div className="floatingButtonBox">
      <Link 
        to={`/group/${groupId}`} 
        style={isGroupActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        {groupId}
      </Link>
      <Link 
        to={`/group/${groupId}/members`} 
        style={isMembersActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        members
      </Link>
      <Link 
        to={`/group/${groupId}/contests`} 
        style={isContestsActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        contests
      </Link>
      <Link 
        to={`/group/${groupId}/reports`} 
        style={isReportsActive ? { backgroundColor: '#e0e0e0' } : {}}
      >
        reports
      </Link>
      {showModViewButton && (
        <Link 
          to={`/group/${groupId}/modview`} 
          style={isModViewActive ? { backgroundColor: '#e0e0e0' } : {}}
        >
          mod view
        </Link>
      )}
    </div>
  );
} 