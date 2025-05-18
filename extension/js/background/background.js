// Constants
const BACKEND_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
  LOGIN: `${BACKEND_URL}/api/user/login`,
  USER_INFO: `${BACKEND_URL}/api/user`,
  GROUPS: `${BACKEND_URL}/api/groups`,
};

// Authentication state
let authState = {
  token: null,
  user: null,
  isAuthenticated: false,
  selectedGroup: null
};

// Initialize auth state from storage
chrome.storage.local.get(['token', 'user', 'selectedGroup'], (result) => {
  if (result.token) {
    authState.token = result.token;
    authState.isAuthenticated = true;
  }
  if (result.user) {
    authState.user = result.user;
  }
  if (result.selectedGroup) {
    authState.selectedGroup = result.selectedGroup;
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'login':
      handleLogin(message.username, message.password)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response

    case 'logout':
      handleLogout()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getAuthState':
      sendResponse({ 
        isAuthenticated: authState.isAuthenticated,
        user: authState.user,
        selectedGroup: authState.selectedGroup
      });
      return false;

    case 'setSelectedGroup':
      authState.selectedGroup = message.group;
      chrome.storage.local.set({ selectedGroup: message.group });
      sendResponse({ success: true });
      return false;

    case 'fetchUserRatings':
      if (!authState.isAuthenticated || !authState.token) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return false;
      }
      
      fetchUserRatings(message.usernames, authState.selectedGroup?.group_id)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Authentication functions
async function handleLogin(username, password) {
  try {
    // Format request body as URL-encoded form data (same as frontend)
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // Make login request
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (parseError) {
        errorMessage = `Login failed: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Parse token from response
    const data = await response.json();
    authState.token = data.access_token;
    authState.isAuthenticated = true;

    // Store token in extension storage
    chrome.storage.local.set({ token: data.access_token });

    // Fetch user details
    const userResponse = await fetch(`${API_ENDPOINTS.USER_INFO}?user_id=${username}`, {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user details');
    }

    const userData = await userResponse.json();
    authState.user = userData;
    
    // Store user data in extension storage
    chrome.storage.local.set({ user: userData });

    return { success: true, user: userData };
  } catch (error) {
    console.error('Login error:', error);
    authState.token = null;
    authState.user = null;
    authState.isAuthenticated = false;
    chrome.storage.local.remove(['token', 'user']);
    throw error;
  }
}

async function handleLogout() {
  authState.token = null;
  authState.user = null;
  authState.isAuthenticated = false;
  
  // Clear stored auth data
  return chrome.storage.local.remove(['token', 'user']);
}

// API functions to fetch user ratings
async function fetchUserRatings(usernames, groupId) {
  if (!usernames || usernames.length === 0) {
    return [];
  }

  if (!groupId) {
    throw new Error('No group selected');
  }

  try {
    // Implement API call to get ratings for usernames in the selected group
    // This is a placeholder - you'll need to implement the actual API call
    // based on the backend API for fetching ratings
    
    // Mock implementation for now:
    return usernames.map(username => {
      return {
        username,
        rating: Math.floor(Math.random() * 2000),
        timestamp: Date.now()
      };
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    throw error;
  }
}
