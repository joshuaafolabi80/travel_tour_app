// src/context/SoundContext.jsx
import React, { createContext, useContext, useState } from 'react';

const SoundContext = createContext();

export const useSound = () => {
  return useContext(SoundContext);
};

export const SoundProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);

  const playSound = (type) => {
    if (isMuted) return;

    const audio = new Audio();
    switch (type) {
      case 'correct':
        audio.src = '/sounds/correct.mp3';
        break;
      case 'wrong':
        audio.src = '/sounds/wrong.mp3';
        break;
      case 'click':
        audio.src = '/sounds/click.mp3';
        break;
      default:
        return;
    }
    audio.play().catch(e => console.log("Audio play failed:", e));
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const value = {
    playSound,
    toggleMute,
    isMuted
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};