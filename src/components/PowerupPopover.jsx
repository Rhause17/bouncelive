import React from 'react';
import { useGame } from '../context/GameContext.jsx';

const POWERUP_CONFIG = {
  T: {
    title: 'Trajectory',
    description: 'Extend trajectory preview to see further ahead.',
    actionType: 'USE_TRAJECTORY_POWERUP',
    countKey: 'trajectoryCount',
    usedKey: 'tUsedThisLevel',
  },
  R: {
    title: 'Remove',
    description: 'Select and remove one shape from the level.',
    actionType: 'USE_REMOVE_POWERUP',
    countKey: 'removeCount',
    usedKey: 'rUsedThisLevel',
  },
  E: {
    title: 'Expand',
    description: 'Widen the basket by 30% for the rest of the run.',
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
        <h3 className="popover-title">{config.title}</h3>
        <p className="popover-desc">{config.description}</p>
        <p className="popover-count">Remaining: {count}</p>
        <button
          className={`popover-btn ${isUsed ? 'disabled' : ''}`}
          onClick={handleUse}
          disabled={isUsed}
        >
          {isUsed ? 'Used' : 'Use'}
        </button>
      </div>
    </>
  );
}
