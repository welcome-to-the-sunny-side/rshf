// Rating utilities - inlined from rating-utils.js
// RANK COLORS
const RANK_COLORS = {
  cheater     : '#8B4513',    // < -999999999 (brown)
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
  cheater     : 'user-cheater',
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
  if (rating < -999999999) return RANK_COLORS.cheater;
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
  if (rating < -999999999) return "Cheater";
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
  if (rating < -999999999) return RANK_CLASSES.cheater;
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

// Comment filtering: rank order for comparison
const RANK_ORDER = [
  "Cheater",
  "Newbie",
  "Pupil",
  "Specialist",
  "Expert",
  "Candidate Master",
  "Master",
  "International Master",
  "Grandmaster",
  "International Grandmaster",
  "Legendary Grandmaster"
];

// Main comment filtering function
function filterCommentsByRank(commentSettings) {
  // Helper: get rank index
  function getRankIndex(rank) {
    return RANK_ORDER.indexOf(rank);
  }

  // Helper: get assumed rating for a user
  function getAssumedRating(username, cfRating) {
    if (rshfSelectedGroupData && rshfSelectedGroupData[username]) {
      // In group
      if (commentSettings.groupAssumedRating === 'rshf') {
        return rshfSelectedGroupData[username][1];
      } else if (commentSettings.groupAssumedRating === 'official_cf' && cfRating !== undefined && cfRating !== null) {
        return cfRating;
      } else {
        return rshfSelectedGroupData[username][1];
      }
    } else {
      // Not in group
      if (commentSettings.nonMemberAssumedRating === 'newbie') {
        return 0; // Newbie
      } else if (commentSettings.nonMemberAssumedRating === 'official_cf' && cfRating !== undefined && cfRating !== null) {
        return cfRating;
      } else {
        return 0;
      }
    }
  }

  // For each .comment
  document.querySelectorAll('.comment').forEach(commentEl => {
    // Try to get username from .avatar .rated-user or .avatar a[title]
    let username = null;
    let cfRating = null;
    const avatarLink = commentEl.querySelector('.avatar .rated-user, .avatar a[title]');
    if (avatarLink) {
      // Username is always the last word in the title (e.g. "Newbie oaxplyn" or "Unrated, Conqueror_of_Dominater69")
      const title = avatarLink.getAttribute('title') || '';
      const match = title.match(/(?:\w+\s)?([\w-]+)$/);
      if (match) {
        username = match[1];
      }
      // Try to get CF rating from the class (user-*)
      const classList = avatarLink.classList;
      if (classList) {
        const rank = classList[1];
        if (rank === 'user-gray') cfRating = 0;
        else if (rank === 'user-green') cfRating = 1200;
        else if (rank === 'user-cyan') cfRating = 1400;
        else if (rank === 'user-blue') cfRating = 1600;
        else if (rank === 'user-violet') cfRating = 1900;
        else if (rank === 'user-orange') cfRating = 2100;
        else if (rank === 'user-red') cfRating = 2400;
        else if (rank === 'user-legendary') cfRating = 3000;
        else if (rank == 'user-4000') cfRating = 4000;
        else cfRating = 0;
      }
    }

    // If username not found, skip
    if (!username) return;
    // Get assumed rating and rank
    const assumedRating = getAssumedRating(username, cfRating);
    const userRank = getRankName(assumedRating);
    const userRankIdx = getRankIndex(userRank);
    const lowerboundIdx = getRankIndex(
      getRankNameForDropdownValue(commentSettings.rankLowerbound)
    );

    // Show or hide comment based on comparison
    const shownComment = commentEl.querySelector('.shown-comment');
    const hiddenComment = commentEl.querySelector('.hidden-comment');
    if (userRankIdx >= lowerboundIdx) {
      // Show
      if (shownComment) shownComment.style.display = '';
      if (hiddenComment) hiddenComment.style.display = 'none';
    } else {
      // Hide
      if (shownComment) shownComment.style.display = 'none';
      if (hiddenComment) hiddenComment.style.display = '';
    }
  });
}

// Blog Filtering: Remove blogs from recent actions if below threshold
function filterBlogsByRank(blogSettings) {
  // Helper: get rank index
  function getRankIndex(rank) {
    return RANK_ORDER.indexOf(rank);
  }
  // Helper: get assumed rating for a user
  function getAssumedRating(username, cfRating) {
    if (rshfSelectedGroupData && rshfSelectedGroupData[username]) {
      // In group
      if (blogSettings.groupAssumedRating === 'rshf') {
        return rshfSelectedGroupData[username][1];
      } else if (blogSettings.groupAssumedRating === 'official_cf' && cfRating !== undefined && cfRating !== null) {
        return cfRating;
      } else {
        return rshfSelectedGroupData[username][1];
      }
    } else {
      // Not in group
      if (blogSettings.nonMemberAssumedRating === 'newbie') {
        return 0; // Newbie
      } else if (blogSettings.nonMemberAssumedRating === 'official_cf' && cfRating !== undefined && cfRating !== null) {
        return cfRating;
      } else {
        return 0;
      }
    }
  }

  console.log(blogSettings);

  // Find all recent blog action <li> entries
  document.querySelectorAll('.recent-actions li').forEach(li => {
    const userLink = li.querySelector('a.rated-user');
    if (!userLink) return;
    // Username from link text or title
    let username = null;
    let cfRating = null;
    // Try to get username from title (e.g. "Pupil Otherwordly")
    const title = userLink.getAttribute('title') || '';
    const match = title.match(/(?:\w+\s)?([\w-]+)$/);
    if (match) {
      username = match[1];
    }
    // Map user class to rating leftbound
    const classList = userLink.classList;
    if (classList) {
      // Use same mapping as comment filtering
      const rank = Array.from(classList).find(cls => cls.startsWith('user-'));
      if (rank === 'user-gray') cfRating = 0;
      else if (rank === 'user-green') cfRating = 1200;
      else if (rank === 'user-cyan') cfRating = 1400;
      else if (rank === 'user-blue') cfRating = 1600;
      else if (rank === 'user-violet') cfRating = 1900;
      else if (rank === 'user-orange') cfRating = 2100;
      else if (rank === 'user-red') cfRating = 2400;
      else if (rank === 'user-legendary') cfRating = 3000;
      else if (rank == 'user-4000') cfRating = 4000;
      else cfRating = 0;
    }
    if (!username) return;
    const assumedRating = getAssumedRating(username, cfRating);
    const userRank = getRankName(assumedRating);
    const userRankIdx = getRankIndex(userRank);
    const lowerboundIdx = getRankIndex(getRankNameForDropdownValue(blogSettings.rankLowerbound));
    if (userRankIdx < lowerboundIdx) {
      // Remove blog entry
      li.remove();
    }
  });
}

// Map dropdown value to rank name (for legacy or display)
function getRankNameForDropdownValue(val) {
  switch (val) {
    case 'cheater': return 'Cheater';
    case 'newbie': return 'Newbie';
    case 'pupil': return 'Pupil';
    case 'specialist': return 'Specialist';
    case 'expert': return 'Expert';
    case 'candmaster': return 'Candidate Master';
    case 'master': return 'Master';
    case 'intmaster': return 'International Master';
    case 'grandmaster': return 'Grandmaster';
    case 'intgrandmaster': return 'International Grandmaster';
    case 'legend': return 'Legendary Grandmaster';
    default: return 'Newbie';
  }
}

// Initialize content script
(function() {
  initializeExtension();
})();

// Main initialization function
async function initializeExtension() {
  if (!window.location.hostname.includes('codeforces.com')) {
    return;
  }

  // Get selected group from storage
  const localData = await new Promise(resolve => {
    chrome.storage.local.get([
      'selectedGroup',
      'rshfRatingsData',
      'rshfRatingsFileTimestamp',
      // Comment filtering settings:
      'commentGroupAssumedRating',
      'commentNonMemberAssumedRating',
      'commentRankLowerbound',
      // Blog filtering settings:
      'blogGroupAssumedRating',
      'blogNonMemberAssumedRating',
      'blogRankLowerbound'
    ], resolve);
  });

  if (!localData.selectedGroup || !localData.selectedGroup.group_id) {
    return;
  }
  currentSelectedGroupId = localData.selectedGroup.group_id;

  if (localData.rshfRatingsData) {
    rshfAllGroupsData = localData.rshfRatingsData;
    rshfDataFileTimestamp = localData.rshfRatingsFileTimestamp;
    if (currentSelectedGroupId && rshfAllGroupsData[currentSelectedGroupId]) {
      rshfSelectedGroupData = rshfAllGroupsData[currentSelectedGroupId];
    } else {
      console.warn(`RSHF: Selected group data for '${currentSelectedGroupId}' not found in local ratings file.`);
      rshfSelectedGroupData = {}; // Avoid errors, treat as empty group
    }
  } else {
    console.warn('RSHF: Ratings data not found in local storage. Please refresh data via popup.');
    rshfAllGroupsData = {};
    rshfSelectedGroupData = {};
  }

  const settings = await getStoredSettings();

  // --- Comment Filtering ---
  const commentSettings = {
    groupAssumedRating: localData.commentGroupAssumedRating || 'rshf',
    nonMemberAssumedRating: localData.commentNonMemberAssumedRating || 'official_cf',
    rankLowerbound: localData.commentRankLowerbound || 'newbie'
  };
  // Only filter comments on blog entry pages
  if (window.location.href.startsWith('https://codeforces.com/blog/entry')) {
    filterCommentsByRank(commentSettings);
  }

  // --- Blog Filtering ---
  const blogSettings = {
    groupAssumedRating: localData.blogGroupAssumedRating || 'rshf',
    nonMemberAssumedRating: localData.blogNonMemberAssumedRating || 'official_cf',
    rankLowerbound: localData.blogRankLowerbound || 'newbie'
  };
  filterBlogsByRank(blogSettings);

  processPage(settings, localData.selectedGroup.group_name); // Pass group_name for display purposes
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
    
    // Remove any previous RSHF elements
    const existingRshfLi = profileBox.querySelector('.rshf-rating-li');
    if (existingRshfLi) existingRshfLi.remove();
    if (!rshfSelectedGroupData || !rshfSelectedGroupData[username]) {
        // User not found in memory data - apply non-member styling
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
