import React from 'react';
import { Link } from 'react-router-dom';

export default function UserNavBar({ username, isOwnProfile }) {
  return (
    <div className="floatingButtonBox">
      <Link to={`/user/${username}`}>{username}</Link>
      <Link to={`/user/${username}/groups`}>groups</Link>
      {isOwnProfile && <Link to={`/user/${username}/settings`}>settings</Link>}
    </div>
  );
} 