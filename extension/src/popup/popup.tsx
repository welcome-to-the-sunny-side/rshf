import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ExtensionSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';
import browser from 'webextension-polyfill';

/**
 * Popup component for the extension
 */
const Popup = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({
    ...DEFAULT_SETTINGS
  });
  const [currentUser, setCurrentUser] = useState('TestUser');
  const [saveStatus, setSaveStatus] = useState('');

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
        setSettings(response);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Update example style when settings change
  useEffect(() => {
    updateExampleStyle();
  }, [settings]);

  // Update the example user's style based on selected style
  const updateExampleStyle = () => {
    const exampleUser = document.getElementById('example-user');
    if (!exampleUser) return;

    // Reset styles
    exampleUser.removeAttribute('style');
    if (exampleUser.textContent?.endsWith('*')) {
      exampleUser.textContent = exampleUser.textContent.slice(0, -1);
    }

    // Apply selected style
    switch (settings.noGroupRatingStyle) {
      case 'opacity':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.style.opacity = '0.5';
        break;
      case 'strikethrough':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.style.textDecoration = 'line-through';
        break;
      case 'brown':
        exampleUser.style.color = '#964B00'; // Brown
        break;
      case 'asterisk':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.textContent = 'tourist*';
        break;
    }
  };

  // Handle saving settings
  const saveSettings = async () => {
    try {
      await browser.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings
      });

      // Notify content scripts that settings have been updated
      const tabs = await browser.tabs.query({ url: '*://*.codeforces.com/*' });
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
        }
      });

      setSaveStatus('Settings saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Error saving settings');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Handle clearing cache
  const clearCache = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      setSaveStatus('Cache cleared!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      setSaveStatus('Error clearing cache');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Open options page
  const openOptions = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div>
      {/* Form is implemented in HTML, we're just adding event handlers here */}
      <div id="status-message" style={{ 
        display: saveStatus ? 'block' : 'none',
        padding: '8px',
        backgroundColor: '#4CAF50',
        color: 'white',
        borderRadius: '4px',
        marginBottom: '10px',
        textAlign: 'center'
      }}>
        {saveStatus}
      </div>
    </div>
  );
};

// Event listeners initialization function
function initializeEventListeners() {
  // Group name input
  const groupNameInput = document.getElementById('group-name') as HTMLInputElement;
  groupNameInput?.addEventListener('input', async (e) => {
    const settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
    settings.group = (e.target as HTMLInputElement).value;
    await browser.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings
    });
  });

  // Toggle ratings checkbox
  const toggleRatings = document.getElementById('toggle-ratings') as HTMLInputElement;
  toggleRatings?.addEventListener('change', async (e) => {
    const settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
    settings.showAlternativeRating = (e.target as HTMLInputElement).checked;
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
  });

  // No rating style select
  const noRatingStyle = document.getElementById('no-rating-style') as HTMLSelectElement;
  noRatingStyle?.addEventListener('change', async (e) => {
    const settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
    settings.noGroupRatingStyle = (e.target as HTMLSelectElement).value as any;
    await browser.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings
    });

    // Update example
    const exampleUser = document.getElementById('example-user');
    if (exampleUser) {
      // Reset styles
      exampleUser.removeAttribute('style');
      if (exampleUser.textContent?.endsWith('*')) {
        exampleUser.textContent = 'tourist';
      }

      // Apply selected style
      switch (settings.noGroupRatingStyle) {
        case 'opacity':
          exampleUser.style.color = '#0000ff'; // Example color (Expert)
          exampleUser.style.opacity = '0.5';
          break;
        case 'strikethrough':
          exampleUser.style.color = '#0000ff'; // Example color (Expert)
          exampleUser.style.textDecoration = 'line-through';
          break;
        case 'brown':
          exampleUser.style.color = '#964B00'; // Brown
          break;
        case 'asterisk':
          exampleUser.style.color = '#0000ff'; // Example color (Expert)
          exampleUser.textContent = 'tourist*';
          break;
      }
    }

    // Notify content scripts
    const tabs = await browser.tabs.query({ url: '*://*.codeforces.com/*' });
    tabs.forEach(tab => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
      }
    });
  });

  // Save settings button
  const saveSettingsBtn = document.getElementById('save-settings');
  saveSettingsBtn?.addEventListener('click', async () => {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Settings saved!';
      statusMessage.style.display = 'block';

      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 2000);
    }

    // Notify content scripts
    const tabs = await browser.tabs.query({ url: '*://*.codeforces.com/*' });
    tabs.forEach(tab => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
      }
    });
  });

  // Open options button
  const openOptionsBtn = document.getElementById('open-options');
  openOptionsBtn?.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  // Clear cache button
  const clearCacheBtn = document.getElementById('clear-cache');
  clearCacheBtn?.addEventListener('click', async () => {
    await browser.runtime.sendMessage({ type: 'CLEAR_CACHE' });

    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Cache cleared!';
      statusMessage.style.display = 'block';

      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 2000);
    }
  });

  // Options link
  const optionsLink = document.getElementById('options-link');
  optionsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  // Create status message element
  const statusMessage = document.createElement('div');
  statusMessage.id = 'status-message';
  statusMessage.style.display = 'none';
  statusMessage.style.padding = '8px';
  statusMessage.style.backgroundColor = '#4CAF50';
  statusMessage.style.color = 'white';
  statusMessage.style.borderRadius = '4px';
  statusMessage.style.marginBottom = '10px';
  statusMessage.style.textAlign = 'center';
  document.body.insertBefore(statusMessage, document.body.firstChild);

  // Load and apply settings
  const settings = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
  
  // Set initial values based on settings
  const groupNameInput = document.getElementById('group-name') as HTMLInputElement;
  if (groupNameInput) {
    groupNameInput.value = settings.group;
  }

  const toggleRatings = document.getElementById('toggle-ratings') as HTMLInputElement;
  if (toggleRatings) {
    toggleRatings.checked = settings.showAlternativeRating;
  }

  const noRatingStyle = document.getElementById('no-rating-style') as HTMLSelectElement;
  if (noRatingStyle) {
    noRatingStyle.value = settings.noGroupRatingStyle;
  }

  // Initialize event listeners
  initializeEventListeners();

  // Update example style
  const exampleUser = document.getElementById('example-user');
  if (exampleUser) {
    // Reset styles
    exampleUser.removeAttribute('style');
    if (exampleUser.textContent?.endsWith('*')) {
      exampleUser.textContent = 'tourist';
    }

    // Apply selected style
    switch (settings.noGroupRatingStyle) {
      case 'opacity':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.style.opacity = '0.5';
        break;
      case 'strikethrough':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.style.textDecoration = 'line-through';
        break;
      case 'brown':
        exampleUser.style.color = '#964B00'; // Brown
        break;
      case 'asterisk':
        exampleUser.style.color = '#0000ff'; // Example color (Expert)
        exampleUser.textContent = 'tourist*';
        break;
    }
  }
});

// Render the Popup component
render(<Popup />, document.body);
