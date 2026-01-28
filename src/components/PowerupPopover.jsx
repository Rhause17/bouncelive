import React, { useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { LAYOUT } from '../engine/constants.js';

const POWERUP_CONFIG = {
  T: {
    heading: 'Extend the ball trajectory.',
    actionType: 'USE_TRAJECTORY_POWERUP',
    countKey: 'trajectoryCount',
    usedKey: 'tUsedThisLevel',
    buttonIndex: 0,
    btnClass: 'popover-btn-t',
  },
  R: {
    heading: 'Remove an object.',
    actionType: 'USE_REMOVE_POWERUP',
    countKey: 'removeCount',
    usedKey: 'rUsedThisLevel',
    buttonIndex: 1,
    btnClass: 'popover-btn-r',
  },
  E: {
    heading: 'Widen the basket.',
    actionType: 'USE_WIDEN_POWERUP',
    countKey: 'widenCount',
    usedKey: 'eUsedThisLevel',
    buttonIndex: 2,
    btnClass: 'popover-btn-e',
  },
};

export default function PowerupPopover({ type, onClose, onEnterRemoveMode }) {
  const { state, dispatch, gameObjects } = useGame();
  const popoverRef = useRef(null);

  const config = POWERUP_CONFIG[type];

  const isUsed = config ? state[config.usedKey] : false;
  const count = config ? state[config.countKey] : 0;

  const handleUse = () => {
    if (!config || isUsed || count <= 0) return;

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

  // Position popover above the clicked powerup button
  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover || !config) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = canvas.parentElement.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;

    const L = LAYOUT;
    const btnSize = L.powerupButtonSize;
    const w = canvas.width;
    const spacing = (w - btnSize * 3) / 4;
    const btnIdx = config.buttonIndex;

    // Button center X in canvas coordinates, converted to container-relative pixels
    const bx = spacing + btnIdx * (btnSize + spacing);
    const buttonCenterX = (bx + btnSize / 2) * scaleX + (canvasRect.left - containerRect.left);

    const popoverRect = popover.getBoundingClientRect();
    const popoverWidth = popoverRect.width;

    // Center popover on button, clamped to container edges
    const margin = 12;
    let popoverLeft = buttonCenterX - popoverWidth / 2;
    popoverLeft = Math.max(margin, Math.min(popoverLeft, containerRect.width - popoverWidth - margin));

    // Nub position inside popover
    let nubX = buttonCenterX - popoverLeft;
    nubX = Math.max(18, Math.min(nubX, popoverWidth - 18));

    popover.style.left = popoverLeft + 'px';
    popover.style.setProperty('--nub-x', nubX + 'px');

    // Trigger scale-in animation on next frame
    requestAnimationFrame(() => {
      popover.classList.add('active');
    });
  }, [type, config]);

  if (!type || !config) return null;

  return (
    <>
      <div className="popover-overlay" onClick={onClose} />
      <div className="popover" ref={popoverRef}>
        <div className="popover-nub" />
        <h3 className="popover-heading">{config.heading}</h3>
        <button
          className={`popover-btn ${config.btnClass} ${isUsed ? 'disabled' : ''}`}
          onClick={handleUse}
          disabled={isUsed}
        >
          {isUsed ? 'Used' : 'Use'}
        </button>
      </div>
    </>
  );
}
