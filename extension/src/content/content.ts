import { DomUtils } from '../utils/dom';
import { ExtensionSettings } from '../shared/types';

console.log('[RSHF-EXT] Content script loaded!');

// Hardcoded settings - don't try to load from storage
const HARDCODED_SETTINGS: ExtensionSettings = {
  group: 'abc',
  showAlternativeRating: true,
  noGroupRatingStyle: 'asterisk',
  maxReplacementsPerPage: 2000,
  cacheThresholdMinutes: 30
};

// Import rating utility functions (based on misc_info.md)
const getRatingColor = (rating: number): string => {
  if (rating < 0) return '#808080'; // Default for users without ratings
  if (rating < 1200) return '#808080'; // Newbie (gray)
  if (rating < 1400) return '#008000'; // Pupil (green)
  if (rating < 1600) return '#03A89E'; // Specialist (cyan)
  if (rating < 1900) return '#0000ff'; // Expert (blue)
  if (rating < 2100) return '#a0a'; // Candidate Master (violet)
  if (rating < 2300) return '#FF8C00'; // Master (orange)
  if (rating < 2400) return '#FF8C00'; // International Master (orange)
  if (rating < 2600) return '#ff0000'; // Grandmaster (red)
  if (rating < 3000) return '#ff0000'; // International Grandmaster (red)
  return '#ff0000'; // Legendary Grandmaster (red)
};

const getRankName = (rating: number): string => {
  if (rating < 0) return "Not Rated";
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
};

let isEnabled = true;
let observingDom = false;

/**
 * Initialize the content script
 */
function init() {
  console.log('Codeforces Alternative Rating extension initialized');
  
  // Use hardcoded settings
  const settings = HARDCODED_SETTINGS;
  
  // Add toggle button to the page
  addToggleButton();
  
  // Start MutationObserver to handle dynamically loaded content
  startObservingDom();
  
  // Process existing elements
  processPage();
  
  // No message listeners with hardcoded settings
}

/**
 * Process all rated users on the page
 */
function processPage() {
  // Return early if extension is disabled
  if (!isEnabled) return;
  
  console.log('Processing page with settings:', HARDCODED_SETTINGS);
  
  // Find all username elements
  const usernameElements = DomUtils.findUsernameElements();
  console.log(`[RSHF-EXT] Found ${usernameElements.length} username elements`);
  
  // Debug: Print a few of the found elements to see their structure
  if (usernameElements.length > 0) {
    console.log('[RSHF-EXT] Sample elements:', Array.from(usernameElements).slice(0, 3).map(el => ({
      text: el.textContent,
      classes: el.className,
      html: el.outerHTML
    })));
  }
  
  // Early return if no elements found
  if (usernameElements.length === 0) return;
  
  // Extract usernames
  const usernames = DomUtils.extractUsernames(usernameElements);
  console.log(`[RSHF-EXT] Found ${usernames.length} usernames:`, usernames.slice(0, 5), '...');
  
  // Return early if settings indicate not to show alternative ratings
  if (!HARDCODED_SETTINGS.showAlternativeRating) {
    console.log('[RSHF-EXT] Alternative ratings disabled in settings');
    // Reset all elements to original style
    Array.from(usernameElements).forEach(el => {
      DomUtils.resetElementStyle(el);
    });
    return;
  }
  
  // Generate random ratings for usernames (mock data)
  const ratingsMap: { [username: string]: number } = {};
  usernames.forEach(username => {
    // 80% chance of having a rating
    const hasRating = Math.random() < 0.8;
    ratingsMap[username] = hasRating ? Math.floor(Math.random() * 4000) : -1;
  });
  
  console.log('[RSHF-EXT] Generated mock ratings:', Object.entries(ratingsMap).slice(0, 5));
  
  // Apply ratings to elements
  Array.from(usernameElements).forEach((element, index) => {
    const username = usernames[index];
    if (!username) return;
    
    const rating = ratingsMap[username];
    const ratingInfo = {
      color: getRatingColor(rating),
      name: getRankName(rating)
    };
    
    DomUtils.applyRatingStyle(element, rating, ratingInfo, HARDCODED_SETTINGS);
  });
}

/**
 * Add a toggle button to the page to enable/disable the extension
 */
function addToggleButton() {
  const button = document.createElement('button');
  button.textContent = isEnabled ? 'Disable Alt Ratings' : 'Enable Alt Ratings';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 8px 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    opacity: 0.8;
  `;
  
  button.addEventListener('click', toggleExtension);
  document.body.appendChild(button);
}

/**
 * Toggle the extension on/off
 */
function toggleExtension() {
  isEnabled = !isEnabled;
  
  // Update button text
  const button = document.querySelector('button[style*="position: fixed"]');
  if (button) {
    button.textContent = isEnabled ? 'Disable Alt Ratings' : 'Enable Alt Ratings';
    (button as HTMLElement).style.background = isEnabled ? '#4CAF50' : '#F44336';
  }
  
  // Process or reset page
  if (isEnabled) {
    processPage();
  } else {
    // Reset all elements to original style
    const usernameElements = DomUtils.findUsernameElements();
    Array.from(usernameElements).forEach(el => {
      DomUtils.resetElementStyle(el);
    });
  }
}

/**
 * Start observing DOM changes to handle dynamically loaded content
 */
function startObservingDom() {
  if (observingDom) return;
  
  const observer = new MutationObserver((mutations) => {
    let hasRatedUsers = false;
    
    // Check if any of the mutations add elements with the rated-user class
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (node.classList?.contains('rated-user') || 
                node.querySelector('.rated-user')) {
              hasRatedUsers = true;
              break;
            }
          }
        }
      }
      
      if (hasRatedUsers) break;
    }
    
    // Process page if rated users were added
    if (hasRatedUsers && isEnabled) {
      processPage();
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  observingDom = true;
}

// Wait for document to be fully loaded
if (document.readyState === 'loading') {
  console.log('[RSHF-EXT] Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[RSHF-EXT] DOMContentLoaded fired, initializing...');
    // Run our code after a short delay to make sure everything is fully rendered
    setTimeout(() => {
      try {
        init();
        console.log('[RSHF-EXT] Initialization complete');
      } catch (error) {
        console.error('[RSHF-EXT] Initialization failed:', error);
      }
    }, 500);
  });
} else {
  console.log('[RSHF-EXT] Document already loaded, initializing...');
  // Run our code after a short delay to make sure everything is fully rendered
  setTimeout(() => {
    try {
      init();
      console.log('[RSHF-EXT] Initialization complete');
    } catch (error) {
      console.error('[RSHF-EXT] Initialization failed:', error);
    }
  }, 500);
}
