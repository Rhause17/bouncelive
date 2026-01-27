import React, { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/leaderboard.js';

export default function Leaderboard({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(20).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="game-overlay active">
      <div className="overlay-content leaderboard-content">
        <h2 className="overlay-text leaderboard-title">Leaderboard</h2>
        {loading ? (
          <p className="leaderboard-loading">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="leaderboard-empty">No entries yet.</p>
        ) : (
          <div className="leaderboard-list">
            {entries.map((e, i) => (
              <div key={i} className="leaderboard-row">
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">{e.display_name}</span>
                <span className="lb-level">Lv {e.highest_level}</span>
                <span className="lb-stars">{e.total_stars} &#9733;</span>
              </div>
            ))}
          </div>
        )}
        <button className="next-level-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
