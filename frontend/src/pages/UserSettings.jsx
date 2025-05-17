import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import UserNavBar from '../components/UserNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

// Import styles if needed
import styles from './UserSettings.module.css';

export default function UserSettings() {
  const { username } = useParams();
  
  // State for user settings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codeforcesHandle, setCodeforcesHandle] = useState('');
  const [atcoderHandle, setAtcoderHandle] = useState('');
  
  // Fetch current user settings (in a real app, this would come from API)
  useEffect(() => {
    // Simulate fetching user data
    // In a real app, you would fetch this from your backend
    const fetchUserData = async () => {
      // Simulating API call with dummy data
      setTimeout(() => {
        setEmail('user@example.com');
        setCodeforcesHandle('user_cf_handle');
        setAtcoderHandle('user_atcoder_handle');
      }, 500);
    };
    
    fetchUserData();
  }, [username]);
  
  // Handle email update
  const handleEmailUpdate = () => {
    console.log('Updating email to:', email);
    // In a real app, this would call an API to update the email
    alert('Email updated successfully!');
  };
  
  // Handle password update
  const handlePasswordUpdate = () => {
    if (!password) {
      alert('Please enter a password');
      return;
    }
    console.log('Updating password');
    // In a real app, this would call an API to update the password
    alert('Password updated successfully!');
    setPassword('');
  };
  
  // Handle Codeforces handle update
  const handleCodeforcesUpdate = () => {
    console.log('Updating Codeforces handle to:', codeforcesHandle);
    // In a real app, this would call an API to update the Codeforces handle
    alert('Codeforces handle updated successfully!');
  };
  
  // Handle Atcoder handle update
  const handleAtcoderUpdate = () => {
    console.log('Updating Atcoder handle to:', atcoderHandle);
    // In a real app, this would call an API to update the Atcoder handle
    alert('Atcoder handle updated successfully!');
  };
  
  return (
    <div className="page-container">
      {/* Floating button box */}
      <UserNavBar username={username} />
      
      {/* Content box with settings */}
      <ContentBoxWithTitle title="User Settings" backgroundColor="rgb(230, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', padding: '15px' }}>
          {/* Email Address */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Email Address:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <button
                onClick={handleEmailUpdate}
                className="global-button green"
              >
                Update
              </button>
            </div>
          </div>
          
          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Password:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <button
                onClick={handlePasswordUpdate}
                className="global-button green"
              >
                Update
              </button>
            </div>
          </div>
          
          {/* Codeforces Account */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="codeforces" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Codeforces Account:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="codeforces"
                type="text"
                value={codeforcesHandle}
                onChange={(e) => setCodeforcesHandle(e.target.value)}
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <button
                onClick={handleCodeforcesUpdate}
                className="global-button green"
              >
                Update
              </button>
            </div>
          </div>
          
          {/* Atcoder Account */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="atcoder" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Atcoder Account:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="atcoder"
                type="text"
                value={atcoderHandle}
                onChange={(e) => setAtcoderHandle(e.target.value)}
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <button
                onClick={handleAtcoderUpdate}
                className="global-button green"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </ContentBoxWithTitle>
    </div>
  );
}