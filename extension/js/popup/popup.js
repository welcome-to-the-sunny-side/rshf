// DOM Elements
const groupInput = document.getElementById('group-input');
const setGroupButton = document.getElementById('set-group-button');
const nonMemberDisplay = document.getElementById('non-member-display');
const inGroupDisplay = document.getElementById('in-group-display');
const refreshRatingsBtn = document.getElementById('refreshRatingsBtn');
const refreshStatusEl = document.getElementById('refreshStatus');

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
  updateRefreshStatusDisplay();
});

// Setup custom dropdown functionality
function setupCustomDropdowns() {
  // In-group display dropdown
  inGroupDisplaySelected.addEventListener('click', () => {
    toggleDropdown(inGroupDisplayList);
  });
  
  // Add click listeners to each option in the in-group dropdown
  document.querySelectorAll('#in-group-display-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, inGroupDisplaySelected, inGroupDisplayList, inGroupDisplay);
    });
  });
  
  // Non-member display dropdown
  nonMemberDisplaySelected.addEventListener('click', () => {
    toggleDropdown(nonMemberDisplayList);
  });
  
  // Add click listeners to each option in the non-member dropdown
  document.querySelectorAll('#non-member-display-list .dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
      selectDropdownOption(option, nonMemberDisplaySelected, nonMemberDisplayList, nonMemberDisplay);
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-dropdown')) {
      inGroupDisplayList.style.display = 'none';
      nonMemberDisplayList.style.display = 'none';
    }
  });
}

// Toggle dropdown visibility
function toggleDropdown(dropdownList) {
  const isVisible = dropdownList.style.display === 'block';
  dropdownList.style.display = isVisible ? 'none' : 'block';
}

// Handle dropdown option selection
function selectDropdownOption(option, selectedElement, dropdownList, hiddenSelect) {
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
  handleDisplayChange();
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
    // Set values for hidden select elements
    if (result.nonMemberDisplay) {
      nonMemberDisplay.value = result.nonMemberDisplay;
      
      // Update the visible dropdown text and selected option
      const selectedOption = document.querySelector(`#non-member-display-list .dropdown-option[data-value="${result.nonMemberDisplay}"]`);
      if (selectedOption) {
        nonMemberDisplaySelected.textContent = selectedOption.textContent;
        
        // Update selected class
        document.querySelectorAll('#non-member-display-list .dropdown-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        selectedOption.classList.add('selected');
      }
    }
    
    // Set default for inGroupDisplay if not already set
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
