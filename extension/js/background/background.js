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
      
    case 'openPopup':
      // This action is triggered when the user clicks on the status indicator
      // It will show the extension popup
      chrome.action.openPopup();
      return false;
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
    // Check if we have a valid authentication token
    const tokenResult = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!tokenResult.token) {
      throw new Error('Authentication token not found. Please log in.');
    }
    
    // The API expects CF handles, but we're sending usernames, which should be CF handles anyway
    const response = await fetch(`${BACKEND_URL}/api/extension_query_1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResult.token}`
      },
      body: JSON.stringify({
        group_id: groupId,
        cf_handles: usernames
      })
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Group not found');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map the returned ratings to the format expected by the content script
    return usernames.map((username, index) => {
      return {
        username,
        // The API might return null for users not in the group
        rating: data.ratings[index],
        timestamp: Date.now()
      };
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    throw error;
  }
}
