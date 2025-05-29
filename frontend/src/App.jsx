import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import User from './pages/User';
import UserGroups from './pages/UserGroups';
import UserSettings from './pages/UserSettings';
import Groups from './pages/Groups';
import Group from './pages/Group';
import GroupMembers from './pages/GroupMembers';
import GroupContests from './pages/GroupContests';
import GroupReports from './pages/GroupReports';
import Report from './pages/Report';
import ModView from './pages/ModView';
import GroupModViewRequests from './pages/GroupModViewRequests';
import About from './pages/About';
import Contests from './pages/Contests';
import Post from './pages/Post';
import ContestPage from './pages/ContestPage';
import GroupContestPage from './pages/GroupContestPage';

import { AuthProvider } from './context/AuthContext';
import './index.css';
import './styles/auth.css';


export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public routes - accessible without login */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          
          {/* Protected routes - require authentication */}
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/user/:username" element={
            <PrivateRoute>
              <User />
            </PrivateRoute>
          } />
          <Route path="/user/:username/groups" element={
            <PrivateRoute>
              <UserGroups />
            </PrivateRoute>
          } />
          <Route path="/user/:username/settings" element={
            <PrivateRoute>
              <UserSettings />
            </PrivateRoute>
          } />
          <Route path="/groups" element={
            <PrivateRoute>
              <Groups />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId" element={
            <PrivateRoute>
              <Group />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/members" element={
            <PrivateRoute>
              <GroupMembers />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/contests" element={
            <PrivateRoute>
              <GroupContests />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/reports" element={
            <PrivateRoute>
              <GroupReports />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/report/:reportId" element={
            <PrivateRoute>
              <Report />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/modview" element={
            <PrivateRoute>
              <ModView />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/modview/requests" element={
            <PrivateRoute>
              <GroupModViewRequests />
            </PrivateRoute>
          } />
          <Route path="/contests" element={
            <PrivateRoute>
              <Contests />
            </PrivateRoute>
          } />
          <Route path="/contest/:contest_id" element={
            <PrivateRoute>
              <ContestPage />
            </PrivateRoute>
          } />
          <Route path="/group/:groupId/contest/:contestId" element={
            <PrivateRoute>
              <GroupContestPage />
            </PrivateRoute>
          } />
          <Route path="/post/:postId" element={
            <PrivateRoute>
              <Post />
            </PrivateRoute>
          } />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
