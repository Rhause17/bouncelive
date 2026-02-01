import React, { useRef, useEffect, useState } from 'react';
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

  // Animation states
  const [visibleStars, setVisibleStars] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [displayedLevel, setDisplayedLevel] = useState(1);

  const isWin = state.gameState === 'win';
  const isFail = state.gameState === 'fail';
  const livesRatio = isWin ? state.lives / state.initialLives : 0;
  const stars = livesRatio >= 0.7 ? 3 : livesRatio >= 0.4 ? 2 : 1;

  // Staggered star animation on win + slot machine level counter
  useEffect(() => {
    if (isWin) {
      setShowContent(false);
      setVisibleStars(0);
      setDisplayedLevel(1);

      // Show content after brief delay
      const contentTimer = setTimeout(() => setShowContent(true), 100);

      // Stagger star reveals
      const starTimers = [];
      for (let i = 1; i <= stars; i++) {
        starTimers.push(setTimeout(() => setVisibleStars(i), 300 + i * 300));
      }

      // Slot machine level counter effect
      const targetLevel = state.level;
      if (targetLevel > 1) {
        let currentLevel = 1;
        const levelInterval = setInterval(() => {
          currentLevel++;
          setDisplayedLevel(currentLevel);
          if (currentLevel >= targetLevel) {
            clearInterval(levelInterval);
          }
        }, 50);
        starTimers.push({ clear: () => clearInterval(levelInterval) });
      } else {
        setDisplayedLevel(targetLevel);
      }

      return () => {
        clearTimeout(contentTimer);
        starTimers.forEach(t => {
          if (t.clear) t.clear();
          else clearTimeout(t);
        });
      };
    } else {
      setVisibleStars(0);
      setShowContent(isFail);
      setDisplayedLevel(state.highestCompletedLevel > 0 ? state.highestCompletedLevel : 1);
    }
  }, [isWin, isFail, stars, state.level, state.highestCompletedLevel]);

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
        <div className={`overlay-content ${showContent ? 'animate-in' : ''}`}>
          <h2 className="overlay-text">SUCCESS!</h2>
          <p className="level-complete-text">Level <span className="level-number">{displayedLevel}</span> Complete</p>
          <div className="stars">
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className={`star ${i <= visibleStars ? 'filled pop-in' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
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
