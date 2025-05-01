import React from 'react';
import { Link } from 'react-router-dom';

export default function GroupNavBar({ groupId, showSettingsButton }) {
  return (
    <div className="floatingButtonBox">
      <Link to={`/group/${groupId}`}>{groupId}</Link>
      <Link to={`/group/${groupId}/members`}>members</Link>
      <Link to={`/group/${groupId}/contests`}>contests</Link>
      {showSettingsButton && <Link to={`/group/${groupId}/settings`}>settings</Link>}
    </div>
  );
} 