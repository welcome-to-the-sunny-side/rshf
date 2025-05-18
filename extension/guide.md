# Codeforces Alternative Rating Browser Extension - Development Guide

> **NOTE**: This is an initial draft guide and is not exhaustive. It will be updated as the project progresses.

## Project Overview

This browser extension replaces the standard Codeforces ratings/ranks/handle colors with an alternative rating system. The extension works across all Codeforces pages, focusing primarily on replacing usernames that have the "rated-user" class.

### Key Features

- Replace official Codeforces ratings with alternative ratings
- Support for group-based ratings where users can select a specific group
- Visual differentiation for users who don't have ratings in the selected group
- Toggle between official and alternative ratings
- Caching mechanism to reduce API calls
- User configuration options

## Technical Details

### Rating System

- **Range**: [-500, 1000000]
- **Rating Tiers**: Similar to Codeforces (Newbie, Pupil, Specialist, etc.)
- **Color Mapping**: Defined in `misc_info.md`

### DOM Elements

- Primary target: Elements with class "rated-user"
- Limit of 2000 replacements per page (configurable)

### Caching Mechanism

The extension implements the following caching approach:
1. Store a map of usernames to `{rating, time}`
2. When a page loads:
   - Identify all usernames on the page
   - Add usernames not in the map to the request vector
   - Add usernames that were last refreshed > THRESHOLD time ago to the request vector
3. Send API request with the request vector
4. Update the cache with new data
5. Replace all usernames on the page based on the cache

### User Configuration

- **Group Selection**: Users can select which group's ratings to display
- **Visual Indicators** for users without group ratings:
  - Show official colors with lowered opacity
  - Show official colors with struck-through names
  - Use a brown color (unused in any rank)
  - Use official colors with an asterisk next to the name
- **Toggle** between official and alternative ratings
- **Clear Cache** option

## Implementation Plan

### Core Components

1. **Content Script**
   - Target the "rated-user" class elements across Codeforces pages
   - Apply color/styling changes based on alternative ratings
   - Implement the user-chosen style for users without group ratings

2. **Background Script**
   - Handle caching mechanism (username → {rating, time})
   - Manage API requests with batching
   - Maintain persistent state

3. **Popup/Options UI**
   - Group selection interface
   - Visual style configuration
   - Toggle between official/alternative ratings
   - Cache management (clear cache button)

4. **Storage**
   - Persistent storage for settings, cache, login info

### Mock API

During development, the extension will use mock data:
- **Request Format**: (logged-in username, chosen group name, request vector of usernames)
- **Mock Rating Range**: [0, 4000]
- **Default User**: "TestUser" (until login is implemented)

## Persistent Data

The following data should persist between browser sessions:
- User login state
- Cached query map
- User settings and preferences

## Future Features

- User authentication (login mechanism)
- Additional page-specific enhancements
