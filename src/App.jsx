import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { GameProvider } from './context/GameContext.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WinOverlay from './components/WinOverlay.jsx';
import PowerupPopoverWrapper from './components/PowerupPopoverWrapper.jsx';

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="app">
          <WelcomeScreen />
          <GameCanvas />
          <WinOverlay />
          <PowerupPopoverWrapper />
        </div>
      </GameProvider>
    </AuthProvider>
  );
}
