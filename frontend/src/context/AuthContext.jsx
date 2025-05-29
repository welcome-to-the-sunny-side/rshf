import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Store token and user data in localStorage when they change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Use environment variable for backend URL, fallback to localhost for development

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // Use axios for login (form data)
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await axiosInstance.post('/api/user/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = response.data;
      setToken(data.access_token);
      // Get user details after login
      const userResponse = await axiosInstance.get(`/api/user?user_id=${username}`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });
      setUser(userResponse.data);
      return true;
    } catch (err) {
      let errorMessage = 'Login failed';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.post('/api/user/register', userData);
      return true;
    } catch (err) {
      let errorMessage = 'Registration failed';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
