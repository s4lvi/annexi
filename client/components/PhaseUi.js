import React, { useEffect, forwardRef, useImperativeHandle } from "react";
import { useGameState } from "./gameState";

// Base city card definition (cost now 10 production)
const baseCityCard = {
  id: "base-city",
  name: "Base City",
  type: "city",
  cost: { production: 10 },
  effect: "Establish your capital city.",
};

const PhaseUI = forwardRef(
  ({ onCityPlacement, onCardSelected, onCancelPlacement }, ref) => {
    const { state, dispatch } = useGameState();
    const { placingCity, currentPlayerId, players, phase, cityBuilt } = state;

    // Get current player resources directly from gameState
    const currentPlayer = players.find((p) => p.id === currentPlayerId);

    useEffect(() => {
      if (phase !== "expand") {
        dispatch({ type: "SET_PLACING_CITY", payload: false });
      }
    }, [phase, dispatch]);

    // Called when the user clicks the base city card.
    const handleBuildCityClick = (e) => {
      // Prevent any default action that might refresh the page.
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
      console.log("Building city...");
      document.body.style.cursor = "crosshair"; // Set cursor for city placement
      dispatch({ type: "SET_PLACING_CITY", payload: true });
    };

    // Expose handleMapClick to the parent.
    const handleMapClick = (tileInfo) => {
      if (placingCity) {
        const valid = validateCityPlacement(tileInfo);
        console.log("Valid city placement:", valid);
        if (valid) {
          onCityPlacement(tileInfo);
          document.body.style.cursor = "default"; // Reset cursor
          dispatch({ type: "SET_PLACING_CITY", payload: false });
        }
      }
    };

    useImperativeHandle(ref, () => ({
      handleMapClick,
    }));

    const handleCancel = () => {
      document.body.style.cursor = "default"; // Reset cursor
      dispatch({ type: "SET_PLACING_CITY", payload: false });
      if (onCancelPlacement) {
        onCancelPlacement();
      }
    };

    // Hide card container when placing city
    const containerClasses = `absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 transition-transform duration-500 ${
      placingCity ? "translate-y-full" : "translate-y-0"
    }`;

    // Debug log to check current player
    console.log("PhaseUI currentPlayer:", currentPlayer);

    // Helper to render card based on card data structure
    const renderCard = (card, index, groupName = "") => {
      if (!card || !currentPlayer) return null;

      const affordable =
        currentPlayer.production >= (card.cost?.production || 0);

      return (
        <div
          key={`${groupName}-${index}-${card.id}`}
          className={`bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer transition-opacity duration-300 ${
            affordable
              ? "opacity-100 hover:bg-gray-700"
              : "opacity-50 pointer-events-none"
          }`}
          onClick={() => onCardSelected(card)}
        >
          <h4 className="text-lg font-semibold">{card.name}</h4>
          <p className="text-sm">
            Cost: {card.cost?.production || 0} Production
          </p>
          <p className="text-xs">{card.effect}</p>
        </div>
      );
    };

    if (phase === "expand") {
      return (
        <>
          {placingCity && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
              <h3 className="text-lg font-semibold">Placing City</h3>
              <p>
                Click on a valid tile (grass and in your territory) to place
                your city.
              </p>
              <button
                onClick={handleCancel}
                type="button"
                className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          )}
          <div className={containerClasses}>
            {!cityBuilt && !placingCity && (
              <button
                className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                onClick={handleBuildCityClick}
                type="button"
              >
                <h3 className="text-lg font-semibold">{baseCityCard.name}</h3>
                <p>{baseCityCard.effect}</p>
                <p className="text-sm">
                  Cost: {baseCityCard.cost.production} Production
                </p>
              </button>
            )}
            {cityBuilt && currentPlayer && (
              <div className="flex flex-wrap justify-center">
                {/* Handle grouped card objects: cards are in { citycards: [], resourcestructures: [], ... } */}
                {currentPlayer.cards &&
                  typeof currentPlayer.cards === "object" &&
                  !Array.isArray(currentPlayer.cards) &&
                  Object.entries(currentPlayer.cards).map(([group, cards]) => (
                    <React.Fragment key={group}>
                      {Array.isArray(cards) &&
                        cards.map((card, index) =>
                          renderCard(card, index, group)
                        )}
                    </React.Fragment>
                  ))}

                {/* Handle direct array of cards */}
                {currentPlayer.cards &&
                  Array.isArray(currentPlayer.cards) &&
                  currentPlayer.cards.map((card, index) =>
                    renderCard(card, index, "card")
                  )}
              </div>
            )}
          </div>
        </>
      );
    } else if (phase === "conquer") {
      return (
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
          <div className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
            <h3 className="text-lg font-semibold">Conquer Phase</h3>
          </div>
        </div>
      );
    }
    return null;
  }
);

function validateCityPlacement(tile) {
  return tile.type === "grass";
}

export default PhaseUI;
