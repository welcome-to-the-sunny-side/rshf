import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Enter from './pages/Enter';
import User from './pages/User';
import UserGroups from './pages/UserGroups';
import UserSettings from './pages/UserSettings'; // Import UserSettings
import Groups from './pages/Groups';
import Group from './pages/Group';
import About from './pages/About';
import Contests from './pages/Contests';
import Contact from './pages/Contact'; // Import Contact page
import Posts from './pages/Posts';
import Post from './pages/Post';
import ContestPage from './pages/ContestPage'; // Import ContestPage
import './index.css';

export default function App() {
  // Example: Replace with your actual authentication logic
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Let's assume logged in for example
  const [currentUser, setCurrentUser] = useState({ username: 'TestUser' }); // Placeholder

  return (
    <Layout isLoggedIn={isLoggedIn} currentUser={currentUser}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/enter" element={<Enter />} />
        <Route path="/user/:username" element={<User />} />
        <Route path="/user/:username/groups" element={<UserGroups />} />
        <Route path="/user/:username/settings" element={<UserSettings />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/group/:groupId" element={<Group />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contest/:contest_id" element={<ContestPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/post/:postId" element={<Post />} />
      </Routes>
    </Layout>
  );
}
