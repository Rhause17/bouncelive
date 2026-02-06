import React from 'react';
import { useCanvasSize } from '../hooks/useCanvasSize.js';
import { useGame } from '../context/GameContext.jsx';
import TutorialOverlay from './TutorialOverlay.jsx';

export default function TutorialOverlayWrapper() {
  const { width, height } = useCanvasSize();
  const { state } = useGame();

  // Only show tutorial overlay when playing
  if (state.screen !== 'playing') {
    return null;
  }

  return <TutorialOverlay width={width} height={height} />;
}
