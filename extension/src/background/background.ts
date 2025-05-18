import { CacheService } from '../utils/cache';
import { ApiService } from '../utils/api';
import browser from 'webextension-polyfill';

console.log('[RSHF-EXT] Background script initialized!');

// Notify that the background script is ready
self.postMessage({ type: 'BACKGROUND_READY' });

// Set up message listeners for communication with content scripts
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('[RSHF-EXT] Background script received message:', message);
  try {
  
  // Handle different message types
  switch (message.type) {
    case 'GET_RATINGS':
      // Request to get ratings for a list of usernames
      const usernames = message.usernames;
      const settings = await CacheService.getSettings();
      
      // Limit number of usernames based on settings
      const limitedUsernames = usernames.slice(0, settings.maxReplacementsPerPage);
      
      // Get ratings from cache/API
      const ratings = await CacheService.getRatings(limitedUsernames);
      return ratings;
      
    case 'CLEAR_CACHE':
      // Request to clear the cache
      await CacheService.clearCache();
      return { success: true };
      
    case 'GET_SETTINGS':
      // Request to get current settings
      return await CacheService.getSettings();
      
    case 'SAVE_SETTINGS':
      // Request to save settings
      await CacheService.saveSettings(message.settings);
      return { success: true };
  }
  
  return false;
  } catch (error: any) {
    console.error('[RSHF-EXT] Background script error:', error);
    return { error: error.message || 'Unknown error' };
  }
});

// Set up alarm for periodic cache cleanup (once a day)
browser.alarms.create('cleanupCache', { periodInMinutes: 24 * 60 });

// Listen for alarm events
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanupCache') {
    console.log('Running scheduled cache cleanup');
    const cache = await CacheService.getCache();
    const settings = await CacheService.getSettings();
    const now = Date.now();
    const maxAge = settings.cacheThresholdMinutes * 60 * 1000 * 7; // 7 times the threshold
    
    // Remove entries older than maxAge
    const updatedCache = { ...cache };
    let removedCount = 0;
    
    Object.entries(cache).forEach(([username, entry]) => {
      if (now - entry.time > maxAge) {
        delete updatedCache[username];
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      await browser.storage.local.set({ cache: updatedCache });
      console.log(`Removed ${removedCount} old cache entries`);
    }
  }
});
