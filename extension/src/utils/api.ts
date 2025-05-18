import { ApiResponse } from '../shared/types';
import { API, DEFAULT_USER } from '../shared/constants';

/**
 * Mock API service for development
 * Will be replaced with actual API calls later
 */
export class ApiService {
  /**
   * Fetch ratings for a list of usernames in a specific group
   * @param usernames List of usernames to fetch ratings for
   * @param group Group name to fetch ratings from
   * @returns Promise with user ratings
   */
  static async fetchRatings(usernames: string[], group: string): Promise<ApiResponse> {
    // This is a mock implementation that generates random ratings
    console.log(`Fetching ratings for ${usernames.length} users in group "${group}"`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock data
    const users = usernames.map(username => {
      // Randomly decide if a user is part of the group (80% chance)
      const isInGroup = Math.random() < 0.8;
      
      return {
        username,
        // Generate random rating between 0-4000 if in group, otherwise null
        rating: isInGroup ? Math.floor(Math.random() * 4000) : -1
      };
    });
    
    return { users };
  }
  
  /**
   * Get the currently logged in user
   * For now, it's always TestUser
   */
  static getCurrentUser(): string {
    return DEFAULT_USER;
  }
}
