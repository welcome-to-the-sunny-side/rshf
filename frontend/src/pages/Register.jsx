import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, login } from '../api';
import styles from './Register.module.css';

export default function Register({ setIsLoggedIn, setCurrentUser }) {
  const [form, setForm] = useState({ user_id: '', cf_handle: '', password: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await registerUser(form);
      if (res.user_id) {
        // auto-login
        const auth = await login(form.user_id, form.password);
        if (auth.access_token) {
          // Store token in localStorage
          localStorage.setItem('token', auth.access_token);
          
          // Store user data in localStorage (consistent with Login component)
          const userData = { username: form.user_id };
          localStorage.setItem('currentUser', JSON.stringify(userData));
          
          // Update app state
          setIsLoggedIn(true);
          setCurrentUser(userData);
          navigate('/');
        } else {
          setError('Registration succeeded, login failed');
        }
      } else {
        setError('Registration failed');
      }
    } catch {
      setError('Registration failed');
    }
  };

  return (
    <div className={styles.container}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          name="user_id"
          type="text"
          placeholder="Username"
          value={form.user_id}
          onChange={handleChange}
          required
        />
        <input
          name="cf_handle"
          type="text"
          placeholder="CF Handle"
          value={form.cf_handle}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit">Register</button>
      </form>
      <p className={styles.redirect}>
        Already have an account? <Link to="/login">Login here!</Link>
      </p>
    </div>
  );
}
