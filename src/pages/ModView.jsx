import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import GroupNavBar from '../components/GroupNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import styles from './Group.module.css';

export default function ModView() {
  const { groupId } = useParams();
  
  // References for the content boxes to measure heights
  const requestsBoxRef = useRef(null);
  const statusBoxRef = useRef(null);
  const recomputeBoxRef = useRef(null);
  
  // Since this is already the mod view, we want to show the mod view button as active
  const showModViewButton = true;
  
  // Dummy data for pending counts - in a real app, this would come from API
  const pendingRequestsCount = 7;
  
  // State for announcement form
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementLink, setAnnouncementLink] = useState('');
  
  // State for user status change form
  const [username, setUsername] = useState('');
  const [newStatus, setNewStatus] = useState('Member');
  
  // State for recompute ratings form
  const [contestId, setContestId] = useState('');
  
  // State to store the max height of the boxes
  const [boxHeight, setBoxHeight] = useState(null);
  
  // Handle announcement creation (just a placeholder function)
  const handleCreateAnnouncement = () => {
    console.log('Creating announcement:', { title: announcementTitle, link: announcementLink });
    // In a real app, this would call an API to create the announcement
    alert('Announcement created!');
    setAnnouncementTitle('');
    setAnnouncementLink('');
  };

  // Handle user status change (placeholder function)
  const handleStatusChange = () => {
    console.log('Changing status for user:', { username, newStatus });
    // In a real app, this would call an API to change the user's status
    alert(`Status changed to ${newStatus} for ${username}!`);
    setUsername('');
    setNewStatus('Member');
  };
  
  // Handle recompute ratings (placeholder function)
  const handleRecomputeRatings = () => {
    console.log('Recomputing ratings for contest:', { contestId });
    // In a real app, this would call an API to trigger recomputation
    alert(`Rating recomputation triggered for contest ${contestId}!`);
    setContestId('');
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
      <ContentBoxWithTitle title="General Settings" backgroundColor="rgb(230, 240, 255)">
        <div className="contentBox" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto' }}>
          {/* Empty content for now */}
        </div>
      </ContentBoxWithTitle>
      
      {/* Create Announcement box */}
      <ContentBoxWithTitle title="Create Announcement" backgroundColor="rgb(240, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="announcement-title" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Announcement Title:
            </label>
            <input
              id="announcement-title"
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="announcement-link" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Announcement Link:
            </label>
            <input
              id="announcement-link"
              type="text"
              value={announcementLink}
              onChange={(e) => setAnnouncementLink(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          
          <button
            onClick={handleCreateAnnouncement}
            className="global-button blue"
          >
            Create
          </button>
        </div>
      </ContentBoxWithTitle>
      
      {/* Requests, Change Status, and Recompute Ratings Boxes - side by side */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Requests Box */}
        <ContentBoxWithTitle title="Requests" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }}>
          <div 
            ref={requestsBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '15px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div className="standardTextFont" style={{ marginBottom: '15px' }}>
              <strong>Pending Requests:</strong> {pendingRequestsCount}
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
        <ContentBoxWithTitle title="Change Status" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }}>
          <div 
            ref={statusBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '15px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="username" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Username:
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="new-status" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  New Status:
                </label>
                <select
                  id="new-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value="Moderator">Moderator</option>
                  <option value="Member">Member</option>
                  <option value="Outsider">Outsider</option>
                </select>
              </div>
            </div>
            
            <div>
              <button
                onClick={handleStatusChange}
                className="global-button green"
              >
                Make Changes
              </button>
            </div>
          </div>
        </ContentBoxWithTitle>

        {/* Recompute Ratings Box */}
        <ContentBoxWithTitle title="Recompute Ratings" backgroundColor="rgb(230, 255, 230)" style={{ flex: '1 0 33.33%' }}>
          <div 
            ref={recomputeBoxRef} 
            className="contentBox standardTextFont" 
            style={{ 
              border: 'none', 
              boxShadow: 'none', 
              padding: '15px',
              height: boxHeight ? `${boxHeight}px` : 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="contest-id" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Contest ID:
                </label>
                <input
                  id="contest-id"
                  type="text"
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  placeholder="Enter Contest ID"
                />
              </div>
              <p style={{ fontSize: '1.0em', fontStyle: 'italic', marginTop: '-10px', marginBottom: '15px' }}>
                Note: You can recompute rating changes only once per contest!
              </p>
            </div>
            
            <div>
              <button
                onClick={handleRecomputeRatings}
                className="global-button green"
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