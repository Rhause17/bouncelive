import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { loadSave } from '../lib/cloudSave.js';
import Leaderboard from './Leaderboard.jsx';

export default function WelcomeScreen() {
  const { state, dispatch } = useGame();
  const { user, loading, signInAnonymously, signInWithGoogle, signOut } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [cloudHighest, setCloudHighest] = useState(null);

  // Load cloud save on login
  useEffect(() => {
    if (!user) { setCloudHighest(null); return; }
    loadSave(user.id).then(save => {
      if (save) setCloudHighest(save.highest_level);
    });
  }, [user]);

  if (state.screen !== 'welcome') return null;

  const displayHighest = cloudHighest != null
    ? Math.max(cloudHighest, state.highestCompletedLevel)
    : state.highestCompletedLevel;

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">BounceLive</h1>
        <p className="welcome-subtitle">Physics Puzzle Game</p>

        {displayHighest > 0 && (
          <div className="highest-reached">
            <span className="highest-label">Highest Level Reached</span>
            <span className="highest-value">{displayHighest}</span>
          </div>
        )}

        <button
          className="start-btn"
          onClick={() => dispatch({ type: 'START_GAME' })}
        >
          Start Game
        </button>

        <div className="welcome-actions">
          {!loading && !user && (
            <>
              <button className="welcome-link" onClick={signInAnonymously}>
                Play as Guest
              </button>
              <button className="welcome-link" onClick={signInWithGoogle}>
                Sign in with Google
              </button>
            </>
          )}
          {!loading && user && (
            <button className="welcome-link" onClick={signOut}>
              Sign Out
            </button>
          )}
          <button className="welcome-link" onClick={() => setShowLeaderboard(true)}>
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
