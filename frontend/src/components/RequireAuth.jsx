import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function RequireAuth({ isLoggedIn }) {
  const location = useLocation();
  
  // Check directly in localStorage for token to avoid race conditions
  const token = localStorage.getItem('token');
  
  // If no token in localStorage or isLoggedIn is false, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <Outlet />;
}
