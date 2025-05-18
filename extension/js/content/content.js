// Cache for storing username ratings
let ratingCache = {};
const CACHE_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initialize content script
(function() {
  console.log('RSHF Codeforces Rating extension initialized');
  initializeExtension();
})();

// Main initialization function
async function initializeExtension() {
  // Check if we're on a Codeforces page
  if (!window.location.hostname.includes('codeforces.com')) {
    return;
  }

  // Get authentication and settings from background
  const authState = await getAuthState();
  
  // Only proceed if user is authenticated and a group is selected
  if (!authState.isAuthenticated) {
    console.log('User not authenticated. Login required.');
    return;
  }
  
  if (!authState.selectedGroup) {
    console.log('No group selected. Select a group in extension popup.');
    return;
  }

  // Load extension settings
  const settings = await getStoredSettings();
  
  // Process the page
  processPage(authState, settings);
}

// Process Codeforces page to replace ratings
async function processPage(authState, settings) {
  // Load cached ratings from storage
  await loadRatingCache();

  // Get all rated users on the page
  const ratedUserElements = document.querySelectorAll('.rated-user');
  if (ratedUserElements.length === 0) {
    return;
  }

  // Extract usernames from elements
  const usernames = extractUsernames(ratedUserElements);
  
  // Determine which usernames need to be fetched from the API
  const usernamesToFetch = determineUsernamesToFetch(usernames);
  
  // Fetch ratings if there are usernames to fetch
  if (usernamesToFetch.length > 0) {
    await fetchAndCacheRatings(usernamesToFetch, authState.selectedGroup);
  }
  
  // Replace ratings on the page
  replaceRatings(ratedUserElements, settings);
}

// Extract usernames from DOM elements
function extractUsernames(elements) {
  const usernames = [];
  elements.forEach(element => {
    const username = element.textContent.trim();
    if (username) {
      usernames.push(username);
    }
  });
  return usernames;
}

// Determine which usernames need to be fetched from the API
function determineUsernamesToFetch(usernames) {
  const now = Date.now();
  const usernamesToFetch = [];
  
  usernames.forEach(username => {
    // Add username to fetch list if:
    // 1. It's not in the cache, or
    // 2. It's in the cache but older than the threshold
    if (!ratingCache[username] || 
        (now - ratingCache[username].timestamp) > CACHE_REFRESH_THRESHOLD) {
      usernamesToFetch.push(username);
    }
  });
  
  return usernamesToFetch;
}

// Fetch ratings from the API and update cache
async function fetchAndCacheRatings(usernames, selectedGroup) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchUserRatings',
      usernames,
      groupId: selectedGroup.group_id
    });
    
    if (response.success && response.data) {
      // Update cache with new ratings
      response.data.forEach(item => {
        ratingCache[item.username] = {
          rating: item.rating,
          timestamp: item.timestamp || Date.now()
        };
      });
      
      // Save updated cache to storage
      saveRatingCache();
    } else {
      console.error('Failed to fetch ratings:', response.error);
    }
  } catch (error) {
    console.error('Error fetching ratings:', error);
  }
}

// Replace ratings in the DOM elements
function replaceRatings(elements, settings) {
  elements.forEach(element => {
    const username = element.textContent.trim();
    if (ratingCache[username]) {
      // Replace the element's class and text based on the new rating
      updateElementWithNewRating(element, ratingCache[username].rating);
    } else {
      // Handle users not in the group based on settings
      handleNonGroupMember(element, settings.nonMemberDisplay);
    }
  });
}

// Update element with new rating information
function updateElementWithNewRating(element, rating) {
  // Remove existing Codeforces rating classes
  removeRatingClasses(element);
  
  // Add new rating class based on RSHF rating
  const ratingClass = getRatingClassForRating(rating);
  element.classList.add(ratingClass);
  
  // Optional: Append rating number to the username
  // element.textContent = `${element.textContent} (${rating})`;
}

// Handle elements for users not in the selected group
function handleNonGroupMember(element, displayMode) {
  switch (displayMode) {
    case 'transparent':
      element.style.opacity = '0.5';
      break;
    case 'star':
      element.textContent = `${element.textContent} ⭐`;
      break;
    case 'plain':
    default:
      // Do nothing, leave as is
      break;
  }
}

// Remove Codeforces rating classes from element
function removeRatingClasses(element) {
  const ratingClasses = [
    'user-black', 'user-gray', 'user-green', 'user-cyan', 
    'user-blue', 'user-violet', 'user-orange', 'user-red',
    'user-legendary', 'user-legendary-user'
  ];
  
  ratingClasses.forEach(className => {
    element.classList.remove(className);
  });
}

// Map rating to appropriate CSS class
function getRatingClassForRating(rating) {
  // This function maps a rating value to a CSS class
  // Adjust these thresholds based on your rating system
  if (rating < 1200) return 'user-gray';
  if (rating < 1400) return 'user-green';
  if (rating < 1600) return 'user-cyan';
  if (rating < 1900) return 'user-blue';
  if (rating < 2100) return 'user-violet';
  if (rating < 2400) return 'user-orange';
  if (rating < 3000) return 'user-red';
  return 'user-legendary';
}

// Utility functions for storage and messaging
async function getAuthState() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getAuthState' }, response => {
      resolve(response);
    });
  });
}

async function getStoredSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(['nonMemberDisplay'], result => {
      resolve({
        nonMemberDisplay: result.nonMemberDisplay || 'transparent'
      });
    });
  });
}

async function loadRatingCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(['ratingCache'], result => {
      if (result.ratingCache) {
        ratingCache = result.ratingCache;
      }
      resolve();
    });
  });
}

function saveRatingCache() {
  chrome.storage.local.set({ ratingCache });
}
