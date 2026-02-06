import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { TutorialState, Level1TutorialStep, TUTORIAL_CONFIG } from '../engine/constants.js';
import { shouldShowTutorial, completeTutorial } from '../lib/tutorialStorage.js';

// ========================================
// CONTEXT
// ========================================

const TutorialContext = createContext(null);

// ========================================
// INITIAL STATE
// ========================================

const initialState = {
  currentStep: null,
  state: TutorialState.HIDDEN,
  fadeProgress: 0,
  highlightedElements: [],  // Array of { x, y, width, height, isRed }
  queuedStep: null,         // Step to show on next try
  missedShapeIndices: [],   // Indices of shapes that weren't hit (for Step 3B)
};

// ========================================
// REDUCER
// ========================================

function tutorialReducer(state, action) {
  switch (action.type) {
    case 'SHOW_TUTORIAL':
      return {
        ...state,
        currentStep: action.stepId,
        state: TutorialState.FADING_IN,
        fadeProgress: 0,
        highlightedElements: action.highlights || [],
        missedShapeIndices: action.missedShapeIndices || [],
      };

    case 'UPDATE_FADE':
      return {
        ...state,
        fadeProgress: action.progress,
        state: action.newState || state.state,
      };

    case 'DISMISS_TUTORIAL':
      if (state.state === TutorialState.HIDDEN) return state;
      return {
        ...state,
        state: TutorialState.FADING_OUT,
      };

    case 'HIDE_TUTORIAL':
      return {
        ...state,
        currentStep: null,
        state: TutorialState.HIDDEN,
        fadeProgress: 0,
        highlightedElements: [],
        missedShapeIndices: [],
      };

    case 'QUEUE_TUTORIAL':
      return {
        ...state,
        queuedStep: action.stepId,
        missedShapeIndices: action.missedShapeIndices || [],
      };

    case 'CLEAR_QUEUE':
      return {
        ...state,
        queuedStep: null,
      };

    case 'UPDATE_HIGHLIGHTS':
      return {
        ...state,
        highlightedElements: action.highlights,
      };

    default:
      return state;
  }
}

// ========================================
// PROVIDER
// ========================================

export function TutorialProvider({ children }) {
  const [state, dispatch] = useReducer(tutorialReducer, initialState);
  const animationRef = useRef(null);
  // Use refs for queued tutorial to avoid React state timing issues
  const queuedStepRef = useRef(null);
  const queuedMissedIndicesRef = useRef([]);

  // Show a tutorial step
  const showTutorial = useCallback((stepId, highlights = [], missedShapeIndices = []) => {
    // Check if already completed
    if (!shouldShowTutorial(stepId)) return false;

    dispatch({
      type: 'SHOW_TUTORIAL',
      stepId,
      highlights,
      missedShapeIndices,
    });

    // Start fade-in animation
    const startTime = performance.now();
    const duration = TUTORIAL_CONFIG.FADE_IN_DURATION;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      dispatch({
        type: 'UPDATE_FADE',
        progress,
        newState: progress >= 1 ? TutorialState.VISIBLE : TutorialState.FADING_IN,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
    return true;
  }, []);

  // Dismiss current tutorial
  const dismissTutorial = useCallback(() => {
    if (state.state === TutorialState.HIDDEN || state.state === TutorialState.FADING_OUT) {
      return;
    }

    // Mark as completed
    if (state.currentStep) {
      completeTutorial(state.currentStep);
    }

    dispatch({ type: 'DISMISS_TUTORIAL' });

    // Start fade-out animation
    const startTime = performance.now();
    const duration = TUTORIAL_CONFIG.FADE_OUT_DURATION;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      dispatch({
        type: 'UPDATE_FADE',
        progress: 1 - progress, // Reverse for fade out
      });

      if (progress >= 1) {
        dispatch({ type: 'HIDE_TUTORIAL' });
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [state.state, state.currentStep]);

  // Queue a tutorial to show on next try (uses ref for immediate availability)
  const queueTutorialForNextTry = useCallback((stepId, missedShapeIndices = []) => {
    if (!shouldShowTutorial(stepId)) return false;
    queuedStepRef.current = stepId;
    queuedMissedIndicesRef.current = missedShapeIndices;
    dispatch({ type: 'QUEUE_TUTORIAL', stepId, missedShapeIndices });
    return true;
  }, []);

  // Show queued tutorial (called when next try starts) - reads from ref for immediate access
  const showQueuedTutorial = useCallback((getHighlights) => {
    const stepId = queuedStepRef.current;
    if (!stepId) return false;

    const missedIndices = queuedMissedIndicesRef.current;
    const highlights = getHighlights ? getHighlights(stepId, missedIndices) : [];

    // Clear the queue
    queuedStepRef.current = null;
    queuedMissedIndicesRef.current = [];
    dispatch({ type: 'CLEAR_QUEUE' });

    return showTutorial(stepId, highlights, missedIndices);
  }, [showTutorial]);

  // Update highlight positions (for dynamic elements)
  const updateHighlights = useCallback((highlights) => {
    dispatch({ type: 'UPDATE_HIGHLIGHTS', highlights });
  }, []);

  // Check if a specific step is currently showing
  const isStepShowing = useCallback((stepId) => {
    return state.currentStep === stepId && state.state !== TutorialState.HIDDEN;
  }, [state.currentStep, state.state]);

  const value = {
    ...state,
    showTutorial,
    dismissTutorial,
    queueTutorialForNextTry,
    showQueuedTutorial,
    updateHighlights,
    isStepShowing,
    shouldShowTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
