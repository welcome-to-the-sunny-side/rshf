import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Enter from './pages/Enter';
import User from './pages/User';
import UserGroups from './pages/UserGroups';
import UserSettings from './pages/UserSettings'; // Import UserSettings
import Groups from './pages/Groups';
import Group from './pages/Group';
import GroupMembers from './pages/GroupMembers'; // Import GroupMembers
import GroupContests from './pages/GroupContests'; // Import GroupContests
import GroupReports from './pages/GroupReports'; // Import GroupReports
import Report from './pages/Report'; // Import Report
import ModView from './pages/ModView'; // Import ModView
import GroupModViewRequests from './pages/GroupModViewRequests'; // Import GroupModViewRequests
import About from './pages/About';
import Contests from './pages/Contests';
import Contact from './pages/Contact'; // Import Contact page
import Posts from './pages/Posts';
import Post from './pages/Post';
import ContestPage from './pages/ContestPage'; // Import ContestPage
import Register from './pages/Register';
import RequireAuth from './components/RequireAuth';
import './index.css';

export default function App() {
  // Initialize auth state based on token presence
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Check for token on app initialization
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // If token exists, set logged in state to true
      setIsLoggedIn(true);
      
      // Try to get user info from localStorage if available
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, []);

  return (
    <Routes>
      <Route element={<Layout isLoggedIn={isLoggedIn} currentUser={currentUser} setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />}>
        {/* Public routes */}
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />} />
        <Route path="/register" element={<Register setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />} />
        {/* Protected routes */}
        <Route element={<RequireAuth isLoggedIn={isLoggedIn}/>}>  
          <Route path="/" element={<Home />} />
          <Route path="/enter" element={<Enter />} />
          <Route path="/user/:username" element={<User />} />
          <Route path="/user/:username/groups" element={<UserGroups />} />
          <Route path="/user/:username/settings" element={<UserSettings />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/group/:groupId" element={<Group />} />
          <Route path="/group/:groupId/members" element={<GroupMembers />} />
          <Route path="/group/:groupId/contests" element={<GroupContests />} />
          <Route path="/group/:groupId/reports" element={<GroupReports />} />
          <Route path="/group/:groupId/report/:reportId" element={<Report />} />
          <Route path="/group/:groupId/modview" element={<ModView />} />
          <Route path="/group/:groupId/modview/requests" element={<GroupModViewRequests />} />
          <Route path="/contests" element={<Contests />} />
          <Route path="/contest/:contest_id" element={<ContestPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/post/:postId" element={<Post />} />
        </Route>
      </Route>
    </Routes>
  );
}
