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
// const REFRESH_INTERVAL_SECONDS = 2 * 60 * 60;
const REFRESH_INTERVAL_SECONDS = 60;
const REFRESH_ALARM_NAME = 'rshfRatingsRefreshAlarm';


// --- New Ratings Data Fetching and Management ---

async function fetchAndStoreRatings(forceBypass = true) {
  try {
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
    return { success: true, fileTimestamp: parsedData.timestamp, refreshedAt: dataToStore[STORAGE_KEY_LAST_REFRESHED_AT] };

  } catch (error) {
    console.error('RSHF Extension: Error fetching or processing ratings data:', error);
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



// --- Event Listeners ---

// On extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    await triggerRefresh(true); // Fetch data immediately on install/update
  }
  // Setup periodic alarm
  chrome.alarms.create(REFRESH_ALARM_NAME, {
    delayInMinutes: 1, // Start checking after 1 minute
    periodInMinutes: REFRESH_INTERVAL_SECONDS / 60
  });
});

// Handle alarm for periodic refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === REFRESH_ALARM_NAME) {
    await triggerRefresh();
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'setSelectedGroup':
      chrome.storage.local.get(STORAGE_KEY_RATINGS_DATA, (result) => {
        const allRatingsData = result[STORAGE_KEY_RATINGS_DATA];
        if (allRatingsData) {
          const groupNameKey = message.group.group_name; // Use the actual group name string
          const groupData = allRatingsData[groupNameKey]; // Access using the string key
          if (groupData) {
            const numberOfKeysInGroup = Object.keys(groupData).length;
            if (numberOfKeysInGroup > 0) {
              chrome.storage.local.set({ selectedGroup: message.group }, () => { 
                sendResponse({ success: true });
              });
            } else {
              sendResponse({ success: false, error: `Group '${groupNameKey}' not found or has no data.` });
            }
          } else {
            sendResponse({ success: false, error: `Group '${groupNameKey}' not found or has no data.` });
          }
        } else {
          sendResponse({ success: false, error: `Group '${message.group.group_name}' not found or has no data.` });
        }
      });
      return true;
    case 'forceRefreshRatings':
      triggerRefresh().then(sendResponse);
      return true;
    case 'getRatingsTimestamps':
      chrome.storage.local.get([STORAGE_KEY_RATINGS_FILE_TIMESTAMP, STORAGE_KEY_LAST_REFRESHED_AT], result => {
        sendResponse({
          success: true,
          fileTimestamp: result[STORAGE_KEY_RATINGS_FILE_TIMESTAMP],
          lastRefreshedAt: result[STORAGE_KEY_LAST_REFRESHED_AT]
        });
      });
      return true;
    case 'openPopup':
      chrome.action.openPopup();
      return false;
    default:
      console.warn(`RSHF Extension: Received unknown message action: ${message.action}`);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});
