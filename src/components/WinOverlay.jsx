import React, { useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { IS_SAFARI } from '../engine/platform.js';
import { writeSave } from '../lib/cloudSave.js';
import { updateLeaderboardEntry } from '../lib/leaderboard.js';

export default function WinOverlay() {
  const { state, nextLevel, dispatch } = useGame();
  const { user } = useAuth();
  const transitioningRef = useRef(false);
  const savedRef = useRef(false);

  const isWin = state.gameState === 'win';
  const isFail = state.gameState === 'fail';
  const livesRatio = isWin ? state.lives / state.initialLives : 0;
  const stars = livesRatio >= 0.7 ? 3 : livesRatio >= 0.4 ? 2 : 1;

  // Cloud save on win
  useEffect(() => {
    if (!isWin || savedRef.current || !user) return;
    savedRef.current = true;

    const saveData = {
      highestLevel: state.highestCompletedLevel,
      trajectoryCt: state.trajectoryCount,
      removeCt: state.removeCount,
      widenCt: state.widenCount,
      totalStars: stars, // simplified — a full impl would accumulate
    };
    writeSave(user.id, saveData);
    updateLeaderboardEntry(user.id, user.email || 'Anonymous', saveData.highestLevel, saveData.totalStars);
  }, [isWin, user, state, stars]);

  // Reset saved flag when leaving win state
  useEffect(() => {
    if (!isWin) savedRef.current = false;
  }, [isWin]);

  const handleNextLevel = () => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    if (IS_SAFARI) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          nextLevel(w, h);
          transitioningRef.current = false;
        }, 0);
      });
    } else {
      nextLevel(w, h);
      transitioningRef.current = false;
    }
  };

  const handleReturnToMenu = () => {
    dispatch({ type: 'RETURN_TO_MENU' });
  };

  // Win overlay
  if (isWin) {
    return (
      <div className="game-overlay active win">
        <div className="overlay-content">
          <h2 className="overlay-text">SUCCESS!</h2>
          <p className="level-complete-text">Level {state.level} Complete</p>
          <div className="stars">
            {[1, 2, 3].map(i => (
              <span key={i} className={`star ${i <= stars ? 'filled' : ''}`}>
                {'\u2605'}
              </span>
            ))}
          </div>
          <button className="next-level-btn" onClick={handleNextLevel}>
            Next Level
          </button>
        </div>
      </div>
    );
  }

  // Fail overlay
  if (isFail) {
    return (
      <div className="game-overlay active fail">
        <div className="overlay-content">
          <h2 className="overlay-text">YOU FAILED!</h2>
          <p className="level-complete-text">Level Reached: {state.highestCompletedLevel > 0 ? state.highestCompletedLevel : 1}</p>
          <button className="retry-btn" onClick={handleReturnToMenu}>
            Main Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
