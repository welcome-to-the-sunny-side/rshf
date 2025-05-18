import { CacheData, ExtensionSettings } from '../shared/types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants';
import { ApiService } from './api';
import browser from 'webextension-polyfill';

/**
 * Handles caching and retrieval of user ratings
 */
export class CacheService {
  /**
   * Get cached ratings and determine which usernames need to be requested
   * @param usernames List of usernames to get ratings for
   * @returns Promise with usernames that need to be requested
   */
  static async getUsernamesToRequest(usernames: string[]): Promise<string[]> {
    const settings = await this.getSettings();
    const cache = await this.getCache();
    const now = Date.now();
    const threshold = settings.cacheThresholdMinutes * 60 * 1000; // convert to ms
    
    // Filter usernames that need to be requested:
    // 1. Not in cache
    // 2. Cache entry older than threshold
    return usernames.filter(username => {
      const cacheEntry = cache[username];
      return !cacheEntry || (now - cacheEntry.time > threshold);
    });
  }
  
  /**
   * Update cache with new ratings
   * @param userRatings Object mapping usernames to ratings
   */
  static async updateCache(userRatings: { [username: string]: number }): Promise<void> {
    const cache = await this.getCache();
    const now = Date.now();
    
    // Update cache with new data
    Object.entries(userRatings).forEach(([username, rating]) => {
      cache[username] = {
        rating,
        time: now
      };
    });
    
    // Save updated cache
    await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
  }
  
  /**
   * Get ratings for a list of usernames, using cache when possible
   * @param usernames List of usernames to get ratings for
   * @returns Promise with map of usernames to ratings
   */
  static async getRatings(usernames: string[]): Promise<{ [username: string]: number }> {
    const settings = await this.getSettings();
    const cache = await this.getCache();
    
    // Get usernames that need to be requested
    const usernamesToRequest = await this.getUsernamesToRequest(usernames);
    
    // If there are usernames to request, fetch them from API
    if (usernamesToRequest.length > 0) {
      const response = await ApiService.fetchRatings(
        usernamesToRequest,
        settings.group
      );
      
      // Update cache with new data
      const newRatings: { [username: string]: number } = {};
      response.users.forEach(user => {
        newRatings[user.username] = user.rating;
      });
      
      await this.updateCache(newRatings);
      
      // Refresh cache
      const updatedCache = await this.getCache();
      return this.getCachedRatings(usernames, updatedCache);
    }
    
    // If all usernames are in cache, return cached ratings
    return this.getCachedRatings(usernames, cache);
  }
  
  /**
   * Get ratings from cache
   * @param usernames List of usernames to get ratings for
   * @param cache Cache data
   * @returns Map of usernames to ratings
   */
  private static getCachedRatings(
    usernames: string[],
    cache: CacheData
  ): { [username: string]: number } {
    const ratings: { [username: string]: number } = {};
    
    usernames.forEach(username => {
      const cacheEntry = cache[username];
      ratings[username] = cacheEntry ? cacheEntry.rating : -1;
    });
    
    return ratings;
  }
  
  /**
   * Get the current cache
   * @returns Cache data
   */
  static async getCache(): Promise<CacheData> {
    const result = await browser.storage.local.get(STORAGE_KEYS.CACHE);
    return result[STORAGE_KEYS.CACHE] || {};
  }
  
  /**
   * Clear the cache
   */
  static async clearCache(): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.CACHE]: {} });
  }
  
  /**
   * Get extension settings
   * @returns Extension settings
   */
  static async getSettings(): Promise<ExtensionSettings> {
    const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  }
  
  /**
   * Save extension settings
   * @param settings Settings to save
   */
  static async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updatedSettings });
  }
}
