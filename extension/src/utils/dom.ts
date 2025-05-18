import { SELECTORS } from '../shared/constants';
import { ExtensionSettings, RatingInfo } from '../shared/types';

// Map rating ranges to Codeforces user class names
const RATING_TO_CLASS_MAP = [
  { maxRating: 1199, className: 'user-gray' },
  { maxRating: 1399, className: 'user-green' },
  { maxRating: 1599, className: 'user-cyan' },
  { maxRating: 1899, className: 'user-blue' },
  { maxRating: 2099, className: 'user-violet' },
  { maxRating: 2399, className: 'user-orange' },
  { maxRating: 2999, className: 'user-red' },
  { maxRating: Infinity, className: 'user-legendary' }
];

/**
 * Utilities for DOM manipulation
 */
export class DomUtils {
  /**
   * Find all username elements on the page
   * @returns NodeList of username elements
   */
  static findUsernameElements(): NodeListOf<Element> {
    console.log('[RSHF-EXT] Looking for elements with selector:', SELECTORS.RATED_USER);
    const elements = document.querySelectorAll(SELECTORS.RATED_USER);
    console.log(`[RSHF-EXT] Found ${elements.length} elements with class 'rated-user'`);
    return elements;
  }
  
  /**
   * Extract usernames from elements
   * @param elements Elements to extract usernames from
   * @returns Array of usernames
   */
  static extractUsernames(elements: NodeListOf<Element>): string[] {
    return Array.from(elements).map(el => el.textContent?.trim() || '');
  }
  
  /**
   * Get the appropriate Codeforces class name based on rating
   * @param rating User's rating
   * @returns CSS class name for the rating
   */
  private static getRatingClassName(rating: number): string {
    // Find the corresponding class for the rating
    for (const range of RATING_TO_CLASS_MAP) {
      if (rating <= range.maxRating) {
        return range.className;
      }
    }
    // Default to legendary for any extremely high ratings
    return 'user-legendary';
  }
  
  /**
   * Apply rating color to an element
   * @param element Element to apply color to
   * @param rating User's rating
   * @param settings Extension settings
   */
  static applyRatingStyle(
    element: Element,
    rating: number,
    ratingInfo: RatingInfo,
    settings: ExtensionSettings
  ): void {
    console.log(`[RSHF-EXT] Applying rating style for ${element.textContent}, rating: ${rating}`);
    
    // Check if user has a rating in the selected group
    const hasGroupRating = rating !== -1;
    
    // Store original classes to preserve other functionality
    const originalClasses = element.className.split(' ');
    const preservedClasses = originalClasses.filter(cls => 
      !cls.startsWith('user-') && cls !== 'rated-user'
    );
    
    // Apply the appropriate class/style based on settings
    if (hasGroupRating) {
      // User has a rating in the selected group - use proper Codeforces classes
      const ratingClass = this.getRatingClassName(rating);
      
      // Set the new class list with our rating class
      element.className = ['rated-user', ratingClass, ...preservedClasses].join(' ');
      
      // Remove any inline styles that might have been applied before
      element.removeAttribute('style');
      
      // Update the title to show our alternative rating
      element.setAttribute('title', `Alternative Rating: ${rating} (${ratingInfo.name})`);
      
      console.log(`[RSHF-EXT] Applied class: ${ratingClass} for rating: ${rating}`);
    } else {
      // User does not have a rating in the selected group - apply custom styling
      // Preserve the rated-user class for consistency
      element.className = ['rated-user', ...preservedClasses].join(' ');
      
      switch (settings.noGroupRatingStyle) {
        case 'opacity':
          // Keep original color class but add opacity
          // First get the original color class if possible
          const originalColorClass = originalClasses.find(cls => cls.startsWith('user-'));
          if (originalColorClass) {
            element.classList.add(originalColorClass);
            (element as HTMLElement).style.opacity = '0.5';
          } else {
            // If no original color class, fallback to gray with opacity
            element.classList.add('user-gray');
            (element as HTMLElement).style.opacity = '0.5';
          }
          break;
          
        case 'strikethrough':
          // Keep original color class but add strikethrough
          const strikethroughColorClass = originalClasses.find(cls => cls.startsWith('user-'));
          if (strikethroughColorClass) {
            element.classList.add(strikethroughColorClass);
          } else {
            // Fallback to gray with strikethrough
            element.classList.add('user-gray');
          }
          // Apply custom strikethrough with black line at 0.5 opacity
          // We can't directly set opacity only for the line through CSS alone
          // So we'll use a CSS technique with text-decoration-color and text-decoration-thickness
          const htmlElement = element as HTMLElement;
          htmlElement.style.setProperty('text-decoration', 'line-through', 'important');
          htmlElement.style.setProperty('text-decoration-color', 'rgba(0, 0, 0, 0.2)', 'important'); // Black with 0.5 opacity
          htmlElement.style.setProperty('text-decoration-thickness', '1px', 'important'); // Thinner line for better appearance
          console.log('[RSHF-EXT] Applied custom strikethrough to', element.textContent);
          break;
          
        case 'brown':
          // Remove any existing color classes and apply brown color
          (element as HTMLElement).style.color = '#964B00';
          break;
          
        case 'asterisk':
          // Keep original color class and add black asterisk
          const asteriskColorClass = originalClasses.find(cls => cls.startsWith('user-'));
          if (asteriskColorClass) {
            element.classList.add(asteriskColorClass);
          } else {
            element.classList.add('user-gray');
          }
          
          // Add asterisk to name if not already present
          if (!element.textContent?.includes('*')) {
            const username = element.textContent || '';
            
            // Create a span for the asterisk
            const asterisk = document.createElement('span');
            asterisk.textContent = '*';
            asterisk.style.color = 'black'; // Make asterisk black
            asterisk.style.fontWeight = 'bold'; // Make it bold for visibility
            
            // Clear the element's text content and add the username
            element.textContent = username;
            // Append the asterisk span
            element.appendChild(asterisk);
            
            console.log('[RSHF-EXT] Added black asterisk to', username);
          }
          break;
      }
      
      element.setAttribute('title', 'No rating in selected group');
    }
  }
  
  /**
   * Reset element to original style
   * @param element Element to reset
   */
  static resetElementStyle(element: Element): void {
    // Store original classes - we only want to preserve the non-user class ones
    const originalClasses = element.className.split(' ');
    const preservedClasses = originalClasses.filter(cls => 
      !cls.startsWith('user-')
    );
    
    // Find the original color class if it exists in data attribute (we'll store it on modification)
    const originalColorClass = element.getAttribute('data-original-color-class');
    if (originalColorClass) {
      preservedClasses.push(originalColorClass);
      element.removeAttribute('data-original-color-class');
    }
    
    // Restore classes
    element.className = preservedClasses.join(' ');
    
    // Remove inline styles
    element.removeAttribute('style');
    element.removeAttribute('title');
    
    // Remove asterisk if it was added
    if (element.textContent?.endsWith('*')) {
      element.textContent = element.textContent.slice(0, -1);
    }
    
    console.log(`[RSHF-EXT] Reset element style: ${element.textContent}`);
  }
}
