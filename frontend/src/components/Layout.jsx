import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import logo from '../assets/logo.png';

export default function Layout({ isLoggedIn, currentUser, setIsLoggedIn, setCurrentUser }) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    // Clear the authentication token and user data
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    
    // Update state to reflect logged out status
    setIsLoggedIn(false);
    setCurrentUser(null);
    
    // Redirect to login page
    navigate('/login');
  };
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/">
          <img src={logo} alt="RSHF Logo" className={styles.logo} />
        </Link>
        {isLoggedIn && currentUser && (
          <div className={styles.userActions}>
            <Link 
              to={`/user/${currentUser.username}`}
              className={styles.usernameLink}
            >
              {currentUser.username}
            </Link>
            <span className={styles.userActionSeparator}>|</span>
            <Link 
              to="#" 
              className={styles.logoutLink} 
              onClick={handleLogout}
            >
              Logout
            </Link>
          </div>
        )}
      </header>
      {/* New Navigation Bar */}
      <nav className={styles.navBar}>
        <Link to="/" className={styles.navLink}>Home</Link>
        <Link to="/groups" className={styles.navLink}>Groups</Link>
        <Link to="/contests" className={styles.navLink}>Contests</Link>
      </nav>
      <main className={styles.main}><Outlet/></main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link to="/about" className={styles.footerLink}>About</Link>
          <Link to="/contact" className={styles.footerLink}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
