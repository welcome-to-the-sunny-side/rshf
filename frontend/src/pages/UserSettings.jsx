import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import UserNavBar from '../components/UserNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import axios from 'axios';
import formInputStyles from '../components/FormInput.module.css';
import loginStyles from './Login.module.css';

export default function UserSettings() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { username } = useParams();
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // State for user settings
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codeforcesHandle, setCodeforcesHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({ email: '', password: '' });
  const [success, setSuccess] = useState('');

  // Auth and route protection
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && username) {
      if (user.user_id === username) {
        setIsOwnProfile(true);
      } else {
        setIsOwnProfile(false);
        navigate(`/user/${user.user_id}/settings`);
      }
    }
  }, [user, token, username, navigate]);

  // Fetch user data from API
  const fetchUserData = async () => {
    if (!user || !token) return;
    setLoading(true);
    setError('');
    setFieldError({ email: '', password: '', cf_handle: '' });
    setSuccess('');
    try {
      const res = await axios.get(`/api/user?user_id=${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmail(res.data.email_id || '');
      setCodeforcesHandle(res.data.cf_handle || '');
    } catch (err) {
      setError('Failed to fetch user data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line
  }, [user]);

  // --- Update Handlers ---
  const handleEmailUpdate = async () => {
    setError('');
    setFieldError({ ...fieldError, email: '' });
    setSuccess('');

    // Email validation (same as Register.jsx)
    if (!email.trim()) {
      setFieldError(f => ({ ...f, email: 'Email address is required' }));
      return;
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFieldError(f => ({ ...f, email: 'Invalid email address' }));
      return;
    }

    setLoading(true);
    try {
      const res = await axios.put(
        `/api/user?user_id=${user.user_id}`,
        { email_id: email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmail(res.data.email_id || '');
      setSuccess('Email updated successfully!');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setFieldError(f => ({ ...f, email: err.response.data.detail }));
      } else {
        setError('Failed to update email.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordUpdate = async () => {
    setLoading(true);
    setError('');
    setFieldError({ ...fieldError, password: '' });
    setSuccess('');
    if (!password) {
      setFieldError(f => ({ ...f, password: 'Please enter a password.' }));
      setLoading(false);
      return;
    }
    try {
      const res = await axios.put(
        `/api/user?user_id=${user.user_id}`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Password updated successfully!');
      setEmail(res.data.email_id || email); // In case backend returns updated email
      setPassword('');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setFieldError(f => ({ ...f, password: err.response.data.detail }));
      } else {
        setError('Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <ContentBoxWithTitle title="User Settings" backgroundColor="rgb(230, 240, 255)" contentPadding="0.5rem 1rem 0rem 1rem">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', padding: '5px', display: 'flex', flexDirection: 'column' }}>
          {error && <div className="api-error">{error}</div>}
          {success && <div className="api-success">{success}</div>}

          {/* Email Address */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Email Address:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={formInputStyles.formInput}
                disabled={loading}
              />
              <button
                onClick={handleEmailUpdate}
                className="global-button green"
                disabled={loading}
              >
                Update
              </button>
            </div>
            {fieldError.email && <div className="api-field-error">{fieldError.email}</div>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '15px' }}>
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
                className={formInputStyles.formInput}
                disabled={loading}
              />
              <button
                onClick={handlePasswordUpdate}
                className="global-button green"
                disabled={loading}
              >
                Update
              </button>
            </div>
            {fieldError.password && <div className="api-field-error">{fieldError.password}</div>}
          </div>

          {/* Codeforces Account (read-only) */}
          <div style={{ marginBottom: '5px' }}>
            <label htmlFor="codeforces" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Codeforces Account:
            </label>
            <input
              id="codeforces"
              type="text"
              value={codeforcesHandle}
              className={formInputStyles.formInput}
              disabled
              readOnly
            />
          </div>
        </div>
      </ContentBoxWithTitle>
    </div>
  );
}