import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import styles from './Login.module.css'; // Import the new CSS module
import waifuImage from '../assets/rshf_waifu_login_pose.webp'; // Import the waifu image
import formInputStyles from '../components/FormInput.module.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they were trying to access before being redirected to login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  // Add a class to the body to handle special login page styling
  React.useEffect(() => {
    document.body.classList.add('loginPage');
    return () => {
      document.body.classList.remove('loginPage');
    };
  }, []);

  return (
    <div className={styles.loginPage}>
      <div className={styles.waifuContainer}>
        <img src={waifuImage} alt="RSHF Waifu" className={styles.waifuImage} />
      </div>
      <div className={styles.formSide}>
         <ContentBoxWithTitle
          className={styles.loginFormContainer}
          title={<span>Login</span>} // Title text will be default color
          backgroundColor="rgb(230, 255, 230)" // Light green background for the title bar
          contentPadding="0.75rem" // Reduced padding from default 1rem
        >
        {error && <div className={styles.errorMessage}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={`${styles.formLabel} standardTextFont`}>
              Username
            </label>
            <input
              type="text"
              id="username"
              className={formInputStyles.formInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={`${styles.formLabel} standardTextFont`}>
              Password
            </label>
            <input
              type="password"
              id="password"
              className={formInputStyles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.4rem' }}>
            <button
              type="submit"
              className="global-button blue small"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <p className={`${styles.linkTextContainer} standardTextFont`}>
          Don't have an account?{' '}
          <Link to="/register" className="tableCellLink">
            Register here
          </Link>
        </p>
        </ContentBoxWithTitle>
      </div> 
    </div>
  );
}


