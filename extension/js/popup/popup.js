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

// Constants
const BACKEND_URL = 'http://localhost:8000';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Set register link URL
  registerLink.href = `${BACKEND_URL}/register`;
  
  // Check authentication state
  checkAuthState();
  
  // Set up event listeners
  loginForm.addEventListener('submit', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  setGroupButton.addEventListener('click', handleGroupChange);
  nonMemberDisplay.addEventListener('change', handleDisplayChange);
  inGroupDisplay.addEventListener('change', handleDisplayChange);
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
}

function showMainView(user) {
  loginView.style.display = 'none';
  mainView.style.display = 'block';
  
  // Update user information
  userDetails.textContent = user.cf_handle ? 
    `Codeforces handle: ${user.cf_handle}` : 
    'No Codeforces handle linked';
}
