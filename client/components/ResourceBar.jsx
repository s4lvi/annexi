// Updated ResourceBar.jsx
import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";

export default function ResourceBar({ resourceValue }) {
  const [displayValue, setDisplayValue] = useState(resourceValue);
  const { state } = useGameState();
  const { players, currentPlayerId } = state;

  // Get the current player's actual production value from game state
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  const actualProduction = currentPlayer
    ? currentPlayer.production
    : resourceValue;

  useEffect(() => {
    // Use the value from the player state if it exists
    const targetValue =
      actualProduction !== undefined ? actualProduction : resourceValue;

    let startValue = displayValue;
    const endValue = targetValue;
    const duration = 1000; // animation duration in ms
    const stepTime = 50; // update every 50ms
    const steps = duration / stepTime;
    const increment = (endValue - startValue) / steps;
    let current = startValue;

    // Only animate if the values are different
    if (startValue !== endValue) {
      const interval = setInterval(() => {
        current += increment;
        setDisplayValue(Math.floor(current));
        if (
          (increment > 0 && current >= endValue) ||
          (increment < 0 && current <= endValue)
        ) {
          clearInterval(interval);
          setDisplayValue(endValue);
        }
      }, stepTime);

      return () => clearInterval(interval);
    }
  }, [resourceValue, actualProduction, displayValue]);

  // Update display with gameState directly if needed
  useEffect(() => {
    if (currentPlayer && currentPlayer.production !== undefined) {
      setDisplayValue(currentPlayer.production);
    }
  }, [currentPlayer]);

  return (
    <div className="resource-bar p-2 bg-gray-800 text-white rounded">
      <span>Production: {displayValue}</span>
    </div>
  );
}
