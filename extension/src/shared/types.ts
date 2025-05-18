// Type definitions for the extension

// User rating data structure
export interface UserRating {
  username: string;
  rating: number;
  lastUpdated: number; // timestamp
}

// Cache data structure
export interface CacheData {
  [username: string]: {
    rating: number;
    time: number; // timestamp when this data was fetched
  };
}

// Extension settings
export interface ExtensionSettings {
  group: string;
  showAlternativeRating: boolean; // toggle between alternative and official
  noGroupRatingStyle: 'opacity' | 'strikethrough' | 'brown' | 'asterisk';
  maxReplacementsPerPage: number;
  cacheThresholdMinutes: number;
}

// API response structure
export interface ApiResponse {
  users: {
    username: string;
    rating: number;
  }[];
}

// Rating info
export interface RatingInfo {
  color: string;
  name: string;
}
