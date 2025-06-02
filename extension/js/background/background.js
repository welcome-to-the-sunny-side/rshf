// IMPORTANT: Make sure pako.js is available in this context.
// For Manifest V2, you might use: importScripts('lib/pako.min.js'); at the top.
// For Manifest V3, ensure it's bundled or correctly configured in manifest.json.
importScripts('../lib/pako.min.js');

// Constants for RSHF Ratings Data
const RATINGS_DATA_URL = 'https://pub-e98285daadd4482fb56021ad394144c1.r2.dev/extension_data';
const STORAGE_KEY_RATINGS_DATA = 'rshfRatingsData';
const STORAGE_KEY_RATINGS_FILE_TIMESTAMP = 'rshfRatingsFileTimestamp'; // Timestamp from the data file
const STORAGE_KEY_LAST_REFRESHED_AT = 'rshfLastRefreshedAt'; // Local timestamp of last successful refresh
const STORAGE_KEY_DATA_FORMAT = 'rshfDataFormat'; // Format of the data for each user entry
const REFRESH_INTERVAL_SECONDS = 6 * 60 * 60;
const REFRESH_ALARM_NAME = 'rshfRatingsRefreshAlarm';

// Constants for User Authentication (existing)
const BACKEND_URL = 'http://127.0.0.1:8000'; // Assuming this is still needed for login
const API_ENDPOINTS = {
  LOGIN: `${BACKEND_URL}/api/user/login`,
  USER_INFO: `${BACKEND_URL}/api/user`,
  // GROUPS: `${BACKEND_URL}/api/groups`, // Likely not needed if groups are in the new data file
};

// Authentication state (existing)
let authState = {
  token: null,
  user: null,
  isAuthenticated: false,
  selectedGroup: null // This might still be relevant for user's preferred default group
};

// Initialize auth state from storage (existing)
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

// --- New Ratings Data Fetching and Management ---

async function fetchAndStoreRatings(forceBypass = true) {
  console.log('RSHF Extension: Attempting to fetch and store ratings data...');
  
  try {
    // Skip validation - directly fetch new data

    // Add a cache-busting parameter to avoid browser caching
    const cacheBustUrl = `${RATINGS_DATA_URL}?_cache=${Date.now()}`;
    const response = await fetch(cacheBustUrl, {
      cache: 'no-store', // Force network request, bypass cache completely
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const compressedData = await response.arrayBuffer();
    
    // Decompress using pako
    const decompressedDataString = pako.inflate(compressedData, { to: 'string' });
    const parsedData = JSON.parse(decompressedDataString);
    
    // Just log groups for informational purposes without validation
    if (parsedData.data) {
      const groups = Object.keys(parsedData.data);
      console.log(`RSHF Extension: Found ${groups.length} groups in data:`, groups.join(', '));
    }

    const dataToStore = {
      [STORAGE_KEY_RATINGS_DATA]: parsedData.data,
      [STORAGE_KEY_RATINGS_FILE_TIMESTAMP]: parsedData.timestamp,
      [STORAGE_KEY_LAST_REFRESHED_AT]: Date.now(),
      [STORAGE_KEY_DATA_FORMAT]: parsedData.data_format
    };

    // Only remove ratings-related keys, not token/user info
    await chrome.storage.local.remove([
      STORAGE_KEY_RATINGS_DATA,
      STORAGE_KEY_RATINGS_FILE_TIMESTAMP,
      STORAGE_KEY_LAST_REFRESHED_AT,
      STORAGE_KEY_DATA_FORMAT
    ]);
    await chrome.storage.local.set(dataToStore);
    console.log('RSHF Extension: Ratings data fetched, stored, and timestamps updated successfully.');
    return { success: true, fileTimestamp: parsedData.timestamp, refreshedAt: dataToStore[STORAGE_KEY_LAST_REFRESHED_AT] };

  } catch (error) {
    console.error('RSHF Extension: Error fetching or processing ratings data:', error);
    // Do not clear old data on error, keep using stale data if available
    return { success: false, error: error.message };
  }
}

async function triggerRefresh(isInitialSetup = false) {
  // For initial setup or manual refresh, pass true to forceBypass to ensure a clean fetch
  const result = await fetchAndStoreRatings(isInitialSetup || true);
  if (result.success) {
    // Notify other parts of the extension (e.g., popup) that data was updated
    chrome.runtime.sendMessage({ action: 'ratingsUpdated', ...result }).catch(e => console.log("Error sending ratingsUpdated message, popup likely closed"));
  }
  return result;
}

async function checkAndTriggerRefreshIfNeeded() {
  const result = await chrome.storage.local.get(STORAGE_KEY_LAST_REFRESHED_AT);
  const lastRefreshed = result[STORAGE_KEY_LAST_REFRESHED_AT];
  const threshold = REFRESH_INTERVAL_SECONDS * 1000;

  if (!lastRefreshed || (Date.now() - lastRefreshed > threshold)) {
    console.log('RSHF Extension: Refresh threshold met or no previous refresh data. Triggering refresh.');
    await triggerRefresh();
  } else {
    console.log('RSHF Extension: Ratings data is fresh. No automatic refresh needed yet.');
  }
}

// --- Event Listeners ---

// On extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('RSHF Extension: onInstalled event, details:', details);
  if (details.reason === 'install' || details.reason === 'update') {
    await triggerRefresh(true); // Fetch data immediately on install/update
  }
  // Setup periodic alarm
  chrome.alarms.create(REFRESH_ALARM_NAME, {
    delayInMinutes: 1, // Start checking after 1 minute
    periodInMinutes: REFRESH_INTERVAL_SECONDS / 60
  });
  console.log('RSHF Extension: Refresh alarm created.');
});

// Handle alarm for periodic refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === REFRESH_ALARM_NAME) {
    console.log('RSHF Extension: Refresh alarm triggered.');
    await checkAndTriggerRefreshIfNeeded();
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    // Existing authentication actions
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
    
    // New actions for ratings data
    case 'forceRefreshRatings':
      triggerRefresh().then(sendResponse);
      return true; // Indicates async response

    case 'getRatingsTimestamps':
      chrome.storage.local.get([STORAGE_KEY_RATINGS_FILE_TIMESTAMP, STORAGE_KEY_LAST_REFRESHED_AT], result => {
        sendResponse({
          success: true,
          fileTimestamp: result[STORAGE_KEY_RATINGS_FILE_TIMESTAMP],
          lastRefreshedAt: result[STORAGE_KEY_LAST_REFRESHED_AT]
        });
      });
      return true; // Indicates async response
      
    case 'fetchUserRatings': {
      // Get the requested username
      const username = message.username;
      if (!username) {
        sendResponse({ success: false, error: 'No username provided' });
        return false;
      }
      // Get token and selected group from storage
      chrome.storage.local.get(['token', 'selectedGroup'], result => {
        const token = result.token;
        const selectedGroup = result.selectedGroup;
        if (!token || !selectedGroup || !selectedGroup.group_id) {
          sendResponse({ success: false, error: 'No token or selected group' });
          return;
        }
        // Compose the API URL - use the /membership endpoint
        const url = `${BACKEND_URL}/api/membership?group_id=${encodeURIComponent(selectedGroup.group_id)}&user_id=${encodeURIComponent(username)}`;
        fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(resp => resp.json())
        .then(data => {
          // The API returns a single membership object, not an array
          if (!data) {
            sendResponse({ success: false, error: 'Invalid API response or user not in group' });
            return;
          }
          // Use the membership data directly
          const membership = data;
          sendResponse({
            success: true,
            rating: membership.user_group_rating,
            maxRating: membership.user_group_max_rating,
            groupId: membership.group_id,
            groupName: selectedGroup.display_name || membership.group_id,
            groupUrl: null, // Could be enhanced if needed
            joinDate: membership.timestamp
          });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message || 'API error' });
        });
      });
      return true; // Indicates async response
    }

    case 'openPopup': // Existing action
      chrome.action.openPopup();
      return false;

    default:
      console.warn(`RSHF Extension: Received unknown message action: ${message.action}`);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// --- Authentication functions ---
async function handleLogin(username, password) {
  try {
    console.log('RSHF Extension: Attempting login for user:', username);
    // Clear any previous auth state before attempting new login
    authState.token = null;
    authState.user = null;
    authState.isAuthenticated = false;
    
    // Build the form data for login request
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // Make the login request
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try { 
        const errorData = await response.json(); 
        errorMessage = errorData.detail || errorMessage; 
        console.error('RSHF Extension: Login error response:', errorData);
      } 
      catch (parseError) { 
        errorMessage = `Login failed: ${response.statusText}`; 
        console.error('RSHF Extension: Login parse error:', parseError);
      }
      throw new Error(errorMessage);
    }

    // Parse the login response
    const data = await response.json();
    console.log('RSHF Extension: Login response received:', data);
    
    if (!data.access_token) {
      throw new Error('Login failed: No access token received');
    }
    
    // Store the token and update auth state
    authState.token = data.access_token;
    authState.isAuthenticated = true;
    await chrome.storage.local.set({ token: data.access_token });
    console.log('RSHF Extension: Access token stored');

    // Fetch user details with the new token
    const userResponse = await fetch(`${API_ENDPOINTS.USER_INFO}?user_id=${encodeURIComponent(username)}`, {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });

    if (!userResponse.ok) {
      console.error('RSHF Extension: Failed to fetch user details, status:', userResponse.status);
      throw new Error(`Failed to fetch user details: ${userResponse.statusText}`);
    }
    
    const userData = await userResponse.json();
    console.log('RSHF Extension: User data received:', userData);
    
    // Store user data
    authState.user = userData;
    await chrome.storage.local.set({ user: userData });

    return { success: true, user: userData };
  } catch (error) {
    console.error('RSHF Extension: Login error:', error);
    // Reset auth state on error
    authState.token = null;
    authState.user = null;
    authState.isAuthenticated = false;
    await chrome.storage.local.remove(['token', 'user']);
    throw error;
  }
}

async function handleLogout() {
  authState.token = null;
  authState.user = null;
  authState.isAuthenticated = false;
  return chrome.storage.local.remove(['token', 'user', 'selectedGroup']); // Also clear selectedGroup on logout
}

