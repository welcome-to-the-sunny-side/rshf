import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import styles from './Login.module.css';

export default function Login({ setIsLoggedIn, setCurrentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login(username, password);
      if (res.access_token) {
        // Store token and user data in localStorage
        localStorage.setItem('token', res.access_token);
        
        // Store current user info
        const userData = { username };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Update app state
        setIsLoggedIn(true);
        setCurrentUser(userData);
        navigate('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className={styles.container}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit">Login</button>
      </form>
      <p className={styles.redirect}>
        Don't have an account? <Link to="/register">Register here!</Link>
      </p>
    </div>
  );
}
