import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import gameState from "./gameState";

// Base city card definition (cost now 10 production)
const baseCityCard = {
  id: "base-city",
  name: "Base City",
  type: "city",
  cost: { production: 10 },
  effect: "Establish your capital city.",
};

const PhaseUI = forwardRef(
  (
    {
      phase,
      resourcesData, // Expected: { production, cards: { citycards, resourcestructures, defensivestructures, units, effects } }
      cityBuilt, // New prop from GameContainer
      onCityPlacement,
      onCardSelected,
      onCancelPlacement,
    },
    ref
  ) => {
    // Local state for when the player is in the process of placing a city.
    const [placingCity, setPlacingCity] = useState(false);

    useEffect(() => {
      if (phase !== "expand") {
        setPlacingCity(false);
      }
    }, [phase]);

    // Called when the user clicks the base city card.
    const handleBuildCityClick = () => {
      setPlacingCity(true);
      // Hide the rest of the UI while placing.
      gameState.setPlacingCity(true);
    };

    // This function is exposed to the parent (GameContainer) to be used when a map tile is clicked.
    const handleMapClick = (tileInfo) => {
      //console.log("PhaseUI: Map clicked at", tileInfo, placingCity);
      if (placingCity) {
        const valid = validateCityPlacement(tileInfo);
        console.log("Valid city placement:", valid);
        if (valid) {
          // We do not immediately mark the city as built.
          // We call onCityPlacement and wait for the server's buildCitySuccess response.
          onCityPlacement(tileInfo);
          setPlacingCity(false);
          gameState.setPlacingCity(false);
        }
      }
    };

    // Expose handleMapClick to the parent.
    useImperativeHandle(ref, () => ({
      handleMapClick,
    }));

    const handleCancel = () => {
      setPlacingCity(false);
      document.body.style.cursor = "default";
      gameState.setPlacingCity(false);
      if (onCancelPlacement) {
        onCancelPlacement();
      }
    };

    // Container classes for UI transition.
    const containerClasses = `absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 transition-transform duration-500 ${
      placingCity ? "translate-y-0" : ""
    }`;

    if (phase === "expand") {
      return (
        <>
          {placingCity && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
              <h3 className="text-lg font-semibold">Placing City</h3>
              <p>
                Click on a valid tile (grass and in your territory) to place
                your city.
              </p>
              <button
                onClick={handleCancel}
                className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          )}
          <div className={containerClasses}>
            {/* If no city has been built yet and not currently placing one, show Base City card */}
            {!cityBuilt && !placingCity && (
              <div
                className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                onClick={handleBuildCityClick}
              >
                <h3 className="text-lg font-semibold">{baseCityCard.name}</h3>
                <p>{baseCityCard.effect}</p>
                <p className="text-sm">
                  Cost: {baseCityCard.cost.production} Production
                </p>
              </div>
            )}

            {/* Once the city is built, show available cards for purchase */}
            {cityBuilt && resourcesData?.cards && (
              <div className="flex flex-wrap justify-center">
                {Object.entries(resourcesData.cards).map(([group, cards]) =>
                  cards.map((card, index) => {
                    const affordable =
                      resourcesData.production >= card.cost.production;
                    return (
                      <div
                        key={`${group}-${index}`}
                        className={`bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer transition-opacity duration-300 ${
                          affordable
                            ? "opacity-100"
                            : "opacity-50 pointer-events-none"
                        }`}
                        onClick={() => onCardSelected(card)}
                      >
                        <h4 className="text-lg font-semibold">{card.name}</h4>
                        <p className="text-sm">
                          Cost: {card.cost.production} Production
                        </p>
                        <p className="text-xs">{card.effect}</p>
                      </div>
                    );
                  })
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
  // Example validation: tile must be grass.
  return tile.type === "grass";
}

export default PhaseUI;
