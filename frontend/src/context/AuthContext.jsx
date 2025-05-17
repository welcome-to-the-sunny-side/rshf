import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Define the backend URL - make sure this matches your backend server
  const BACKEND_URL = 'http://localhost:8000';

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // The API expects the username to be provided in the 'username' field as per OAuth2 standard
      // but internally it's using this to look up the user
      const response = await fetch(`${BACKEND_URL}/api/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'username': username,
          'password': password,
        }),
      });

      // Check if the response is ok before trying to parse JSON
      if (!response.ok) {
        // Try to parse error message if available
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use status text
          errorMessage = `Login failed: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Only try to parse JSON if we have a successful response
      const data = await response.json();
      setToken(data.access_token);
      
      // Get user details after login
      const userResponse = await fetch(`${BACKEND_URL}/api/user?uid=${username}`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData[0]); // The endpoint returns an array with a single user
      }
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        // Try to parse error message if available
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use status text
          errorMessage = `Registration failed: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return true;
    } catch (err) {
      setError(err.message);
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
