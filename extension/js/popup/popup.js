// DOM Elements
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');

const userDetails = document.getElementById('user-details');
const groupInput = document.getElementById('group-input');
const setGroupButton = document.getElementById('set-group-button');
const nonMemberDisplay = document.getElementById('non-member-display');
const inGroupDisplay = document.getElementById('in-group-display');
const registerLink = document.getElementById('register-link');

// New DOM Elements for Ratings Refresh
const refreshRatingsBtn = document.getElementById('refreshRatingsBtn');
const refreshStatusEl = document.getElementById('refreshStatus');

// Constants
const BACKEND_URL = 'http://localhost:8000';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Set register link URL
  registerLink.href = `${BACKEND_URL}/register`;
  
  // Check authentication state - Use the new validateAuthState instead of checkAuthState
  validateAuthState();
  
  // Set up event listeners
  loginForm.addEventListener('submit', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  setGroupButton.addEventListener('click', handleGroupChange);
  nonMemberDisplay.addEventListener('change', handleDisplayChange);
  inGroupDisplay.addEventListener('change', handleDisplayChange);

  // Event listener for the new refresh button
  if (refreshRatingsBtn) {
    refreshRatingsBtn.addEventListener('click', handleForceRefreshRatings);
  }

  // Initial call to update refresh status when popup opens
  // This is also called within checkAuthState for logged-in users, but good to have for non-logged in state too if section is visible
  updateRefreshStatusDisplay(); 
});

// Listen for messages from background script (e.g., when ratings are updated automatically)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ratingsUpdated') {
    console.log('Popup received ratingsUpdated message from background.');
    updateRefreshStatusDisplay(message.fileTimestamp, message.refreshedAt);
  }
  // Keep 'return true' if you need to send an async response from here, otherwise false or undefined.
  // For this listener, we are just reacting, so no async response needed.
});

// Authentication status check
function checkAuthState() {
  chrome.runtime.sendMessage({ action: 'getAuthState' }, (response) => {
    if (response.isAuthenticated && response.user) {
      // User is logged in, show main view
      showMainView(response.user);
      
      // Load groups if not already loaded
      loadGroups();
      
      // Set selected group if exists
      if (response.selectedGroup) {
        groupInput.value = response.selectedGroup.group_name;
      }
      
      // Load display preferences
      loadDisplayPreferences();
    } else {
      // User is not logged in, show login view
      showLoginView();
    }
  });
}

// Validate authentication status by making an API call to confirm token is still valid
function validateAuthState() {
  chrome.runtime.sendMessage({ action: 'validateToken' }, (response) => {
    if (response.isValid) {
      // Token is valid, use regular auth state check
      checkAuthState();
    } else {
      // Token is invalid, show login view
      showLoginView();
      
      // If we were previously logged in but token is now invalid, clean up
      chrome.runtime.sendMessage({ action: 'logout' });
    }
  });
}

// Login handler
async function handleLogin(e) {
  e.preventDefault();
  
  // Clear previous errors
  loginError.textContent = '';
  
  // Disable login button and show loading state
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  try {
    // Send login request to background script
    chrome.runtime.sendMessage(
      { action: 'login', username, password },
      (response) => {
        // Reset login button state
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
        
        if (response.success && response.user) {
          // Login successful
          showMainView(response.user);
          loadGroups();
        } else {
          // Login failed
          loginError.textContent = response.error || 'Login failed';
        }
      }
    );
  } catch (error) {
    // Handle login errors
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
    loginError.textContent = error.message || 'An error occurred during login';
  }
}

// Logout handler
function handleLogout() {
  chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
    if (response.success) {
      showLoginView();
    } else {
      console.error('Logout failed:', response.error);
    }
  });
}

// Group change handler
function handleGroupChange() {
  const groupName = groupInput.value.trim();
  if (groupName) {
    // Get the authentication token
    chrome.storage.local.get(['token'], (result) => {
      if (!result.token) {
        alert('You need to be logged in to select a group');
        return;
      }
      
      // Fetch group ID by name with authentication
      fetch(`${BACKEND_URL}/api/group?group_id=${encodeURIComponent(groupName)}`, {
        headers: {
          'Authorization': `Bearer ${result.token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Group '${groupName}' not found`);
          } else if (response.status === 401) {
            throw new Error('Authentication error. Please log in again.');
          }
          throw new Error('Failed to fetch group details');
        }
        return response.json();
      })
      .then(group => {
        const selectedGroup = {
          group_id: group.group_id,
          group_name: group.group_name
        };
        
        chrome.runtime.sendMessage(
          { action: 'setSelectedGroup', group: selectedGroup },
          (response) => {
            if (response.success) {
              alert(`Group '${group.group_name}' selected successfully!`);
            } else {
              console.error('Failed to set selected group:', response.error);
              alert('Failed to set group. Please try again.');
            }
          }
        );
      })
      .catch(error => {
        console.error('Error selecting group:', error);
        alert(error.message || 'Failed to set group. Please try again.');
      });
    });
  } else {
    alert('Please enter a group name');
  }
}

// Display preference change handler
function handleDisplayChange() {
  const nonMemberDisplayMode = nonMemberDisplay.value;
  const inGroupDisplayMode = inGroupDisplay.value;
  chrome.storage.local.set({
    nonMemberDisplay: nonMemberDisplayMode,
    inGroupDisplay: inGroupDisplayMode
  });
}

// Load previously selected group if any
function loadGroups() {
  chrome.storage.local.get(['selectedGroup'], (result) => {
    if (result.selectedGroup) {
      groupInput.value = result.selectedGroup.group_name;
    }
  });
}

// Load display preferences
function loadDisplayPreferences() {
  chrome.storage.local.get(['nonMemberDisplay', 'inGroupDisplay'], (result) => {
    if (result.nonMemberDisplay) {
      nonMemberDisplay.value = result.nonMemberDisplay;
    }
    // Set default for inGroupDisplay if not already set
    inGroupDisplay.value = result.inGroupDisplay || 'rshf'; 
  });
}

// View management
function showLoginView() {
  loginView.style.display = 'block';
  mainView.style.display = 'none';
  
  // Clear login form
  loginForm.reset();
  loginError.textContent = '';
  // Hide refresh section if it's part of mainView, or manage its visibility separately
  if (document.getElementById('ratings-refresh-section')) {
      document.getElementById('ratings-refresh-section').style.display = 'none';
  }
}

function showMainView(user) {
  loginView.style.display = 'none';
  mainView.style.display = 'block';
  
  // Update user information
  userDetails.textContent = user.cf_handle ? 
    `Codeforces handle: ${user.cf_handle}` : 
    'No Codeforces handle linked';

  // Show refresh section and update its status
  if (document.getElementById('ratings-refresh-section')) {
      document.getElementById('ratings-refresh-section').style.display = 'block';
  }
  updateRefreshStatusDisplay();
}

// --- New Functions for Ratings Refresh Display ---
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
}

function updateRefreshStatusDisplay(fileTs, refreshedAtTs) {
  if (!refreshStatusEl) return;

  if (fileTs && refreshedAtTs) {
    // Called with specific timestamps (e.g., after a refresh)
    refreshStatusEl.textContent = `Data from: ${formatTimestamp(fileTs)}, Checked: ${formatTimestamp(refreshedAtTs)}`;
  } else {
    // Fetch current timestamps from storage
    chrome.runtime.sendMessage({ action: 'getRatingsTimestamps' }, (response) => {
      if (response && response.success) {
        refreshStatusEl.textContent = `Data from: ${formatTimestamp(response.fileTimestamp)}, Checked: ${formatTimestamp(response.lastRefreshedAt)}`;
      } else {
        refreshStatusEl.textContent = 'Last refreshed: Unknown';
        if (response && response.error) console.error('Error getting timestamps:', response.error);
      }
    });
  }
}

function handleForceRefreshRatings() {
  if (!refreshRatingsBtn || !refreshStatusEl) return;

  refreshStatusEl.textContent = 'Refreshing...';
  refreshRatingsBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'forceRefreshRatings' }, (response) => {
    if (response && response.success) {
      // Timestamps will be updated by the 'ratingsUpdated' message listener or by calling updateRefreshStatusDisplay directly
      // updateRefreshStatusDisplay(response.fileTimestamp, response.refreshedAt);
      // No, background now sends 'ratingsUpdated' which is handled by the listener.
      // For immediate feedback after click, we can update here too.
      refreshStatusEl.textContent = `Refreshed! Data from: ${formatTimestamp(response.fileTimestamp)}, Checked: ${formatTimestamp(response.refreshedAt)}`;
    } else {
      refreshStatusEl.textContent = `Error refreshing: ${response.error || 'Unknown error'}`;
    }
    refreshRatingsBtn.disabled = false;
  });
}
