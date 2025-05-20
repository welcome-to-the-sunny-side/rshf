# RSHF Codeforces Rating Extension Guide

## Overview

The RSHF Codeforces Rating Extension is a browser extension that replaces the standard Codeforces ratings, ranks, and handle colors with an alternative rating system from RSHF. The extension enhances the Codeforces user experience by showing RSHF ratings which are stored in the RSHF back-end and fetched through API calls.

## Key Features

- **Rating Replacement**: Replaces Codeforces user handle colors and ratings with RSHF ratings
- **Group-specific Ratings**: Displays ratings specific to user-selected groups
- **Authentication**: Uses the same login mechanism as the RSHF website
- **Caching**: Implements an efficient caching strategy to minimize API calls
- **Status Indicators**: Provides visual feedback about the extension's state

## Architecture

### Component Structure

1. **Background Script** (`js/background/background.js`)
   - Manages authentication state
   - Handles API communication
   - Maintains the user session

2. **Content Script** (`js/content/content.js`)
   - Modifies the Codeforces DOM
   - Implements rating replacement logic
   - Manages caching and user display

3. **Popup UI** (`popup.html`, `js/popup/popup.js`)
   - Provides login interface
   - Allows group selection
   - Configures display preferences

### Extension Flow

1. User logs in via the popup interface
2. User selects a group to use for ratings
3. When browsing Codeforces, the content script identifies usernames
4. Unknown usernames are sent to the API to fetch ratings
5. DOM is updated to display RSHF ratings instead of standard ratings

## Authentication Mechanism

The extension uses JWT token-based authentication, mirroring the RSHF website:

- Login credentials are sent to `/api/user/login`
- Received JWT token is stored in `chrome.storage.local`
- User data is fetched from `/api/user?user_id={username}`
- All subsequent API calls include the token in Authorization header

## Rating System Implementation

### Rating Colors and Ranks

The extension maps ratings to colors and rank names according to a predefined scheme:
- < 1200: Newbie (Gray)
- 1200-1399: Pupil (Green)
- 1400-1599: Specialist (Cyan)
- 1600-1899: Expert (Blue)
- 1900-2099: Candidate Master (Purple)
- 2100-2299: Master (Orange)
- 2300-2399: International Master (Orange)
- 2400-2599: Grandmaster (Red)
- 2600-2999: International Grandmaster (Red)
- ≥ 3000: Legendary Grandmaster (Red)

### DOM Manipulation

The extension targets multiple elements across Codeforces pages:

#### 1. Regular Usernames (rated-user)
For elements with the class "rated-user" across the site, the extension:
1. Removes existing Codeforces color classes
2. Adds appropriate RSHF color classes
3. Sets color styles directly for consistency
4. Adds tooltips with rating and rank information

#### 2. Profile Sidebar
For the sidebar that appears on various Codeforces pages, the extension:
1. Identifies the rating display element
2. Updates the rating value with RSHF rating
3. Changes the "Rating:" label to "RSHF Rating:"
4. Applies consistent styling with the rated-user elements

#### 3. Profile Page Box
On user profile pages (URLs starting with `/profile/`), the extension:
1. Updates the rank display (e.g., "Master" to appropriate RSHF rank)
2. Updates the contest rating display with RSHF rating
3. Hides the max rating information
4. Applies consistent styling across all elements
5. Changes "Contest rating:" to "RSHF Rating:"

## Caching Strategy

To minimize API calls, the extension implements a caching mechanism:

1. Maintains a map of `username → {rating, timestamp}`
2. For each Codeforces page:
   - Collects usernames not in the cache
   - Includes usernames that were last refreshed > threshold time ago
   - Sends a batch request for these usernames
   - Updates the cache with new data
3. Cache is persisted in `chrome.storage.local`

## Group Selection

The extension allows users to specify which RSHF group's ratings to display:

1. User enters a group name in the popup UI
2. Extension fetches group details from `/api/group?group_id={groupName}`
3. Selected group is stored in extension preferences
4. Ratings specific to this group are used for display

## Handling Non-Group Members

For users who don't have a rating in the selected group (API returns null):
- The extension offers multiple display options configured in settings:
  - **Transparent**: Displays the original Codeforces rating/username with reduced opacity (50%)
  - **Star**: Adds a star indicator next to the rating/username
  - **Strike-through**: Applies a line-through text decoration to indicate non-membership
  - **Plain**: No visual changes (shows the original Codeforces rating/username as-is)
- The same visual treatment is consistently applied across all page elements (usernames, sidebar, profile box)
- The extension uses a single handler function to ensure consistent styling everywhere

## User Experience Considerations

### Status Indicators

The extension shows status indicators when:
- User is not logged in
- No group is selected

These indicators appear as clickable elements in the page corner that open the extension popup.

### Error Handling

Robust error handling for cases like:
- Authentication failures
- API request failures
- Missing group information
- Rate limiting

## File Structure

```
extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup interface
├── css/
│   ├── popup.css       # Styles for popup
│   └── content.css     # Styles for Codeforces page modifications
├── js/
│   ├── background/
│   │   └── background.js     # Background service worker
│   ├── content/
│   │   └── content.js        # Content script for Codeforces pages
│   └── popup/
│       └── popup.js          # Popup interface logic
└── images/
    ├── icon16.png      # Extension icons
    ├── icon48.png
    └── icon128.png
```

## API Integration

### Key Endpoints Used

1. **Authentication**
   - `/api/user/login` (POST): For user login
   - `/api/user?user_id={username}` (GET): Fetch user details

2. **Group Information**
   - `/api/group?group_id={groupName}` (GET): Get group details

3. **Rating Data**
   - `/api/extension_query_1` (POST): Get ratings for multiple users in a group
     - Request: `{ "group_id": "string", "cf_handles": ["string"] }`
     - Response: `{ "ratings": [0, null, 1500] }` (null for users not in group)

## Future Enhancement Possibilities

1. **Offline Mode**: Enhanced caching for offline functionality
2. **Rating History**: Visualization of rating changes over time
3. **Contest Integration**: Show predicted rating changes during contests
4. **Multiple Groups**: Support for comparing ratings across different groups
5. **Custom Themes**: User-configurable color schemes
6. **Statistics View**: Additional statistics beyond just the rating number

## Developer Notes

- The extension is designed for Chromium-based browsers (Chrome, Edge, Brave)
- The extension requires internet connectivity for initial rating data
- Use the browser's developer tools to debug if issues occur
- The extension's content script is injected only on Codeforces domains

---

## Quick Start for Development

1. Clone the repository
2. Load the extension in developer mode:
   - Open chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
3. Authenticate with your RSHF credentials
4. Enter a group name and click "Set Group"
5. Browse Codeforces to see the ratings in action
