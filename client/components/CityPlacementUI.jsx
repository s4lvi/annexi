// CityPlacementUI.jsx
import React, { useEffect, useState } from "react";
import { useGameState } from "./gameState";
import GameCard from "./GameCard";
import CardDisplayBar from "./CardDisplayBar.jsx";

const baseCityCard = {
  id: "base-city",
  name: "Base City",
  type: "city",
  cost: { production: 10 },
  effect: "Establish your capital city.",
};

export default function CityPlacementUI({
  onCityPlacement,
  onCancelPlacement,
}) {
  const { state, dispatch } = useGameState();
  const { placingCity, cityBuilt, players, currentPlayerId, turnStep } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  const [showPopup, setShowPopup] = useState(true);

  // Ensure placingCity is false when cityBuilt becomes true
  useEffect(() => {
    if (cityBuilt && placingCity) {
      dispatch({ type: "SET_PLACING_CITY", payload: false });
      document.body.style.cursor = "default";
    }
  }, [cityBuilt, placingCity, dispatch]);

  // If turnStep changes away from 0, turn off city placement
  useEffect(() => {
    if (turnStep !== 0 && placingCity) {
      dispatch({ type: "SET_PLACING_CITY", payload: false });
    }
  }, [turnStep, placingCity, dispatch]);

  // Reset showPopup when placingCity becomes active
  useEffect(() => {
    if (placingCity) {
      setShowPopup(true);
    }
  }, [placingCity]);

  const handleBuildCityClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = "crosshair";
    dispatch({ type: "SET_PLACING_CITY", payload: true });
    setShowPopup(true);
  };

  const handleCancelClick = () => {
    document.body.style.cursor = "default";
    dispatch({ type: "SET_PLACING_CITY", payload: false });
    if (onCancelPlacement) onCancelPlacement();
  };

  // Determine the title and message based on state
  let title = "Place Your City";
  let message = "You can build one city per turn to expand your empire.";

  if (cityBuilt) {
    title = "City Built!";
    message = "Click Ready to move to the next step.";
  }

  // Optional right content for the card bar
  let rightContent = null;
  if (placingCity) {
    rightContent = (
      <button
        onClick={handleCancelClick}
        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
      >
        Cancel Placement
      </button>
    );
  }

  return (
    <>
      {placingCity && showPopup && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 rounded-lg text-center z-30"
          onMouseEnter={() => setShowPopup(false)}
        >
          <h3 className="text-lg font-semibold">Placing City</h3>
          <p>Click on a valid tile (grass) to place your city.</p>
          <button
            className="mt-2 text-xs text-gray-400 hover:text-white"
            onClick={() => setShowPopup(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Wrapper to fade in/out the CardDisplayBar */}
      <div
        style={{
          opacity: placingCity ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        <CardDisplayBar
          title={title}
          message={message}
          rightContent={rightContent}
        >
          {!cityBuilt && (
            <GameCard
              card={baseCityCard}
              onClick={!placingCity ? handleBuildCityClick : undefined}
              isDisabled={
                placingCity ||
                currentPlayer?.production < baseCityCard.cost.production
              }
              ownedCount={0}
              currentProduction={currentPlayer?.production || 0}
            />
          )}
        </CardDisplayBar>
      </div>
    </>
  );
}
