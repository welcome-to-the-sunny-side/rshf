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
import GroupMembers from './pages/GroupMembers'; // Import GroupMembers
import GroupContests from './pages/GroupContests'; // Import GroupContests
import GroupReports from './pages/GroupReports'; // Import GroupReports
import Report from './pages/Report'; // Import Report
import ModView from './pages/ModView'; // Import ModView
import GroupModViewRequests from './pages/GroupModViewRequests'; // Import GroupModViewRequests
import About from './pages/About';
import Contests from './pages/Contests';
import Contact from './pages/Contact'; // Import Contact page

import Post from './pages/Post';
import ContestPage from './pages/ContestPage'; // Import ContestPage
import GroupContestPage from './pages/GroupContestPage'; // Import GroupContestPage
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
        <Route path="/group/:groupId/members" element={<GroupMembers />} />
        <Route path="/group/:groupId/contests" element={<GroupContests />} />
        <Route path="/group/:groupId/reports" element={<GroupReports />} />
        <Route path="/group/:groupId/report/:reportId" element={<Report />} />
        <Route path="/group/:groupId/modview" element={<ModView />} />
        <Route path="/group/:groupId/modview/requests" element={<GroupModViewRequests />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contest/:contest_id" element={<ContestPage />} />
        <Route path="/group/:groupId/contest/:contestId" element={<GroupContestPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/post/:postId" element={<Post />} />
      </Routes>
    </Layout>
  );
}
