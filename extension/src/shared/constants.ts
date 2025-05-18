// Shared constants for the extension

// Default settings
export const DEFAULT_SETTINGS = {
  group: '',
  showAlternativeRating: true,
  noGroupRatingStyle: 'opacity' as const,
  maxReplacementsPerPage: 2000,
  cacheThresholdMinutes: 30
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CACHE: 'cache',
  USER: 'user'
};

// Default user (until login is implemented)
export const DEFAULT_USER = 'TestUser';

// Codeforces DOM selectors
export const SELECTORS = {
  RATED_USER: '.rated-user'
};

// Special color for users without group ratings
export const NO_GROUP_RATING_COLOR = '#964B00'; // Brown

// API endpoints (will be replaced with real endpoints later)
export const API = {
  BASE_URL: 'https://api.example.com', // Placeholder
  GET_RATINGS: '/ratings'
};
