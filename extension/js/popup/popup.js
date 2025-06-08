// DOM Elements
const groupInput = document.getElementById('group-input');
const setGroupButton = document.getElementById('set-group-button');
const nonMemberDisplay = document.getElementById('non-member-display');
const inGroupDisplay = document.getElementById('in-group-display');
const refreshRatingsBtn = document.getElementById('refreshRatingsBtn');
const refreshStatusEl = document.getElementById('refreshStatus');

// --- Comment Filtering Settings DOM Elements ---
const commentGroupAssumedRating = document.getElementById('comment-group-assumed-rating');
const commentNonMemberAssumedRating = document.getElementById('comment-non-member-assumed-rating');
const commentRankLowerbound = document.getElementById('comment-rank-lowerbound');

const commentGroupAssumedRatingSelected = document.getElementById('comment-group-assumed-rating-selected');
const commentGroupAssumedRatingList = document.getElementById('comment-group-assumed-rating-list');
const commentNonMemberAssumedRatingSelected = document.getElementById('comment-non-member-assumed-rating-selected');
const commentNonMemberAssumedRatingList = document.getElementById('comment-non-member-assumed-rating-list');
const commentRankLowerboundSelected = document.getElementById('comment-rank-lowerbound-selected');
const commentRankLowerboundList = document.getElementById('comment-rank-lowerbound-list');

// --- Blog Filtering Settings DOM Elements ---
const blogGroupAssumedRating = document.getElementById('blog-group-assumed-rating');
const blogNonMemberAssumedRating = document.getElementById('blog-non-member-assumed-rating');
const blogRankLowerbound = document.getElementById('blog-rank-lowerbound');

const blogGroupAssumedRatingSelected = document.getElementById('blog-group-assumed-rating-selected');
const blogGroupAssumedRatingList = document.getElementById('blog-group-assumed-rating-list');
const blogNonMemberAssumedRatingSelected = document.getElementById('blog-non-member-assumed-rating-selected');
const blogNonMemberAssumedRatingList = document.getElementById('blog-non-member-assumed-rating-list');
const blogRankLowerboundSelected = document.getElementById('blog-rank-lowerbound-selected');
const blogRankLowerboundList = document.getElementById('blog-rank-lowerbound-list');

// Custom dropdown elements
const inGroupDisplaySelected = document.getElementById('in-group-display-selected');
const inGroupDisplayList = document.getElementById('in-group-display-list');
const nonMemberDisplaySelected = document.getElementById('non-member-display-selected');
const nonMemberDisplayList = document.getElementById('non-member-display-list');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Standard button handlers
  setGroupButton.addEventListener('click', handleGroupChange);
  if (refreshRatingsBtn) {
    refreshRatingsBtn.addEventListener('click', handleForceRefreshRatings);
  }
  
  // Setup custom dropdowns
  setupCustomDropdowns();
  
  // Load saved data
  loadGroups();
  loadDisplayPreferences();
  loadCommentFilteringPreferences();
  loadBlogFilteringPreferences();
  updateRefreshStatusDisplay();
});

// Setup custom dropdown functionality
// Note: :holyf: non-member display mode is handled generically here
function setupCustomDropdowns() {
  // In-group display dropdown
  inGroupDisplaySelected.addEventListener('click', () => {
    toggleDropdown(inGroupDisplayList);
  });
  document.querySelectorAll('#in-group-display-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, inGroupDisplaySelected, inGroupDisplayList, inGroupDisplay);
    });
  });

  // Non-member display dropdown
  nonMemberDisplaySelected.addEventListener('click', () => {
    toggleDropdown(nonMemberDisplayList);
  });
  document.querySelectorAll('#non-member-display-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, nonMemberDisplaySelected, nonMemberDisplayList, nonMemberDisplay);
    });
  });

  // --- Comment Filtering Dropdowns ---
  commentGroupAssumedRatingSelected.addEventListener('click', () => {
    toggleDropdown(commentGroupAssumedRatingList);
  });
  document.querySelectorAll('#comment-group-assumed-rating-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, commentGroupAssumedRatingSelected, commentGroupAssumedRatingList, commentGroupAssumedRating, handleCommentFilteringChange);
    });
  });

  commentNonMemberAssumedRatingSelected.addEventListener('click', () => {
    toggleDropdown(commentNonMemberAssumedRatingList);
  });
  document.querySelectorAll('#comment-non-member-assumed-rating-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, commentNonMemberAssumedRatingSelected, commentNonMemberAssumedRatingList, commentNonMemberAssumedRating, handleCommentFilteringChange);
    });
  });

  commentRankLowerboundSelected.addEventListener('click', () => {
    toggleDropdown(commentRankLowerboundList);
  });
  document.querySelectorAll('#comment-rank-lowerbound-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, commentRankLowerboundSelected, commentRankLowerboundList, commentRankLowerbound, handleCommentFilteringChange);
    });
  });

  // --- Blog Filtering Dropdowns ---
  blogGroupAssumedRatingSelected.addEventListener('click', () => {
    toggleDropdown(blogGroupAssumedRatingList);
  });
  document.querySelectorAll('#blog-group-assumed-rating-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, blogGroupAssumedRatingSelected, blogGroupAssumedRatingList, blogGroupAssumedRating, handleBlogFilteringChange);
    });
  });

  blogNonMemberAssumedRatingSelected.addEventListener('click', () => {
    toggleDropdown(blogNonMemberAssumedRatingList);
  });
  document.querySelectorAll('#blog-non-member-assumed-rating-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, blogNonMemberAssumedRatingSelected, blogNonMemberAssumedRatingList, blogNonMemberAssumedRating, handleBlogFilteringChange);
    });
  });

  blogRankLowerboundSelected.addEventListener('click', () => {
    toggleDropdown(blogRankLowerboundList);
  });
  document.querySelectorAll('#blog-rank-lowerbound-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, blogRankLowerboundSelected, blogRankLowerboundList, blogRankLowerbound, handleBlogFilteringChange);
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-dropdown')) {
      inGroupDisplayList.style.display = 'none';
      nonMemberDisplayList.style.display = 'none';
      commentGroupAssumedRatingList.style.display = 'none';
      commentNonMemberAssumedRatingList.style.display = 'none';
      commentRankLowerboundList.style.display = 'none';
      blogGroupAssumedRatingList.style.display = 'none';
      blogNonMemberAssumedRatingList.style.display = 'none';
      blogRankLowerboundList.style.display = 'none';
    }
  });
}

// Toggle dropdown visibility
function toggleDropdown(dropdownList) {
  const isVisible = dropdownList.style.display === 'block';
  dropdownList.style.display = isVisible ? 'none' : 'block';
}

// Handle dropdown option selection
function selectDropdownOption(option, selectedElement, dropdownList, hiddenSelect, customHandler) {
  // Update the visible selected text
  selectedElement.textContent = option.textContent;
  
  // Update the hidden select element
  hiddenSelect.value = option.dataset.value;
  
  // Update selected class
  option.parentElement.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  option.classList.add('selected');
  
  // Hide the dropdown
  dropdownList.style.display = 'none';
  
  // Trigger change event on the hidden select
  const event = new Event('change');
  hiddenSelect.dispatchEvent(event);
  
  // Save the selection
  if (typeof customHandler === 'function') {
    customHandler();
  } else {
    handleDisplayChange();
  }
}

// Listen for messages from background script (e.g., when ratings are updated automatically)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ratingsUpdated') {
    updateRefreshStatusDisplay(message.fileTimestamp, message.refreshedAt);
  }
});

// Group change handler
function handleGroupChange() {
  const groupName = groupInput.value.trim();
  const formGroup = groupInput.closest('.form-group');
  const prevFeedback = formGroup.previousElementSibling;
  if (prevFeedback && (prevFeedback.classList.contains('api-success') || prevFeedback.classList.contains('api-error'))) {
    prevFeedback.remove();
  }

  if (groupName) {
    // For stateless extension, just set the group directly
    const selectedGroup = {
      group_id: groupName,
      group_name: groupName
    };
    chrome.runtime.sendMessage({ action: 'setSelectedGroup', group: selectedGroup }, (response) => {
      const feedback = document.createElement('div');
      if (response.success) {
        feedback.className = 'api-success';
        feedback.textContent = `Group '${groupName}' selected!`;
      } else {
        feedback.className = 'api-error';
        feedback.textContent = `Failed to set group. Please try again.`;
      }
      formGroup.parentNode.insertBefore(feedback, formGroup);
      setTimeout(() => {
        if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
      }, 2200);
    });
  } else {
    const feedback = document.createElement('div');
    feedback.className = 'api-error';
    feedback.textContent = `Please enter a group name`;
    formGroup.parentNode.insertBefore(feedback, formGroup);
    setTimeout(() => {
      if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
    }, 2200);
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

// --- Comment Filtering Change Handler ---
function handleCommentFilteringChange() {
  chrome.storage.local.set({
    commentGroupAssumedRating: commentGroupAssumedRating.value,
    commentNonMemberAssumedRating: commentNonMemberAssumedRating.value,
    commentRankLowerbound: commentRankLowerbound.value
  });
}

// --- Blog Filtering Change Handler ---
function handleBlogFilteringChange() {
  chrome.storage.local.set({
    blogGroupAssumedRating: blogGroupAssumedRating.value,
    blogNonMemberAssumedRating: blogNonMemberAssumedRating.value,
    blogRankLowerbound: blogRankLowerbound.value
  });
}

// Load previously selected group if any
function loadGroups() {
  chrome.storage.local.get(['selectedGroup'], (result) => {
    if (result.selectedGroup) {
      groupInput.value = result.selectedGroup.group_name;
    } else {
    //   groupInput.value = 'main';
    }
  });
}

// Load display preferences
function loadDisplayPreferences() {
    chrome.storage.local.get(['nonMemberDisplay', 'inGroupDisplay'], (result) => {
      // Set values for hidden select elements
      const nonMemberValue = result.nonMemberDisplay || 'newbie'; // Default to 'newbie' (Gray)
      nonMemberDisplay.value = nonMemberValue;
      
      // Update the visible dropdown text and selected option
      const selectedOption = document.querySelector(`#non-member-display-list .dropdown-option[data-value="${nonMemberValue}"]`);
      if (selectedOption) {
        nonMemberDisplaySelected.textContent = selectedOption.textContent;
        
        // Update selected class
        document.querySelectorAll('#non-member-display-list .dropdown-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        selectedOption.classList.add('selected');
      }
      
      // Handle inGroupDisplay similarly with a default
      const inGroupValue = result.inGroupDisplay || 'rshf';
      inGroupDisplay.value = inGroupValue;
      
      // Update the visible dropdown text and selected option
      const selectedInGroupOption = document.querySelector(`#in-group-display-list .dropdown-option[data-value="${inGroupValue}"]`);
      if (selectedInGroupOption) {
        inGroupDisplaySelected.textContent = selectedInGroupOption.textContent;
        
        // Update selected class
        document.querySelectorAll('#in-group-display-list .dropdown-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        selectedInGroupOption.classList.add('selected');
      }
    });
}

// --- Load Blog Filtering Preferences ---
function loadBlogFilteringPreferences() {
  chrome.storage.local.get([
    'blogGroupAssumedRating',
    'blogNonMemberAssumedRating',
    'blogRankLowerbound'
  ], (result) => {
    // Group assumed rating
    const groupValue = result.blogGroupAssumedRating || 'rshf';
    blogGroupAssumedRating.value = groupValue;
    const selectedGroupOption = document.querySelector(`#blog-group-assumed-rating-list .dropdown-option[data-value="${groupValue}"]`);
    if (selectedGroupOption) {
      blogGroupAssumedRatingSelected.textContent = selectedGroupOption.textContent;
      document.querySelectorAll('#blog-group-assumed-rating-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedGroupOption.classList.add('selected');
    }

    // Non-member assumed rating
    const nonMemberValue = result.blogNonMemberAssumedRating || 'official_cf';
    blogNonMemberAssumedRating.value = nonMemberValue;
    const selectedNonMemberOption = document.querySelector(`#blog-non-member-assumed-rating-list .dropdown-option[data-value="${nonMemberValue}"]`);
    if (selectedNonMemberOption) {
      blogNonMemberAssumedRatingSelected.textContent = selectedNonMemberOption.textContent;
      document.querySelectorAll('#blog-non-member-assumed-rating-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedNonMemberOption.classList.add('selected');
    }

    // Rank lowerbound
    const lowerboundValue = result.blogRankLowerbound || 'newbie';
    blogRankLowerbound.value = lowerboundValue;
    const selectedRankOption = document.querySelector(`#blog-rank-lowerbound-list .dropdown-option[data-value="${lowerboundValue}"]`);
    if (selectedRankOption) {
      blogRankLowerboundSelected.textContent = selectedRankOption.textContent;
      document.querySelectorAll('#blog-rank-lowerbound-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedRankOption.classList.add('selected');
    }
  });
}

// --- Load Comment Filtering Preferences ---
function loadCommentFilteringPreferences() {
  chrome.storage.local.get([
    'commentGroupAssumedRating',
    'commentNonMemberAssumedRating',
    'commentRankLowerbound'
  ], (result) => {
    // Group assumed rating
    const groupValue = result.commentGroupAssumedRating || 'rshf';
    commentGroupAssumedRating.value = groupValue;
    const selectedGroupOption = document.querySelector(`#comment-group-assumed-rating-list .dropdown-option[data-value="${groupValue}"]`);
    if (selectedGroupOption) {
      commentGroupAssumedRatingSelected.textContent = selectedGroupOption.textContent;
      document.querySelectorAll('#comment-group-assumed-rating-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedGroupOption.classList.add('selected');
    }

    // Non-member assumed rating
    const nonMemberValue = result.commentNonMemberAssumedRating || 'official_cf';
    commentNonMemberAssumedRating.value = nonMemberValue;
    const selectedNonMemberOption = document.querySelector(`#comment-non-member-assumed-rating-list .dropdown-option[data-value="${nonMemberValue}"]`);
    if (selectedNonMemberOption) {
      commentNonMemberAssumedRatingSelected.textContent = selectedNonMemberOption.textContent;
      document.querySelectorAll('#comment-non-member-assumed-rating-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedNonMemberOption.classList.add('selected');
    }

    // Rank lowerbound
    const lowerboundValue = result.commentRankLowerbound || 'newbie';
    commentRankLowerbound.value = lowerboundValue;
    const selectedRankOption = document.querySelector(`#comment-rank-lowerbound-list .dropdown-option[data-value="${lowerboundValue}"]`);
    if (selectedRankOption) {
      commentRankLowerboundSelected.textContent = selectedRankOption.textContent;
      document.querySelectorAll('#comment-rank-lowerbound-list .dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      selectedRankOption.classList.add('selected');
    }
  });
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
    refreshStatusEl.innerHTML = `Data from: ${formatTimestamp(fileTs)}<br>Last Pulled: ${formatTimestamp(refreshedAtTs)}`;
  } else {
    // Fetch current timestamps from storage
    chrome.runtime.sendMessage({ action: 'getRatingsTimestamps' }, (response) => {
      if (response && response.success) {
        refreshStatusEl.innerHTML = `Data from: ${formatTimestamp(response.fileTimestamp)}<br>Last Pulled: ${formatTimestamp(response.lastRefreshedAt)}`;
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
      refreshStatusEl.innerHTML = `Refreshed!<br>Data from: ${formatTimestamp(response.fileTimestamp)}<br>Last Pulled: ${formatTimestamp(response.refreshedAt)}`;
    } else {
      refreshStatusEl.textContent = `Error refreshing: ${response.error || 'Unknown error'}`;
    }
    refreshRatingsBtn.disabled = false;
  });
}
