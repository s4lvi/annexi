import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";
import CardDisplayBar from "./CardDisplayBar";

export default function TargetSelectionUI({ onTargetSelected }) {
  const { state, dispatch } = useGameState();
  const { players, currentPlayerId, cities, turnStep } = state;

  // State to track selection process
  const [sourceCitySelected, setSourceCitySelected] = useState(false);
  const [sourceCity, setSourceCity] = useState(null);
  const [targetCity, setTargetCity] = useState(null);
  const [message, setMessage] = useState(
    "Select one of your cities as the attack source."
  );

  // Get current player data
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // Filter cities owned by the current player that can be sources (capital or fortified)
  const eligibleSourceCities = cities.filter((city) => {
    return (
      city.playerId === currentPlayerId &&
      (city.type === "Capital City" || city.type === "Fortified City")
    );
  });

  // Filter cities owned by enemy players (can be any type)
  const enemyCities = cities.filter(
    (city) => city.playerId !== currentPlayerId
  );

  // Handle when a city is clicked on the map
  useEffect(() => {
    if (turnStep !== 5) return; // Only process during target selection step

    const handleMapCityClick = (tileInfo) => {
      // Check if the clicked tile contains a city
      const clickedCity = cities.find(
        (city) => city.x === tileInfo.x && city.y === tileInfo.y
      );

      if (!clickedCity) return; // Not a city tile

      if (!sourceCitySelected) {
        // First selection - Source city (must be owned by current player and eligible)
        const isEligibleSource = eligibleSourceCities.find(
          (city) => city.x === tileInfo.x && city.y === tileInfo.y
        );

        if (isEligibleSource) {
          setSourceCity(clickedCity);
          setSourceCitySelected(true);
          setMessage("Now select an enemy city to attack.");
          // Highlight source city on the map
          dispatch({ type: "SET_SOURCE_CITY", payload: clickedCity });
        } else if (clickedCity.playerId === currentPlayerId) {
          setMessage(
            "This city can't be used as an attack source. Select a Capital or Fortified City."
          );
        }
      } else {
        // Second selection - Target city (must be enemy city)
        if (clickedCity.playerId !== currentPlayerId) {
          setTargetCity(clickedCity);
          setMessage(
            `Targeting ${clickedCity.type} at (${clickedCity.x},${clickedCity.y}) from your city at (${sourceCity.x},${sourceCity.y})`
          );

          // Send the source and target selection to the server
          if (onTargetSelected) {
            onTargetSelected({
              sourceCity: sourceCity,
              targetCity: clickedCity,
            });
          }

          // Update game state with the selected target
          dispatch({ type: "SET_TARGET_CITY", payload: clickedCity });

          // Mark the player as ready for this step
          dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });
        } else {
          setMessage(
            "You must select an enemy city as your target. Click on a city owned by another player."
          );
        }
      }
    };

    // Add the handleMapCityClick function to the gameState context for PhaserGame to access
    dispatch({ type: "SET_MAP_CLICK_HANDLER", payload: handleMapCityClick });

    return () => {
      // Clean up when component unmounts
      dispatch({ type: "SET_MAP_CLICK_HANDLER", payload: null });
    };
  }, [
    turnStep,
    sourceCitySelected,
    sourceCity,
    cities,
    currentPlayerId,
    dispatch,
    onTargetSelected,
    eligibleSourceCities,
  ]);

  // Reset selections if the turn step changes
  useEffect(() => {
    setSourceCitySelected(false);
    setSourceCity(null);
    setTargetCity(null);
    setMessage("Select one of your cities as the attack source.");
  }, [turnStep]);

  // Create guidance text based on available cities
  let guidanceText = "";
  if (eligibleSourceCities.length === 0) {
    guidanceText =
      "You don't have any cities that can launch attacks. Build a Capital or Fortified City first.";
  } else if (enemyCities.length === 0) {
    guidanceText = "There are no enemy cities to attack yet.";
  } else {
    guidanceText = sourceCitySelected
      ? "Click on an enemy city to select it as your attack target."
      : "Click on one of your Capital or Fortified cities to select it as your attack source.";
  }

  // Right content for the CardDisplayBar - Reset button
  const rightContent =
    sourceCitySelected || targetCity ? (
      <button
        onClick={() => {
          setSourceCitySelected(false);
          setSourceCity(null);
          setTargetCity(null);
          setMessage("Select one of your cities as the attack source.");
          dispatch({ type: "SET_SOURCE_CITY", payload: null });
          dispatch({ type: "SET_TARGET_CITY", payload: null });
        }}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Reset Selection
      </button>
    ) : null;

  return (
    <CardDisplayBar
      title="Select Attack Source and Target"
      message={message}
      rightContent={rightContent}
    >
      <div className="target-selection-guidance text-white mb-4">
        {guidanceText}
      </div>

      {sourceCitySelected && (
        <div className="selection-status text-white">
          <p className="mb-2">
            <span className="font-bold">Source City:</span> ({sourceCity.x},{" "}
            {sourceCity.y})
          </p>
          {targetCity && (
            <p>
              <span className="font-bold">Target City:</span> ({targetCity.x},{" "}
              {targetCity.y})
            </p>
          )}
        </div>
      )}

      {/* Display visual of cities if needed here */}
    </CardDisplayBar>
  );
}
