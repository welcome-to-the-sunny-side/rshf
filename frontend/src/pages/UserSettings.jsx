import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import UserNavBar from '../components/UserNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

// Import styles if needed
import styles from './UserSettings.module.css';

export default function UserSettings() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { username } = useParams();
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // State for user settings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codeforcesHandle, setCodeforcesHandle] = useState('');
  const [atcoderHandle, setAtcoderHandle] = useState('');
  
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (user && username) {
      if (user.user_id === username) {
        setIsOwnProfile(true);
      } else {
        // Logged-in user trying to access someone else's settings page
        setIsOwnProfile(false);
        navigate(`/user/${user.user_id}/settings`); // Redirect to their own settings
      }
    } else if (token && !user) {
      // Token exists but user object is not yet available (still loading perhaps)
      // Or, an invalid state. For settings, better to be cautious.
      // Depending on app structure, might wait or redirect to login/home.
      // For now, let's assume if token is there, user should become available.
      // If user remains null with a token, AuthContext might have an issue or token is stale.
      // Consider redirecting to login if user is persistently null with a token after a timeout.
      // For this iteration, we'll rely on user object becoming available if token is valid.
    }
  }, [user, token, username, navigate]);

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
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      
      {/* Content box with settings */}
      <ContentBoxWithTitle title="User Settings" backgroundColor="rgb(230, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', padding: '15px', display: 'flex', flexDirection: 'column' }}>
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
                className="standardTextFont"
                style={{
                  width: '100%',
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
                className="standardTextFont"
                style={{
                  width: '100%',
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
                className="standardTextFont"
                style={{
                  width: '100%',
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
                className="standardTextFont"
                style={{
                  width: '100%',
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