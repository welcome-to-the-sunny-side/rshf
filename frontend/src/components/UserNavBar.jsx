import React from 'react';
import { Link } from 'react-router-dom';

export default function UserNavBar({ username }) {
  return (
    <div className="floatingButtonBox">
      <Link to={`/user/${username}`}>{username}</Link>
      <Link to={`/user/${username}/groups`}>groups</Link>
      <Link to={`/user/${username}/settings`}>settings</Link>
    </div>
  );
} 