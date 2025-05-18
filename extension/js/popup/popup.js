// DOM Elements
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const welcomeMessage = document.getElementById('welcome-message');
const userDetails = document.getElementById('user-details');
const groupSelect = document.getElementById('group-select');
const nonMemberDisplay = document.getElementById('non-member-display');
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
  logoutButton.addEventListener('submit', handleLogout);
  groupSelect.addEventListener('change', handleGroupChange);
  nonMemberDisplay.addEventListener('change', handleDisplayChange);
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
        groupSelect.value = response.selectedGroup.group_id;
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
  const selectedOption = groupSelect.options[groupSelect.selectedIndex];
  if (selectedOption && selectedOption.value) {
    const selectedGroup = {
      group_id: selectedOption.value,
      group_name: selectedOption.textContent
    };
    
    chrome.runtime.sendMessage(
      { action: 'setSelectedGroup', group: selectedGroup },
      (response) => {
        if (!response.success) {
          console.error('Failed to set selected group:', response.error);
        }
      }
    );
  }
}

// Display preference change handler
function handleDisplayChange() {
  const displayMode = nonMemberDisplay.value;
  chrome.storage.local.set({ nonMemberDisplay: displayMode });
}

// Load groups from API
function loadGroups() {
  // Clear existing options except the default
  while (groupSelect.options.length > 1) {
    groupSelect.options.remove(1);
  }
  
  // Fetch groups from API
  fetch(`${BACKEND_URL}/api/groups`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      return response.json();
    })
    .then(groups => {
      // Add groups to select dropdown
      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.group_id;
        option.textContent = group.group_name;
        groupSelect.appendChild(option);
      });
      
      // Check if there's a previously selected group
      chrome.storage.local.get(['selectedGroup'], (result) => {
        if (result.selectedGroup) {
          groupSelect.value = result.selectedGroup.group_id;
        }
      });
    })
    .catch(error => {
      console.error('Error loading groups:', error);
    });
}

// Load display preferences
function loadDisplayPreferences() {
  chrome.storage.local.get(['nonMemberDisplay'], (result) => {
    if (result.nonMemberDisplay) {
      nonMemberDisplay.value = result.nonMemberDisplay;
    }
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
  welcomeMessage.textContent = `Welcome, ${user.username}`;
  userDetails.textContent = user.cf_handle ? 
    `Codeforces handle: ${user.cf_handle}` : 
    'No Codeforces handle linked';
}
