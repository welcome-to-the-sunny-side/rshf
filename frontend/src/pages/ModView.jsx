import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import GroupNavBar from '../components/GroupNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import styles from './Group.module.css';
import infoboxStyles from '../components/ContentBoxWithTitle.module.css';
import formInputStyles from '../components/FormInput.module.css';
import { DropdownMenu } from '../components';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import loginStyles from './Login.module.css';

export default function ModView() {
  const { groupId } = useParams();
  const { token, user } = useAuth();

  // References for the content boxes to measure heights
  const requestsBoxRef = useRef(null);
  const statusBoxRef = useRef(null);
  const recomputeBoxRef = useRef(null);

  // UI state
  const showModViewButton = true;
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(true);
  const [pendingRequestsError, setPendingRequestsError] = useState('');

  // General settings
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState('public');
  const [groupLoading, setGroupLoading] = useState(true);
  const [groupError, setGroupError] = useState('');
  const [groupSuccess, setGroupSuccess] = useState('');

  // Announcement
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState('');

  // Membership status
  const [username, setUsername] = useState('');
  const [newStatus, setNewStatus] = useState('user');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  // Recompute
  const [contestId, setContestId] = useState('');

  // Box height
  const [boxHeight, setBoxHeight] = useState(null);

  // Fetch group info
  useEffect(() => {
    const fetchGroupData = async () => {
      setGroupLoading(true);
      setGroupError('');
      setGroupSuccess('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/groups', { headers });
        const group = res.data.find(g => g.group_id === groupId);
        if (!group) {
          setGroupError('Group not found.');
        } else {
          setGroupDescription(group.group_description || '');
          setGroupType(group.is_private ? 'private' : 'public');
        }
      } catch (err) {
        setGroupError('Failed to fetch group info.');
      } finally {
        setGroupLoading(false);
      }
    };
    if (groupId && token) fetchGroupData();
  }, [groupId, token]);

  // Fetch pending requests count
  useEffect(() => {
    const fetchPendingRequestsCount = async () => {
      setPendingRequestsLoading(true);
      setPendingRequestsError('');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // resolved=false for pending requests
        const res = await axios.get(`/api/requests_count?group_id=${encodeURIComponent(groupId)}&resolved=false`, { headers });
        setPendingRequestsCount(res.data.count ?? 0);
      } catch (err) {
        setPendingRequestsError('Failed to fetch pending requests count.');
        setPendingRequestsCount(0);
      } finally {
        setPendingRequestsLoading(false);
      }
    };
    if (groupId && token) fetchPendingRequestsCount();
  }, [groupId, token]);

  // Update group description/type
  const handleGroupUpdate = async (field) => {
    setGroupLoading(true);
    setGroupError('');
    setGroupSuccess('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        group_id: groupId,
        group_description: field === 'description' ? groupDescription : undefined,
        is_private: field === 'type' ? (groupType === 'private') : undefined
      };
      await axios.put('/api/group', payload, { headers });
      setGroupSuccess('Group updated successfully!');
    } catch (err) {
      setGroupError('Failed to update group.');
    } finally {
      setGroupLoading(false);
    }
  };

  // Handle announcement creation
  const handleCreateAnnouncement = async () => {
    setAnnouncementLoading(true);
    setAnnouncementError('');
    setAnnouncementSuccess('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/announcement', {
        user_id: user?.user_id,
        group_id: groupId,
        title: announcementTitle,
        content: announcementContent
      }, { headers });
      setAnnouncementSuccess('Announcement created!');
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err) {
      setAnnouncementError('Failed to create announcement.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // Handle user status change
  const handleStatusChange = async () => {
    setStatusLoading(true);
    setStatusError('');
    setStatusSuccess('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put('/api/change_membership_status', {
        user_id: username,
        group_id: groupId,
        new_role: newStatus
      }, { headers });
      setStatusSuccess(`Status changed to ${newStatus} for ${username}!`);
      setUsername('');
      setNewStatus('user');
    } catch (err) {
      setStatusError('Failed to change user status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // Use an effect to measure and set the heights of the boxes
  useEffect(() => {
    const updateHeights = () => {
      if (requestsBoxRef.current && statusBoxRef.current && recomputeBoxRef.current) {
        const requestsHeight = requestsBoxRef.current.offsetHeight;
        const statusHeight = statusBoxRef.current.offsetHeight;
        const recomputeHeight = recomputeBoxRef.current.offsetHeight;
        setBoxHeight(Math.max(requestsHeight, statusHeight, recomputeHeight));
      }
    };
    
    // Run once after initial render
    updateHeights();
    
    // Also set up a resize observer to handle window resizing
    const resizeObserver = new ResizeObserver(updateHeights);
    
    if (requestsBoxRef.current && statusBoxRef.current && recomputeBoxRef.current) {
      resizeObserver.observe(requestsBoxRef.current);
      resizeObserver.observe(statusBoxRef.current);
      resizeObserver.observe(recomputeBoxRef.current);
    }
    
    // Clean up the observer on unmount
    return () => {
      if (requestsBoxRef.current && statusBoxRef.current && recomputeBoxRef.current) {
        resizeObserver.unobserve(requestsBoxRef.current);
        resizeObserver.unobserve(statusBoxRef.current);
        resizeObserver.unobserve(recomputeBoxRef.current);
      }
    };
  }, []);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* General Settings box */}
      <ContentBoxWithTitle title="General Settings" backgroundColor="rgb(230, 240, 255)" contentPadding="0.5rem 1rem 0rem 1rem">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '5px' }}>
          <div className={infoboxStyles.infoBox}>
            Note: These can only be modified by admins.
          </div>
          {/* Feedback Message (one only, above form) */}
          {groupError && (
            <div className="api-error">{groupError}</div>
          )}
          {!groupError && groupSuccess && (
            <div className="api-success">{groupSuccess}</div>
          )}

          {/* Group Description */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="group-description" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Group Description:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <textarea
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={() => handleGroupUpdate('description')}
                className="global-button green"
                disabled={groupLoading}
              >
                Update
              </button>
            </div>
          </div>
          
          {/* Group Type */}
          <div style={{ marginBottom: '0px' }}>
            <label htmlFor="group-type" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Group Type:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <DropdownMenu
  id="group-type"
  value={groupType}
  onChange={(e) => setGroupType(e.target.value)}
  className="standardTextFont"
>
  <option value={groupType}>{groupType}</option>
  {groupType !== 'public' && <option value="public">public</option>}
  {groupType !== 'private' && <option value="private">private</option>}
</DropdownMenu>
              <button
                onClick={() => handleGroupUpdate('type')}
                className="global-button green"
                disabled={groupLoading}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </ContentBoxWithTitle>
      
      {/* Create Announcement box */}
      <ContentBoxWithTitle title="Create Announcement" backgroundColor="rgb(240, 240, 255)" contentPadding="0.5rem 1rem 0rem 1rem">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '5px' }}>
          {/* Feedback Message (one only, above form) */}
          {announcementError && (
            <div className="api-error">{announcementError}</div>
          )}
          {announcementSuccess && (
            <div className="api-success">{announcementSuccess}</div>
          )}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="announcement-title" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Announcement Title:
            </label>
            <input
              id="announcement-title"
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className={formInputStyles.formInput}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="announcement-link" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Announcement Link:
            </label>
            <input
              id="announcement-link"
              type="text"
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              className={formInputStyles.formInput}
              style={{ width: '100%' }}
            />
          </div>

          <button
            onClick={handleCreateAnnouncement}
            className="global-button blue"
            disabled={announcementLoading}
          >
            Create Announcement
          </button>
        </div>
      </ContentBoxWithTitle>
      
      {/* Requests, Change Status, and Recompute Ratings Boxes - side by side */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Requests Box */}
        <ContentBoxWithTitle title="Requests" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }} contentPadding="0.5rem 1rem 0rem 1rem">
          <div 
            ref={requestsBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '5px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div className="standardTextFont" style={{ marginBottom: '15px' }}>
              <strong>Pending Requests:</strong>{' '}
              {pendingRequestsLoading ? (
                <span style={{ color: '#888' }}>Loading...</span>
              ) : pendingRequestsError ? (
                <span className="api-error">{pendingRequestsError}</span>
              ) : (
                pendingRequestsCount
              )}
            </div>
            <div>
              <Link 
                to={`/group/${groupId}/modview/requests`}
                className="global-button green"
              >
                View All Requests →
              </Link>
            </div>
          </div>
        </ContentBoxWithTitle>

        {/* Change Status Box */}
        <ContentBoxWithTitle title="Change Status" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }} contentPadding="0.5rem 1rem 0rem 1rem">
          <div 
            ref={statusBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '5px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              flex: 1
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Feedback Message (one only, above form) */}
              {statusError && (
                <div className="api-error">{statusError}</div>
              )}
              {statusSuccess && (
                <div className="api-success">{statusSuccess}</div>
              )}
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="username" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Username:
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={formInputStyles.formInput}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="new-status" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  New Status:
                </label>
                <DropdownMenu
                  id="new-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="moderator">moderator</option>
                  <option value="user">user</option>
                  <option value="kicked">kicked</option>
                </DropdownMenu>
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button
                onClick={handleStatusChange}
                className="global-button green"
                disabled={statusLoading}
              >
                Make Changes
              </button>
            </div>
          </div>
        </ContentBoxWithTitle>

        {/* Recompute Ratings Box */}
        <ContentBoxWithTitle title="Recompute Ratings" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }} contentPadding="0.5rem 1rem 0rem 1rem">
          <div 
            ref={recomputeBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '5px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ flex: 1 }}>
            <div className={infoboxStyles.infoBox}>
                Note: You can recompute rating changes only once per contest!
              </div>
              <div style={{ marginTop: '-0.5rem', marginBottom: '0px' }}>
                <label htmlFor="contest-id" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Contest ID:
                </label>
                <input
                  id="contest-id"
                  type="text"
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value)}
                  className={formInputStyles.formInput}
                  placeholder="Enter Contest ID"
                  disabled
                />
              </div>
            </div>
            <div>
              <button
                className="global-button grey"
                disabled
              >
                Recompute
              </button>
            </div>
          </div>
        </ContentBoxWithTitle>
      </div>
    </div>
  );
}