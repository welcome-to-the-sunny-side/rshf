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
  { y1: 3000, y2: 5000, color: RANK_COLORS.legend } // y2 determined dynamically
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

// Global variables for RSHF ratings data
let rshfAllGroupsData = null;
let rshfSelectedGroupData = null; // Data for the currently selected group
let rshfDataFileTimestamp = null; // Timestamp from the data file itself
let currentSelectedGroupId = null;

// Initialize content script
(function() {
  console.log('RSHF Codeforces Rating extension initialized');
  initializeExtension();
})();

// Main initialization function
async function initializeExtension() {
  if (!window.location.hostname.includes('codeforces.com')) {
    return;
  }

  const authState = await getAuthState();
  if (!authState.isAuthenticated) {
    console.log('RSHF: User not authenticated.');
    addExtensionStatusIndicator('not-logged-in');
    return;
  }
  
  if (!authState.selectedGroup || !authState.selectedGroup.group_id) {
    console.log('RSHF: No group selected.');
    addExtensionStatusIndicator('no-group-selected');
    return;
  }
  currentSelectedGroupId = authState.selectedGroup.group_id;

  // Load RSHF ratings data from chrome.storage.local
  const storedData = await new Promise(resolve => {
    chrome.storage.local.get(['rshfRatingsData', 'rshfRatingsFileTimestamp'], result => resolve(result));
  });

  if (storedData.rshfRatingsData) {
    rshfAllGroupsData = storedData.rshfRatingsData;
    rshfDataFileTimestamp = storedData.rshfRatingsFileTimestamp;
    if (currentSelectedGroupId && rshfAllGroupsData[currentSelectedGroupId]) {
      rshfSelectedGroupData = rshfAllGroupsData[currentSelectedGroupId];
    } else {
      console.warn(`RSHF: Selected group data for '${currentSelectedGroupId}' not found in local ratings file.`);
      rshfSelectedGroupData = {}; // Avoid errors, treat as empty group
    }
  } else {
    console.warn('RSHF: Ratings data not found in local storage. Please refresh data via popup.');
    // Potentially show a different status or try to trigger a refresh if robust error handling is needed.
    // For now, proceed with empty data; replacements won't happen.
    rshfAllGroupsData = {};
    rshfSelectedGroupData = {};
  }
  
  const settings = await getStoredSettings();
  addExtensionStatusIndicator('active');
  processPage(settings, authState.selectedGroup.group_name); // Pass group_name for display purposes
}

// Add a small indicator to show the extension status
function addExtensionStatusIndicator(status) {
  let indicator = document.getElementById('rshf-status-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'rshf-status-indicator';
    document.body.appendChild(indicator);

    // Add styles for the indicator
    const style = document.createElement('style');
    style.textContent = `
      #rshf-status-indicator {
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        cursor: pointer;
        transition: opacity 0.3s ease-in-out;
      }
      #rshf-status-indicator.active {
        background-color: #4CAF50; /* Green */
        color: white;
      }
      #rshf-status-indicator.not-logged-in, 
      #rshf-status-indicator.no-group-selected {
        background-color: #f44336; /* Red */
        color: white;
      }
      #rshf-status-indicator:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);

    // Add click listener to open popup
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });
  }

  indicator.className = status; // Reset classes and apply current status
  switch (status) {
    case 'active':
      indicator.textContent = 'RSHF Active';
      break;
    case 'not-logged-in':
      indicator.textContent = 'RSHF: Login Required';
      break;
    case 'no-group-selected':
      indicator.textContent = 'RSHF: Select Group';
      break;
    default:
      indicator.textContent = 'RSHF';
      break;
  }
}

// Process Codeforces page to replace ratings
async function processPage(settings, group_display_name) { // Added group_display_name
  const userElements = document.querySelectorAll(
    '.rated-user'
  );
  
  if (userElements.length === 0 || !rshfSelectedGroupData) {
    return; 
  }
  // No need to extract usernames or fetch, data is already loaded
  replaceRatings(userElements, settings);
  processProfileSidebar(settings, group_display_name);
  
  if (window.location.pathname.startsWith('/profile/')) {
    processProfileBox(settings, group_display_name);
  }
}

// Process profile sidebar to replace rating
async function processProfileSidebar(settings, group_display_name) {
  // Find the sidebar rating element robustly
  const sidebarLi = Array.from(document.querySelectorAll('.personal-sidebar ul.propertyLinks li')).find(li => li.textContent.includes('Rating:'));
  const sidebarRatingSpan = sidebarLi ? sidebarLi.querySelector('span[class^="user-"]') : null;
  const sidebarUserLink = document.querySelector('.personal-sidebar .for-avatar a.rated-user');

  if (!sidebarRatingSpan || !sidebarUserLink || !rshfSelectedGroupData) return;

  const username = sidebarUserLink.textContent.trim();
  const userData = rshfSelectedGroupData[username]; // Format: [cf_handle, rating]

  if (userData && userData[1] !== undefined && userData[1] !== null) {
    const rating = userData[1];
    const maxRating = userData[2];
    if (settings.inGroupDisplay === 'official_cf') {
      // Keep official CF rating
    } else {
      // Replace rating, color, class, and add tooltip
      removeRatingClasses(sidebarRatingSpan);
      const ratingInfo = getRatingInfo(rating);
      sidebarRatingSpan.textContent = rating;
      sidebarRatingSpan.classList.add(ratingInfo.cssClass);
      sidebarRatingSpan.style.color = ratingInfo.color;
      sidebarRatingSpan.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name}) (Group: ${group_display_name})`);
    }
  } else {
    // Not in group: apply non-member styling
    switch (settings.nonMemberDisplay) {
      case 'transparent':
        sidebarUserLink.classList.add('rshf-non-member-transparent');
        sidebarRatingSpan.classList.add('rshf-non-member-transparent');
        break;
      case 'strike-through':
        // Apply strike-through class without changing colors or other styles
        // This matches the original behavior shown in the example
        sidebarUserLink.classList.add('rshf-strike-through');
        sidebarRatingSpan.classList.add('rshf-strike-through');
        break;
      case 'newbie':
        removeRatingClasses(sidebarRatingSpan);
        sidebarRatingSpan.classList.add(RANK_CLASSES.newbie);
        sidebarRatingSpan.style.color = RANK_COLORS.newbie;
        break;
      case 'plain':
      default:
        break;
    }
  }
}


// Process the profile box on the profile page
async function processProfileBox(settings, group_display_name) {
  const profileBox = document.querySelector('.info');
  if (!profileBox) return;
  
  // Find all the relevant elements
  const mainUserHandleElement = profileBox.querySelector('h1 a.rated-user');
  const userRankSpan = profileBox.querySelector('.user-rank span');
  const ratingLiElement = Array.from(profileBox.querySelectorAll('ul li')).find(li => 
    li.textContent.includes('Contest rating:'));
  const ratingSpanElement = ratingLiElement?.querySelector('span[class^="user-"]');
  
  if (!mainUserHandleElement) return;
  
  // Get the username
  const username = mainUserHandleElement.textContent.trim();
  
  // Only on /profile pages: fetch data from API
  if (window.location.pathname.startsWith('/profile/')) {
    console.log(`RSHF: Processing profile for ${username}`);
    
    // Remove any previous RSHF elements
    const existingRshfLi = profileBox.querySelector('.rshf-rating-li');
    if (existingRshfLi) existingRshfLi.remove();
    if (!rshfSelectedGroupData || !rshfSelectedGroupData[username]) {
        // User not found in memory data - apply non-member styling
        console.log('RSHF: User not in group (checked in memory), applying non-member styling');
        const maxRatingSpans = ratingLiElement?.querySelectorAll('.smaller span');
        //Apply class to non-group members according to settings, using no hardcoded values
        switch (settings.nonMemberDisplay) {
            case 'transparent':
              mainUserHandleElement.classList.add('rshf-non-member-transparent');
              if (userRankSpan) userRankSpan.classList.add('rshf-non-member-transparent');
              if (ratingSpanElement) ratingSpanElement.classList.add('rshf-non-member-transparent');
              // Also strike-through the max rating spans if present
              if (maxRatingSpans) maxRatingSpans.forEach(span => span.classList.add('rshf-non-member-transparent'));
              break;
            case 'strike-through':
              mainUserHandleElement.classList.add('rshf-strike-through');
              if (userRankSpan) userRankSpan.classList.add('rshf-strike-through');
              if (ratingSpanElement) ratingSpanElement.classList.add('rshf-strike-through');
              // Also strike-through the max rating spans if present
              if (maxRatingSpans) maxRatingSpans.forEach(span => span.classList.add('rshf-strike-through'));
              break;
            case 'newbie':
              removeRatingClasses(mainUserHandleElement);
              mainUserHandleElement.classList.add(RANK_CLASSES.newbie);
              if (userRankSpan) userRankSpan.classList.add(RANK_CLASSES.newbie);
              if (ratingSpanElement) ratingSpanElement.classList.add(RANK_CLASSES.newbie);
              // Also strike-through the max rating spans if present
              if (maxRatingSpans) maxRatingSpans.forEach(span => span.classList.add('user-gray'));
              break;
            case 'plain':
            default:
              break;
          }
          return;
        }
    
      const rating = rshfSelectedGroupData[username][1];
      const maxRating = rshfSelectedGroupData[username][2];
      const groupName = group_display_name;
      console.log(rshfSelectedGroupData[username]);

      console.log(`RSHF: User ${username} has rating ${rating} and max rating ${maxRating} in group ${groupName}`);
      
      const ratingInfo = getRatingInfo(rating);

      if (settings.inGroupDisplay !== 'official_cf') {
        removeRatingClasses(userRankSpan);
        userRankSpan.textContent = ratingInfo.name;
        userRankSpan.classList.add(ratingInfo.cssClass);
        userRankSpan.style.color = ratingInfo.color;
      }
      
      // 4. Add a new list item for RSHF Rating (simple HTML matching the original example)
      let rshfLi = document.createElement('li');
      rshfLi.classList.add('rshf-rating-li');
      
      // Build HTML exactly matching the example format, with a link to the group
      let rshfHtml = `
        <img style="vertical-align:middle;margin-right:0.5em;" src="//codeforces.org/s/45865/images/icons/rating-24x24.png">
        RSHF Rating [<a href="https://rshf.net/group/${groupName}" target="_blank">${groupName}</a>]: 
        <span style="font-weight:bold;" class="${ratingInfo.cssClass}">${rating}</span>
      `;
      
      // Add max rating if available - format exactly like the example
      const maxRatingInfo = getRatingInfo(maxRating);
      rshfHtml += ` <span class="smaller">(max. <span style="font-weight:bold;" class="${maxRatingInfo.cssClass}">${maxRatingInfo.name}, </span> <span style="font-weight:bold;" class="${maxRatingInfo.cssClass}">${maxRating}</span>)</span>`;
      
      rshfLi.innerHTML = rshfHtml;
      
      // Modify the CF rating label text
      if (ratingLiElement) {
        // Get all text nodes in the rating element
        const textNodes = Array.from(ratingLiElement.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE);
        
        // Find the text node that contains "Contest rating:"
        const ratingTextNode = textNodes.find(node => 
          node.textContent.includes('Contest rating:'));
          
        if (ratingTextNode) {
          // Replace "Contest rating:" with "CF Rating:"
          ratingTextNode.textContent = ratingTextNode.textContent.replace(
            'Contest rating:', 'CF Rating:');
        }
      }
      
      // Insert before the contest rating li
      if (ratingLiElement && ratingLiElement.parentNode) {
        ratingLiElement.parentNode.insertBefore(rshfLi, ratingLiElement);
      } else if (profileBox.querySelector('ul')) {
        profileBox.querySelector('ul').appendChild(rshfLi);
      }
    return;
  }
  return;
}

// Replace ratings in the DOM elements
function replaceRatings(elements, settings) {
  if (!rshfSelectedGroupData) {
    console.warn("RSHF: No selected group data available for replacing ratings.");
    return;
  }

  elements.forEach(element => {
    // First clear any existing non-member styling
    element.style.opacity = '';
    
    const username = element.textContent.trim();
    const userData = rshfSelectedGroupData[username]; // Format: [cf_handle, rating]

    if (userData && userData[1] !== undefined && userData[1] !== null) {
      // User is in the group
      const rating = userData[1];
      const maxRating = userData[2];
      if (settings.inGroupDisplay === 'official_cf') {
        // Keep official CF rating
      } else {
        updateElementWithNewRating(element, rating, maxRating);
      }
    } else {
      // User is not in the group
      handleNonGroupMember(element, settings.nonMemberDisplay);
    }
  });
}

// Update element with new rating information
function updateElementWithNewRating(element, rating, maxRating = null) {
  removeRatingClasses(element);
  const ratingInfo = getRatingInfo(rating);
  element.classList.add(ratingInfo.cssClass);
  element.style.color = ratingInfo.color;
  element.setAttribute('data-rshf-tooltip', `RSHF Rating: ${rating} (${ratingInfo.name})`);
  element.classList.add('rshf-tooltip');
}

// Handle elements for users not in the selected group
function handleNonGroupMember(element, displayMode) {
  switch (displayMode) {
    case 'transparent':
      element.style.opacity = '0.5';
      break;
    case 'strike-through':
      // Make sure we're applying strike-through consistently
      element.classList.add('rshf-strike-through');
      // For rated users, maintain their original color but with strike-through
      // This ensures we match the original styling behavior
      break;
    case 'newbie':
      removeRatingClasses(element);
      element.classList.add(RANK_CLASSES.newbie);
      element.style.color = RANK_COLORS.newbie;
      break;
    case 'plain':
    default:
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
    chrome.storage.local.get(['nonMemberDisplay', 'inGroupDisplay'], result => {
      resolve({
        nonMemberDisplay: result.nonMemberDisplay || 'transparent',
        inGroupDisplay: result.inGroupDisplay || 'rshf' // Default to RSHF ratings
      });
    });
  });
}
