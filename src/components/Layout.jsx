import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Layout.module.css';
import logo from '../assets/logo.png';

export default function Layout({ children, isLoggedIn, currentUser }) {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <img src={logo} alt="Skill-Comp Logo" className={styles.logo} />
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
              // Add onClick handler for logout logic later
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
        <Link to="/users" className={styles.navLink}>Users</Link>
        <Link to="/contests" className={styles.navLink}>Contests</Link>
      </nav>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link to="/about" className={styles.footerLink}>About</Link>
          <Link to="/contact" className={styles.footerLink}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
