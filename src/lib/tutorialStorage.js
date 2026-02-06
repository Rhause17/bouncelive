// ========================================
// TUTORIAL PERSISTENCE (localStorage)
// ========================================

const TUTORIAL_STORAGE_KEY = 'bouncelive_tutorial_progress';

/**
 * Check if a tutorial step should be shown (not yet completed)
 */
export function shouldShowTutorial(stepId) {
  try {
    const progress = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '{}');
    return !progress[stepId];
  } catch {
    return true; // Show tutorial if storage fails
  }
}

/**
 * Mark a tutorial step as completed
 */
export function completeTutorial(stepId) {
  try {
    const progress = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '{}');
    progress[stepId] = true;
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Silently fail if storage is unavailable
  }
}

/**
 * Get all completed tutorial steps
 */
export function getCompletedTutorials() {
  try {
    const progress = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '{}');
    return Object.keys(progress).filter(key => progress[key]);
  } catch {
    return [];
  }
}

/**
 * Reset all tutorial progress (for testing)
 */
export function resetTutorialProgress() {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
