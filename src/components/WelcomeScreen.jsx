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
      <div className="welcome-title-group">
        <h1 className="welcome-title">Solve the Bounce!</h1>
      </div>
      <div className="welcome-instruction-stack">
        <p className="welcome-subtitle">
          Place the shapes such that<br />ball hits <span className="highlight-all">ALL</span> and goes to the basket
        </p>
        <div className="rules-box">
          <ul>
            <li>You can rotate and drag the objects (you can use angle adjust area for fine tuning).</li>
            <li>Check the level specs on top-right side.</li>
            <li>Put the ball to the basket within given lives to win!</li>
            <li>Don't rely too much on corner / curve trajectories!</li>
          </ul>
        </div>
      </div>
      <div className="welcome-bottom-group">
        <div className="highest-reached">
          <span className="highest-label">Highest Reached: </span>
          <span className="highest-value">{displayHighest > 0 ? displayHighest : '\u2014'}</span>
        </div>
        <button
          className="start-btn"
          onClick={() => dispatch({ type: 'START_GAME' })}
        >
          Start
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
