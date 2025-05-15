'use client';

import { useEffect } from 'react';
import { applyClientPatches } from '@/utils/bn-polyfill-client'; // Adjusted path based on tsconfig and file location

export default function GlobalPatcher() {
  useEffect(() => {
    console.log('GlobalPatcher: Applying client patches early in the lifecycle.');
    try {
      applyClientPatches();
      console.log('GlobalPatcher: Client patches applied successfully.');
    } catch (error) {
      console.error('GlobalPatcher: Error applying client patches:', error);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return null; // This component does not render anything visible
}
