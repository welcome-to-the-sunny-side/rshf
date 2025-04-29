import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';

export default function GroupSettings() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // If user is not a moderator, redirect to group page
  if (userRole !== "moderator") {
    return <Navigate to={`/group/${groupId}`} />;
  }
  
  return (
    <div className="page-container">
      {/* Floating button box */}
      <div className="floatingButtonBox">
        <Link to={`/group/${groupId}`}>{groupId}</Link>
        <Link to={`/group/${groupId}/members`}>members</Link>
        <Link to={`/group/${groupId}/contests`}>contests</Link>
        <Link to={`/group/${groupId}/settings`}>settings</Link>
      </div>
      
      {/* Settings content */}
      <div className="contentBox">
        <h2>Group Settings</h2>
        <p>Settings page for group administrators. This page is only accessible to moderators.</p>
        
        <div style={{ marginTop: '20px' }}>
          <h3>General Settings</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ margin: '10px 0' }}>
              <label>
                Group Name:
                <input 
                  type="text" 
                  value={groupId} 
                  style={{ marginLeft: '10px', padding: '5px' }}
                  readOnly
                />
              </label>
            </li>
            <li style={{ margin: '10px 0' }}>
              <label>
                Group Type:
                <select style={{ marginLeft: '10px', padding: '5px' }}>
                  <option value="restricted">Restricted Membership</option>
                  <option value="open">Anyone Can Join</option>
                </select>
              </label>
            </li>
            <li style={{ margin: '10px 0' }}>
              <label>
                Group Description:
                <textarea 
                  rows="3" 
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  defaultValue="A group dedicated to algorithm studies and competitive programming."
                />
              </label>
            </li>
          </ul>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Member Management</h3>
          <button style={{ padding: '8px 12px', margin: '5px' }}>Review Join Requests</button>
          <button style={{ padding: '8px 12px', margin: '5px' }}>Manage Moderators</button>
          <button style={{ padding: '8px 12px', margin: '5px', backgroundColor: '#ffdddd' }}>Remove Members</button>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Danger Zone</h3>
          <button style={{ padding: '8px 12px', margin: '5px', backgroundColor: '#ffdddd' }}>Delete Group</button>
        </div>
      </div>
    </div>
  );
} 