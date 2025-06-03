// DOM Elements
const groupInput = document.getElementById('group-input');
const setGroupButton = document.getElementById('set-group-button');
const nonMemberDisplay = document.getElementById('non-member-display');
const inGroupDisplay = document.getElementById('in-group-display');
const refreshRatingsBtn = document.getElementById('refreshRatingsBtn');
const refreshStatusEl = document.getElementById('refreshStatus');
const registerLink = document.getElementById('register-link');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  setGroupButton.addEventListener('click', handleGroupChange);
  nonMemberDisplay.addEventListener('change', handleDisplayChange);
  inGroupDisplay.addEventListener('change', handleDisplayChange);
  if (refreshRatingsBtn) {
    refreshRatingsBtn.addEventListener('click', handleForceRefreshRatings);
  }
  loadGroups();
  loadDisplayPreferences();
  updateRefreshStatusDisplay();
});

// Listen for messages from background script (e.g., when ratings are updated automatically)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ratingsUpdated') {
    updateRefreshStatusDisplay(message.fileTimestamp, message.refreshedAt);
  }
});

// Group change handler
function handleGroupChange() {
  const groupName = groupInput.value.trim();
  if (groupName) {
    // For stateless extension, just set the group directly
    const selectedGroup = {
      group_id: groupName,
      group_name: groupName
    };
    chrome.runtime.sendMessage({ action: 'setSelectedGroup', group: selectedGroup }, (response) => {
      if (response.success) {
        alert(`Group '${groupName}' selected successfully!`);
      } else {
        alert('Failed to set group. Please try again.');
      }
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
