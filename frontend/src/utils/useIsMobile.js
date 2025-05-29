import { useState, useEffect } from 'react';

/**
 * Custom React hook to detect if the device is mobile based on window width.
 * @param {number} breakpoint - The max width (in px) to consider as mobile. Default: 768px.
 * @returns {boolean} - true if mobile, false otherwise.
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
