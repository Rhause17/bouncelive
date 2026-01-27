import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import PowerupPopover from './PowerupPopover.jsx';

export default function PowerupPopoverWrapper() {
  const { state, dispatch } = useGame();

  if (state.screen !== 'playing' || !state.activePowerupPopover) return null;

  return (
    <PowerupPopover
      type={state.activePowerupPopover}
      onClose={() => dispatch({ type: 'CLOSE_POWERUP_POPOVER' })}
      onEnterRemoveMode={() => dispatch({ type: 'ENTER_REMOVE_MODE' })}
    />
  );
}
