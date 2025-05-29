import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/">
          <img src={logo} alt="RSHF Logo" className={styles.logo} />
        </Link>
        {isAuthenticated && user && (
          <div className={styles.userActions}>
            <Link 
              to={`/user/${user.user_id}`}
              className={styles.usernameLink}
            >
              {user.user_id}
            </Link>
            <span className={styles.userActionSeparator}>|</span>
            <span 
              onClick={handleLogout} 
              className={styles.usernameLink}
              style={{ cursor: 'pointer' }}
            >
              Logout
            </span>
          </div>
        )}
      </header>
      {/* New Navigation Bar */}
      <nav className={styles.navBar}>
        <Link to="/" className={styles.navLink}>Home</Link>
        <Link to="/contests" className={styles.navLink}>Contests</Link>
        <Link to="/groups" className={styles.navLink}>Groups</Link>
      </nav>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link to="/about" className={styles.footerLink}>About</Link>
        </div>
      </footer>
    </div>
  );
}
