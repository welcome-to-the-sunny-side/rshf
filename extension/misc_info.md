# Rating to Rank

```js
// Rating utility functions for the application
// Contains helper functions for determining rating colors and rank names

// RANK COLORS
export const RANK_COLORS = {
  newbie      : '#808080',    //   < 1200
  pupil       : '#008000',    // 1200 – 1399
  specialist  : '#03A89E', // 1400 – 1599
  expert      : '#0000ff',    // 1600 – 1899
  candmaster  : '#a0a',    // 1900 – 2099
  master      : '#FF8C00', // 2100 – 2299
  intmaster   : '#FF8C00', // 2300 - 2399
  grandmaster : '#ff0000',    // 2400 – 2599
  intgrandmaster: '#ff0000',  // 2600 - 2999
  legend      : '#ff0000'     // >= 3000 (Legendary GM)
};

// RANK BANDS
export const RANK_BANDS = [
  { y1: 0,    y2: 1200, color: RANK_COLORS.newbie },
  { y1: 1200, y2: 1400, color: RANK_COLORS.pupil },
  { y1: 1400, y2: 1600, color: RANK_COLORS.specialist },
  { y1: 1600, y2: 1900, color: RANK_COLORS.expert },
  { y1: 1900, y2: 2100, color: RANK_COLORS.candmaster },
  { y1: 2100, y2: 2300, color: RANK_COLORS.master },
  { y1: 2300, y2: 2400, color: RANK_COLORS.intmaster },
  { y1: 2400, y2: 2600, color: RANK_COLORS.grandmaster },
  { y1: 2600, y2: 3000, color: RANK_COLORS.intgrandmaster },
  { y1: 3000,          color: RANK_COLORS.legend } // y2 determined dynamically
];

/**
 * Get the color for a rating value
 * @param {number} rating - The rating value
 * @returns {string} The color hex code for the rating
 */
export const getRatingColor = (rating) => {
  for (const band of RANK_BANDS) {
    if (rating >= band.y1 && (band.y2 === undefined || rating < band.y2)) {
      return band.color;
    }
  }
  // Default fallback color (should never reach here)
  return RANK_COLORS.newbie;
};

/**
 * Get the rank name based on rating
 * @param {number} rating - The rating value
 * @returns {string} The rank name
 */
export const getRankName = (rating) => {
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

/**
 * Combined function to get both color and name for a rating
 * @param {number} rating - The rating value
 * @returns {Object} Object containing both color and name
 */
export const getRatingInfo = (rating) => {
  return {
    color: getRatingColor(rating),
    name: getRankName(rating)
  };
}; 
```