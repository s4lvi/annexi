// Fixed ResourceBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useGameState } from "./gameState";

export default function ResourceBar({ resourceValue, icon }) {
  const [displayValue, setDisplayValue] = useState(0);
  const { state } = useGameState();
  const { players, currentPlayerId } = state;
  const animationRef = useRef(null);

  // Get the current player's actual production value from game state
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  //   const actualProduction = currentPlayer
  //     ? currentPlayer.production
  //     : resourceValue;
  const actualProduction = resourceValue;
  useEffect(() => {
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    // Use the value from the player state if it exists
    const targetValue =
      actualProduction !== undefined ? actualProduction : resourceValue;

    // Skip animation if the values are the same
    if (displayValue === targetValue) {
      return;
    }

    const startValue = displayValue;
    const endValue = targetValue;
    const duration = 1000; // animation duration in ms
    const stepTime = 50; // update every 50ms
    const steps = duration / stepTime;
    const increment = (endValue - startValue) / steps;
    let current = startValue;

    // Start new animation
    animationRef.current = setInterval(() => {
      current += increment;

      // Check if animation is complete
      if (
        (increment > 0 && current >= endValue) ||
        (increment < 0 && current <= endValue)
      ) {
        clearInterval(animationRef.current);
        animationRef.current = null;
        setDisplayValue(endValue);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepTime);

    // Clean up on unmount or when dependencies change
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [resourceValue, actualProduction]); // Removed displayValue from dependency array

  // Optional initial setup
  useEffect(() => {
    // Set initial value without animation when component first mounts
    if (displayValue === 0 && actualProduction > 0) {
      setDisplayValue(actualProduction);
    }
  }, []); // Empty dependency array means it only runs once on mount

  return (
    <div className="resource-bar p-2 text-white rounded w-16">
      <span>
        <span className="text-yellow-400 mr-1">{icon}</span> {displayValue}
      </span>
    </div>
  );
}
