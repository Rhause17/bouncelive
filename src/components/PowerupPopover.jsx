import React from 'react';
import { useGame } from '../context/GameContext.jsx';

const POWERUP_CONFIG = {
  T: {
    heading: 'Extend the ball trajectory.',
    actionType: 'USE_TRAJECTORY_POWERUP',
    countKey: 'trajectoryCount',
    usedKey: 'tUsedThisLevel',
  },
  R: {
    heading: 'Remove an object.',
    actionType: 'USE_REMOVE_POWERUP',
    countKey: 'removeCount',
    usedKey: 'rUsedThisLevel',
  },
  E: {
    heading: 'Widen the basket.',
    actionType: 'USE_WIDEN_POWERUP',
    countKey: 'widenCount',
    usedKey: 'eUsedThisLevel',
  },
};

export default function PowerupPopover({ type, onClose, onEnterRemoveMode }) {
  const { state, dispatch, gameObjects } = useGame();

  if (!type) return null;

  const config = POWERUP_CONFIG[type];
  if (!config) return null;

  const isUsed = state[config.usedKey];
  const count = state[config.countKey];

  const handleUse = () => {
    if (isUsed || count <= 0) return;

    dispatch({ type: config.actionType });

    if (type === 'R') {
      onClose();
      if (onEnterRemoveMode) onEnterRemoveMode();
      return;
    }

    if (type === 'E') {
      const go = gameObjects.current;
      if (go.basket && go.basketOriginalRadius === null) {
        go.basketOriginalRadius = go.basket.radius;
      }
      go.basketWidenProgress = 0;
    }

    onClose();
  };

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover">
        <div className="popover-nub" />
        <h3 className="popover-title">{config.heading}</h3>
        <button
          className={`popover-btn ${isUsed ? 'disabled' : ''}`}
          onClick={handleUse}
          disabled={isUsed}
        >
          Use
        </button>
      </div>
    </>
  );
}
