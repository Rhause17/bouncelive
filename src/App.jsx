import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { GameProvider } from './context/GameContext.jsx';
import { TutorialProvider } from './context/TutorialContext.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WinOverlay from './components/WinOverlay.jsx';
import PowerupPopoverWrapper from './components/PowerupPopoverWrapper.jsx';
import TutorialOverlayWrapper from './components/TutorialOverlayWrapper.jsx';

export default function App() {
  return (
    <AuthProvider>
      <TutorialProvider>
        <GameProvider>
          <div className="app">
            <WelcomeScreen />
            <GameCanvas />
            <TutorialOverlayWrapper />
            <WinOverlay />
            <PowerupPopoverWrapper />
          </div>
        </GameProvider>
      </TutorialProvider>
    </AuthProvider>
  );
}
