import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ExtensionSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';
import browser from 'webextension-polyfill';

/**
 * Options page component
 */
const OptionsPage = () => {
  return (
    <div>
      {/* The UI is implemented in HTML, this component mainly handles initialization */}
    </div>
  );
};

/**
 * Initialize preview examples with their respective colors
 */
function initializeColorExamples() {
  const exampleStyles = {
    'newbie-example': '#808080',
    'pupil-example': '#008000',
    'specialist-example': '#03A89E',
    'expert-example': '#0000ff',
    'cm-example': '#a0a',
    'master-example': '#FF8C00',
    'im-example': '#FF8C00',
    'gm-example': '#ff0000',
    'igm-example': '#ff0000',
    'lgm-example': '#ff0000',
    'no-rating-example': '#964B00'
  };

  Object.entries(exampleStyles).forEach(([id, color]) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.color = color;
    }
  });
}

/**
 * Update the examples based on the selected no-rating style
 */
function updateNoRatingExamples(style: string) {
  const noRatingExample = document.getElementById('no-rating-example');
  if (!noRatingExample) return;

  // Reset styles
  noRatingExample.removeAttribute('style');
  if (noRatingExample.textContent?.endsWith('*')) {
    noRatingExample.textContent = 'NoRating';
  }

  // Apply selected style
  switch (style) {
    case 'opacity':
      noRatingExample.style.color = '#0000ff'; // Example color (Expert)
      noRatingExample.style.opacity = '0.5';
      break;
    case 'strikethrough':
      noRatingExample.style.color = '#0000ff'; // Example color (Expert)
      noRatingExample.style.textDecoration = 'line-through';
      break;
    case 'brown':
      noRatingExample.style.color = '#964B00'; // Brown
      break;
    case 'asterisk':
      noRatingExample.style.color = '#0000ff'; // Example color (Expert)
      noRatingExample.textContent = 'NoRating*';
      break;
  }
}

/**
 * Show status message
 */
function showStatus(message: string, isError = false) {
  const status = document.getElementById('status');
  if (!status) return;

  status.textContent = message;
  status.className = isError ? 'error' : 'success';
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

/**
 * Initialize event listeners for the options page
 */
function initializeEventListeners() {
  // Group name input
  const groupNameInput = document.getElementById('group-name') as HTMLInputElement;
  
  // Toggle ratings checkbox
  const toggleRatings = document.getElementById('toggle-ratings') as HTMLInputElement;
  
  // No rating style select
  const noRatingStyle = document.getElementById('no-rating-style') as HTMLSelectElement;
  noRatingStyle?.addEventListener('change', (e) => {
    updateNoRatingExamples((e.target as HTMLSelectElement).value);
  });
  
  // Max replacements input
  const maxReplacements = document.getElementById('max-replacements') as HTMLInputElement;
  
  // Cache threshold input
  const cacheThreshold = document.getElementById('cache-threshold') as HTMLInputElement;
  
  // Save settings button
  const saveButton = document.getElementById('save-settings');
  saveButton?.addEventListener('click', async () => {
    try {
      const settings: ExtensionSettings = {
        group: groupNameInput?.value || '',
        showAlternativeRating: toggleRatings?.checked || true,
        noGroupRatingStyle: (noRatingStyle?.value || 'opacity') as any,
        maxReplacementsPerPage: parseInt(maxReplacements?.value || '2000', 10),
        cacheThresholdMinutes: parseInt(cacheThreshold?.value || '30', 10)
      };
      
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings
      });
      
      // Notify content scripts
      const tabs = await browser.tabs.query({ url: '*://*.codeforces.com/*' });
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
        }
      });
      
      showStatus('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings', true);
    }
  });
  
  // Clear cache button
  const clearCacheButton = document.getElementById('clear-cache');
  clearCacheButton?.addEventListener('click', async () => {
    try {
      await browser.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      showStatus('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      showStatus('Error clearing cache', true);
    }
  });
  
  // Restore defaults button
  const restoreDefaultsButton = document.getElementById('restore-defaults');
  restoreDefaultsButton?.addEventListener('click', async () => {
    try {
      // Reset form fields to defaults
      if (groupNameInput) groupNameInput.value = DEFAULT_SETTINGS.group;
      if (toggleRatings) toggleRatings.checked = DEFAULT_SETTINGS.showAlternativeRating;
      if (noRatingStyle) noRatingStyle.value = DEFAULT_SETTINGS.noGroupRatingStyle;
      if (maxReplacements) maxReplacements.value = DEFAULT_SETTINGS.maxReplacementsPerPage.toString();
      if (cacheThreshold) cacheThreshold.value = DEFAULT_SETTINGS.cacheThresholdMinutes.toString();
      
      // Update example
      updateNoRatingExamples(DEFAULT_SETTINGS.noGroupRatingStyle);
      
      // Don't automatically save to avoid confusion
      showStatus('Default settings restored. Click Save to apply.');
    } catch (error) {
      console.error('Error restoring defaults:', error);
      showStatus('Error restoring defaults', true);
    }
  });
}

// Initialize the options page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[RSHF-EXT] Options page loaded, initializing...');
  try {
    // Check if background script is available
    let retries = 0;
    const maxRetries = 3;
    let settings;
    
    while (retries < maxRetries) {
      try {
        // Load settings
        console.log('[RSHF-EXT] Attempting to load settings, attempt:', retries + 1);
        settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
        console.log('[RSHF-EXT] Settings loaded successfully:', settings);
        break;
      } catch (err) {
        console.warn(`[RSHF-EXT] Failed to load settings, attempt ${retries + 1}:`, err);
        retries++;
        if (retries >= maxRetries) {
          throw err;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Set form values
    const groupNameInput = document.getElementById('group-name') as HTMLInputElement;
    if (groupNameInput) groupNameInput.value = settings.group;
    
    const toggleRatings = document.getElementById('toggle-ratings') as HTMLInputElement;
    if (toggleRatings) toggleRatings.checked = settings.showAlternativeRating;
    
    const noRatingStyle = document.getElementById('no-rating-style') as HTMLSelectElement;
    if (noRatingStyle) noRatingStyle.value = settings.noGroupRatingStyle;
    
    const maxReplacements = document.getElementById('max-replacements') as HTMLInputElement;
    if (maxReplacements) maxReplacements.value = settings.maxReplacementsPerPage.toString();
    
    const cacheThreshold = document.getElementById('cache-threshold') as HTMLInputElement;
    if (cacheThreshold) cacheThreshold.value = settings.cacheThresholdMinutes.toString();
    
    // Initialize color examples
    initializeColorExamples();
    
    // Initialize no-rating example
    updateNoRatingExamples(settings.noGroupRatingStyle);
    
    // Initialize event listeners
    initializeEventListeners();
  } catch (error) {
    console.error('Error initializing options page:', error);
    showStatus('Error loading settings', true);
  }
});

// Render Preact component
render(<OptionsPage />, document.body);
