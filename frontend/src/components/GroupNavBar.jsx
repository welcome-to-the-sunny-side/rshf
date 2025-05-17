import React from 'react';
import { Link } from 'react-router-dom';

export default function GroupNavBar({ groupId, showModViewButton }) {
  return (
    <div className="floatingButtonBox">
      <Link to={`/group/${groupId}`}>{groupId}</Link>
      <Link to={`/group/${groupId}/members`}>members</Link>
      <Link to={`/group/${groupId}/contests`}>contests</Link>
      <Link to={`/group/${groupId}/reports`}>reports</Link>
      {showModViewButton && <Link to={`/group/${groupId}/modview`}>mod view</Link>}
    </div>
  );
} 