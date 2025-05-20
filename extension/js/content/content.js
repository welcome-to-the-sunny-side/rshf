// Rating utilities - inlined from rating-utils.js
// RANK COLORS
const RANK_COLORS = {
  newbie      : '#808080',    //   < 1200
  pupil       : '#008000',    // 1200 – 1399
  specialist  : '#03A89E',    // 1400 – 1599
  expert      : '#0000ff',    // 1600 – 1899
  candmaster  : '#a0a',       // 1900 – 2099
  master      : '#FF8C00',    // 2100 – 2299
  intmaster   : '#FF8C00',    // 2300 - 2399
  grandmaster : '#ff0000',    // 2400 – 2599
  intgrandmaster: '#ff0000',  // 2600 - 2999
  legend      : '#ff0000'     // >= 3000 (Legendary GM)
};

// RANK BANDS
const RANK_BANDS = [
  { y1: 0,    y2: 1200, color: RANK_COLORS.newbie },
  { y1: 1200, y2: 1400, color: RANK_COLORS.pupil },
  { y1: 1400, y2: 1600, color: RANK_COLORS.specialist },
  { y1: 1600, y2: 1900, color: RANK_COLORS.expert },
  { y1: 1900, y2: 2100, color: RANK_COLORS.candmaster },
  { y1: 2100, y2: 2300, color: RANK_COLORS.master },
  { y1: 2300, y2: 2400, color: RANK_COLORS.intmaster },
  { y1: 2400, y2: 2600, color: RANK_COLORS.grandmaster },
  { y1: 2600, y2: 3000, color: RANK_COLORS.intgrandmaster },
  { y1: 3000,          color: RANK_COLORS.legend } // y2 determined dynamically
];

// RANK CLASSES - Maps to Codeforces CSS classes
const RANK_CLASSES = {
  newbie      : 'user-gray',
  pupil       : 'user-green',
  specialist  : 'user-cyan',
  expert      : 'user-blue',
  candmaster  : 'user-violet',
  master      : 'user-orange',
  intmaster   : 'user-orange',
  grandmaster : 'user-red',
  intgrandmaster: 'user-red',
  legend      : 'user-legendary'
};

/**
 * Get the color for a rating value
 */
function getRatingColor(rating) {
  for (const band of RANK_BANDS) {
    if (rating >= band.y1 && (band.y2 === undefined || rating < band.y2)) {
      return band.color;
    }
  }
  // Default fallback color (should never reach here)
  return RANK_COLORS.newbie;
}

/**
 * Get the rank name based on rating
 */
function getRankName(rating) {
  if (rating < 1200) return "Newbie";
  if (rating < 1400) return "Pupil";
  if (rating < 1600) return "Specialist";
  if (rating < 1900) return "Expert";
  if (rating < 2100) return "Candidate Master";
  if (rating < 2300) return "Master";
  if (rating < 2400) return "International Master";
  if (rating < 2600) return "Grandmaster";
  if (rating < 3000) return "International Grandmaster";
  return "Legendary Grandmaster";
}

/**
 * Get the CSS class for a rating
 */
function getRatingClass(rating) {
  if (rating < 1200) return RANK_CLASSES.newbie;
  if (rating < 1400) return RANK_CLASSES.pupil;
  if (rating < 1600) return RANK_CLASSES.specialist;
  if (rating < 1900) return RANK_CLASSES.expert;
  if (rating < 2100) return RANK_CLASSES.candmaster;
  if (rating < 2300) return RANK_CLASSES.master;
  if (rating < 2400) return RANK_CLASSES.intmaster;
  if (rating < 2600) return RANK_CLASSES.grandmaster;
  if (rating < 3000) return RANK_CLASSES.intgrandmaster;
  return RANK_CLASSES.legend;
}

/**
 * Combined function to get color, name, and CSS class for a rating
 */
function getRatingInfo(rating) {
  return {
    color: getRatingColor(rating),
    name: getRankName(rating),
    cssClass: getRatingClass(rating)
  };
}

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
    // Add an extension icon to show that the extension is installed but not active
    addExtensionStatusIndicator('not-logged-in');
    return;
  }
  
  if (!authState.selectedGroup) {
    console.log('No group selected. Select a group in extension popup.');
    // Add an extension icon to show that the extension is installed but no group is selected
    addExtensionStatusIndicator('no-group-selected');
    return;
  }

  // Load extension settings
  const settings = await getStoredSettings();
  
  // Process the page
  processPage(authState, settings);
}

// Add a small indicator to show the extension status
function addExtensionStatusIndicator(status) {
  // Create a small floating indicator
  const indicator = document.createElement('div');
  indicator.className = 'rshf-status-indicator';
  indicator.style.position = 'fixed';
  indicator.style.bottom = '10px';
  indicator.style.right = '10px';
  indicator.style.padding = '5px 10px';
  indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  indicator.style.color = 'white';
  indicator.style.borderRadius = '4px';
  indicator.style.fontSize = '12px';
  indicator.style.zIndex = '9999';
  indicator.style.cursor = 'pointer';
  
  // Set message based on status
  if (status === 'not-logged-in') {
    indicator.textContent = 'RSHF: Not logged in';
    indicator.title = 'Click to log in to RSHF extension';
  } else if (status === 'no-group-selected') {
    indicator.textContent = 'RSHF: No group selected';
    indicator.title = 'Click to select a group in RSHF extension';
  }
  
  // Open extension popup when clicked
  indicator.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  // Add to page
  document.body.appendChild(indicator);
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
  
  // Handle profile sidebar if it exists
  processProfileSidebar(settings);
  
  // Handle profile box on profile page if it exists
  if (window.location.pathname.startsWith('/profile/')) {
    processProfileBox(settings);
  }
}

// Process profile sidebar to replace rating
function processProfileSidebar(settings) {
  // Find the profile sidebar
  const sidebar = document.querySelector('.personal-sidebar');
  if (!sidebar) {
    return; // No sidebar found
  }
  
  // Find the rating element in the sidebar
  const ratingElement = sidebar.querySelector('ul.propertyLinks li span.user-orange, ul.propertyLinks li span.user-red, ul.propertyLinks li span.user-blue, ul.propertyLinks li span.user-green, ul.propertyLinks li span.user-gray, ul.propertyLinks li span.user-violet, ul.propertyLinks li span.user-cyan, ul.propertyLinks li span.user-legendary');
  if (!ratingElement) {
    return; // No rating element found
  }
  
  // Find the username from the sidebar
  const userElement = sidebar.querySelector('.rated-user');
  if (!userElement) {
    return; // No username element found
  }
  
  const username = userElement.textContent.trim();
  
  // Check if we have a cached rating for this user
  if (ratingCache[username]) {
    if (ratingCache[username].rating !== null) {
      // Update the rating display in the sidebar
      updateSidebarRating(ratingElement, ratingCache[username].rating);
    } else {
      // User not in the selected group
      handleSidebarNonGroupMember(ratingElement, userElement, settings.nonMemberDisplay);
    }
  }
}

// Process the profile box on the profile page
function processProfileBox(settings) {
  // Find the profile box
  const profileBox = document.querySelector('.userbox');
  if (!profileBox) {
    return; // No profile box found
  }
  
  // Find the username element
  const usernameElement = profileBox.querySelector('.rated-user');
  if (!usernameElement) {
    return; // No username element found
  }
  
  const username = usernameElement.textContent.trim();
  
  // Check if we have a cached rating for this user
  if (!ratingCache[username]) {
    return; // No cached rating for this user
  }
  
  if (ratingCache[username].rating === null) {
    // Handle non-group member styling for profile elements
    applyNonGroupMemberStylingToProfile(profileBox, settings.nonMemberDisplay);
    return;
  }
  
  // Get the rating value
  const rating = ratingCache[username].rating;
  const ratingInfo = getRatingInfo(rating);
  
  // Update the rank in the profile box
  const rankElement = profileBox.querySelector('.user-rank span');
  if (rankElement) {
    // Update the rank text and class
    removeRatingClasses(rankElement);
    rankElement.classList.add(ratingInfo.cssClass);
    rankElement.textContent = ratingInfo.name + ' ';
    rankElement.style.color = ratingInfo.color;
    
    // Add tooltip with RSHF rating information
    rankElement.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name})`);
    rankElement.classList.add('rshf-tooltip');
  }
  
  // Update the contest rating in the profile box (avoid max rating as requested)
  const ratingElements = profileBox.querySelectorAll('li');
  for (const li of ratingElements) {
    if (li.textContent.includes('Contest rating:')) {
      // Find the rating span
      const ratingSpan = li.querySelector('span.user-orange, span.user-red, span.user-blue, span.user-green, span.user-gray, span.user-violet, span.user-cyan, span.user-legendary');
      if (ratingSpan) {
        // Update with RSHF rating
        removeRatingClasses(ratingSpan);
        ratingSpan.classList.add(ratingInfo.cssClass);
        ratingSpan.textContent = rating.toString();
        ratingSpan.style.color = ratingInfo.color;
        
        // Add tooltip
        ratingSpan.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name})`);
        ratingSpan.classList.add('rshf-tooltip');
        
        // Remove the max rating part as requested
        const smallerSpan = li.querySelector('.smaller');
        if (smallerSpan) {
          smallerSpan.style.display = 'none';
        }
      }
      
      // Change the label to indicate this is RSHF rating
      const ratingText = li.innerHTML.split('Contest rating:')[0];
      const ratingValue = li.innerHTML.split('Contest rating:')[1].split('<span class="smaller"')[0];
      li.innerHTML = ratingText + 'RSHF Rating:' + ratingValue;
      
      // If there was a max rating section that we hid, add back any content after it
      const smallerSpan = li.querySelector('.smaller');
      if (smallerSpan) {
        smallerSpan.style.display = 'none';
      }
    }
  }
}

// Apply non-group member styling to profile box elements
function applyNonGroupMemberStylingToProfile(profileBox, displayMode) {
  // Find all elements that need styling
  const rankElement = profileBox.querySelector('.user-rank span');
  const usernameElement = profileBox.querySelector('.rated-user');
  const ratingElements = profileBox.querySelectorAll('li');
  
  // Apply styling to rank
  if (rankElement) {
    handleNonGroupMember(rankElement, displayMode);
  }
  
  // Username is already handled by the standard process
  
  // Handle contest rating
  for (const li of ratingElements) {
    if (li.textContent.includes('Contest rating:')) {
      const ratingSpan = li.querySelector('span.user-orange, span.user-red, span.user-blue, span.user-green, span.user-gray, span.user-violet, span.user-cyan, span.user-legendary');
      if (ratingSpan) {
        handleNonGroupMember(ratingSpan, displayMode);
        
        // Hide max rating as requested
        const smallerSpan = li.querySelector('.smaller');
        if (smallerSpan) {
          smallerSpan.style.display = 'none';
        }
      }
    }
  }
}

// Update the rating element in the sidebar
function updateSidebarRating(ratingElement, rating) {
  // Get rating info for this rating
  const ratingInfo = getRatingInfo(rating);
  
  // Remove all existing rating classes
  removeRatingClasses(ratingElement);
  
  // Add the appropriate class for the new rating
  ratingElement.classList.add(ratingInfo.cssClass);
  
  // Update the text content with the new rating
  ratingElement.textContent = rating.toString();
  
  // Set the color directly for additional assurance
  ratingElement.style.color = ratingInfo.color;
  
  // Add tooltip with rating information
  ratingElement.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name})`);
  ratingElement.classList.add('rshf-tooltip');
  
  // Find and update the "Rating:" label
  const ratingLabel = ratingElement.parentElement;
  if (ratingLabel && ratingLabel.innerHTML.includes('Rating:')) {
    // Add an indicator that this is an RSHF rating
    const labelText = ratingLabel.innerHTML.split('Rating:')[0] + 'RSHF Rating:';
    ratingLabel.innerHTML = labelText + '&nbsp;<span style="font-weight:bold;" class="' + 
      ratingInfo.cssClass + '" title="RSHF Rating: ' + rating + ' (' + ratingInfo.name + ')">' + 
      rating + '</span>';
  }
}

// Handle users not in the group in the sidebar
function handleSidebarNonGroupMember(ratingElement, userElement, displayMode) {
  // Use the same handleNonGroupMember function that we use for regular rated-user elements
  handleNonGroupMember(ratingElement, displayMode);
  
  // Also apply the same styling to the username element if it exists
  if (userElement) {
    handleNonGroupMember(userElement, displayMode);
  }
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
      // Check if the user has a rating (not null)
      if (ratingCache[username].rating !== null) {
        // Replace the element's class and text based on the new rating
        updateElementWithNewRating(element, ratingCache[username].rating);
      } else {
        // Handle users not in the group based on settings
        handleNonGroupMember(element, settings.nonMemberDisplay);
      }
    } else {
      // User not in cache - we don't have information yet
      // Do nothing or apply a "loading" state if desired
    }
  });
}

// Update element with new rating information
function updateElementWithNewRating(element, rating) {
  // Remove existing Codeforces rating classes
  removeRatingClasses(element);
  
  // Get rating information
  const ratingInfo = getRatingInfo(rating);
  
  // Add new rating class based on RSHF rating
  element.classList.add(ratingInfo.cssClass);
  
  // Set color directly as well (for additional assurance)
  element.style.color = ratingInfo.color;
  
  // Add tooltip with rating and rank information
  element.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name})`);
  element.classList.add('rshf-tooltip');
}

// Handle elements for users not in the selected group
function handleNonGroupMember(element, displayMode) {
  switch (displayMode) {
    case 'transparent':
      element.style.opacity = '0.5';
      break;
    case 'star':
      const originalText = element.textContent;
      element.textContent = originalText;
      const starSpan = document.createElement('span');
      starSpan.textContent = '*';
      starSpan.style.color = 'black';
      element.appendChild(starSpan);
      break;
    case 'strike-through':
      element.classList.add('rshf-strike-through');
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

// This function has been replaced by the imported rating-utils.js module

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
