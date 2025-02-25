import React, {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
} from "react";
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
  (
    {
      onCityPlacement,
      onCardSelected,
      onStructurePlacement,
      onArmyQueued,
      onTargetSelected,
      onCancelPlacement,
    },
    ref
  ) => {
    const { state, dispatch } = useGameState();
    const {
      placingCity,
      currentPlayerId,
      players,
      phase,
      cityBuilt,
      expansionComplete,
      placingStructure,
      selectedStructure,
      queueingArmy,
    } = state;

    // Local state for tracking UI elements
    const [structuresReady, setStructuresReady] = useState(false);
    const [armiesReady, setArmiesReady] = useState(false);

    // Get current player resources directly from gameState
    const currentPlayer = players.find((p) => p._id === currentPlayerId);

    // Enhanced debug logging
    useEffect(() => {
      console.log("PhaseUI - Current phase:", phase);
      console.log("PhaseUI - cityBuilt flag:", cityBuilt);
      console.log(
        "PhaseUI - current player:",
        currentPlayerId
          ? players.find((p) => p._id === currentPlayerId)
          : "No current player"
      );
    }, [phase, cityBuilt, currentPlayerId, players]);

    // Reset UI state when phase changes
    useEffect(() => {
      if (phase === "expand") {
        dispatch({ type: "SET_PLACING_CITY", payload: false });
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        dispatch({ type: "SET_QUEUING_ARMY", payload: false });
        setStructuresReady(false);
        setArmiesReady(false);
      } else if (phase === "conquer") {
        // Reset placement flags at start of conquer phase
        dispatch({ type: "SET_PLACING_CITY", payload: false });
        // Territory expansion happens automatically
      }
    }, [phase, dispatch]);

    // Reset expansionComplete when phase changes
    useEffect(() => {
      if (phase !== "conquer") {
        dispatch({ type: "SET_EXPANSION_COMPLETE", payload: false });
      }
    }, [phase, dispatch]);

    // Called when the user clicks the base city card.
    const handleBuildCityClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Building city...");
      document.body.style.cursor = "crosshair";
      dispatch({ type: "SET_PLACING_CITY", payload: true });
    };

    // Called when the user selects a structure to place
    const handleStructureClick = (structure) => {
      console.log("Selected structure:", structure);
      document.body.style.cursor = "crosshair";
      dispatch({ type: "SET_SELECTED_STRUCTURE", payload: structure });
      dispatch({ type: "SET_PLACING_STRUCTURE", payload: true });
    };

    // Called when the user selects an army to queue
    const handleArmyClick = (army) => {
      console.log("Selected army:", army);
      if (onArmyQueued) {
        onArmyQueued(army);
      }
    };

    // Expose handleMapClick to the parent.
    const handleMapClick = (tileInfo) => {
      if (placingCity && phase === "expand") {
        const valid = validateCityPlacement(tileInfo);
        console.log("Valid city placement:", valid);
        if (valid) {
          onCityPlacement(tileInfo);
          document.body.style.cursor = "default";
          dispatch({ type: "SET_PLACING_CITY", payload: false });
        }
      } else if (placingStructure && phase === "conquer" && expansionComplete) {
        const valid = validateStructurePlacement(tileInfo, currentPlayerId);
        console.log("Valid structure placement:", valid);
        if (valid && onStructurePlacement) {
          onStructurePlacement(tileInfo, selectedStructure);
          document.body.style.cursor = "default";
          dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        }
      } else if (phase === "conquer" && !placingStructure && !queueingArmy) {
        // Potentially selecting an enemy city as a target
        const valid = validateTargetSelection(tileInfo, currentPlayerId);
        if (valid && onTargetSelected) {
          onTargetSelected(tileInfo);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      handleMapClick,
    }));

    const handleCancel = () => {
      document.body.style.cursor = "default";
      dispatch({ type: "SET_PLACING_CITY", payload: false });
      dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
      if (onCancelPlacement) {
        onCancelPlacement();
      }
    };

    // Mark structures placement as complete
    const handleStructuresReady = () => {
      setStructuresReady(true);
      dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
      dispatch({ type: "SET_QUEUING_ARMY", payload: true });
    };

    // Mark army queuing as complete
    const handleArmiesReady = () => {
      setArmiesReady(true);
      dispatch({ type: "SET_QUEUING_ARMY", payload: false });
    };

    // Hide card container when placing something
    const containerClasses = `absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 transition-transform duration-500 ${
      placingCity || placingStructure ? "translate-y-full" : "translate-y-0"
    }`;

    // Helper to render card based on card data structure
    const renderCard = (card, index, groupName = "") => {
      if (!card || !currentPlayer) return null;

      const affordable =
        currentPlayer.production >= (card.cost?.production || 0);

      return (
        <div
          key={`${groupName}-${index}-${card.id}`}
          className={`bg-gray-800 text-white p-2 m-1 rounded-lg text-center cursor-pointer transition-opacity duration-300 ${
            affordable
              ? "opacity-100 hover:bg-gray-700"
              : "opacity-50 pointer-events-none"
          }`}
          onClick={() => affordable && onCardSelected(card)}
        >
          <h4 className="text-lg font-semibold">{card.name}</h4>
          <p className="text-sm">
            Cost: {card.cost?.production || 0} Production
          </p>
          {/* <p className="text-xs">{card.effect}</p> */}
          {affordable ? (
            <button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded">
              Purchase
            </button>
          ) : (
            <p className="mt-2 text-red-400 text-xs">Insufficient resources</p>
          )}
        </div>
      );
    };

    // EXPANSION PHASE UI
    if (phase === "expand") {
      return (
        <>
          {placingCity && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
              <h3 className="text-lg font-semibold">Placing City</h3>
              <p>Click on a valid tile (grass) to place your city.</p>
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
            <h2 className="text-xl font-bold text-white mb-4">
              Expansion Phase
            </h2>

            {/* Show the city card when not already built and not currently placing */}
            {!cityBuilt && !placingCity && (
              <div className="text-center">
                <p className="text-white mb-4">
                  Build a new city or purchase cards with your resources.
                </p>
                <button
                  className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                  onClick={handleBuildCityClick}
                  type="button"
                  disabled={
                    currentPlayer?.production < baseCityCard.cost.production
                  }
                >
                  <h3 className="text-lg font-semibold">{baseCityCard.name}</h3>
                  <p>{baseCityCard.effect}</p>
                  <p className="text-sm">
                    Cost: {baseCityCard.cost.production} Production
                  </p>
                  {currentPlayer?.production < baseCityCard.cost.production && (
                    <p className="text-red-400 text-xs mt-2">
                      Insufficient resources
                    </p>
                  )}
                </button>
                <p className="text-gray-400 text-xs mt-2">
                  {cityBuilt
                    ? "You have already built a city this turn."
                    : "You can build one city per turn."}
                </p>
              </div>
            )}

            {/* Show cards after city is built */}
            {cityBuilt && currentPlayer && (
              <div className="w-full overflow-x-auto">
                <h3 className="text-xl font-bold text-center text-white mb-4">
                  Available Cards
                </h3>

                {/* Check if cards exist */}
                {(!currentPlayer.cards ||
                  (typeof currentPlayer.cards === "object" &&
                    Object.keys(currentPlayer.cards).length === 0) ||
                  (Array.isArray(currentPlayer.cards) &&
                    currentPlayer.cards.length === 0)) && (
                  <p className="text-white text-center">No cards available.</p>
                )}

                {/* Group cards by category with headers */}
                <div className="flex flex-row justify-center">
                  {/* Handle grouped card objects */}
                  {currentPlayer.cards &&
                    typeof currentPlayer.cards === "object" &&
                    !Array.isArray(currentPlayer.cards) &&
                    // Filter out citycards from the entries
                    Object.entries(currentPlayer.cards)
                      .filter(([group]) => group !== "citycards") // Filter out city cards
                      .map(([group, cards]) => {
                        // Skip empty card groups
                        if (!Array.isArray(cards) || cards.length === 0)
                          return null;

                        // Create a readable group name
                        const groupTitle =
                          group === "resourcestructures"
                            ? "Resource Structures"
                            : group === "defensivestructures"
                            ? "Defensive Structures"
                            : group === "units"
                            ? "Units"
                            : group === "effects"
                            ? "Effect Cards"
                            : group;

                        return (
                          <div key={group} className="mb-1">
                            <h4 className="text-lg font-semibold text-white mb-3 text-center">
                              {groupTitle}
                            </h4>
                            {/* Grid layout for cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-2">
                              {Array.isArray(cards) &&
                                cards.map((card, index) =>
                                  renderCard(card, index, group)
                                )}
                            </div>
                          </div>
                        );
                      })}
                  {/* Handle direct array of cards (fallback) */}
                  {currentPlayer.cards &&
                    Array.isArray(currentPlayer.cards) &&
                    currentPlayer.cards.length > 0 && (
                      <div className="w-full">
                        <h4 className="text-lg font-semibold text-white mb-2 text-center">
                          Available Cards
                        </h4>
                        <div className="flex flex-wrap justify-center">
                          {currentPlayer.cards.map((card, index) =>
                            renderCard(card, index, "card")
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </>
      );
    }
    // CONQUER PHASE UI
    else if (phase === "conquer") {
      return (
        <>
          {placingStructure && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
              <h3 className="text-lg font-semibold">
                Placing {selectedStructure?.name || "Structure"}
              </h3>
              <p>
                Click on a valid tile in your territory to place the structure.
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
            <h2 className="text-xl font-bold text-white mb-4">Conquer Phase</h2>

            {/* Expansion in progress - show spinner */}
            {!expansionComplete && (
              <div className="text-center text-white">
                <p>Territory expansion in progress...</p>
                <div className="w-16 h-16 relative mx-auto mt-4">
                  {/* Multiple concentric circles animating outward */}
                  <div
                    className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping"
                    style={{ animationDuration: "2s", animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping"
                    style={{ animationDuration: "2.5s", animationDelay: "1s" }}
                  ></div>
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-full"></div>
                </div>
                <p className="text-sm mt-6 text-gray-400">
                  Territory is expanding in concentric rings from your cities.
                  <br />
                  Natural barriers (mountains, water) will be excluded.
                </p>
              </div>
            )}

            {/* Expansion complete - show defensive structure controls */}
            {expansionComplete && !structuresReady && (
              <div className="w-full">
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                  Place Defensive Structures
                </h3>

                {/* Show defensive structures if they exist */}
                {currentPlayer?.cards?.defensivestructures &&
                currentPlayer.cards.defensivestructures.length > 0 ? (
                  <div className="flex flex-wrap justify-center">
                    {currentPlayer.cards.defensivestructures.map(
                      (structure, index) => (
                        <div
                          key={`structure-${index}`}
                          className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                          onClick={() => handleStructureClick(structure)}
                        >
                          <h4 className="text-lg font-semibold">
                            {structure.name}
                          </h4>
                          <p className="text-xs">{structure.effect}</p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-white text-center mb-4">
                    No defensive structures available.
                  </p>
                )}

                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleStructuresReady}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Done Placing Structures
                  </button>
                </div>
              </div>
            )}

            {/* Army queuing controls */}
            {expansionComplete && structuresReady && !armiesReady && (
              <div className="w-full">
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                  Queue Armies
                </h3>

                {/* Show units for armies if they exist */}
                {currentPlayer?.cards?.units &&
                currentPlayer.cards.units.length > 0 ? (
                  <div className="flex flex-wrap justify-center">
                    {currentPlayer.cards.units.map((unit, index) => (
                      <div
                        key={`unit-${index}`}
                        className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                        onClick={() => handleArmyClick(unit)}
                      >
                        <h4 className="text-lg font-semibold">{unit.name}</h4>
                        <p className="text-xs">{unit.effect}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white text-center mb-4">
                    No army units available.
                  </p>
                )}

                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleArmiesReady}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Done Queuing Armies
                  </button>
                </div>
              </div>
            )}

            {/* Target selection */}
            {expansionComplete && structuresReady && armiesReady && (
              <div className="w-full">
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                  Select Target City
                </h3>
                <p className="text-white text-center">
                  Click on an enemy city on the map to target it.
                </p>
              </div>
            )}
          </div>
        </>
      );
    }
    // RESOLUTION PHASE UI
    else if (phase === "resolution") {
      return (
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
          <div className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
            <h3 className="text-lg font-semibold">Resolution Phase</h3>
            <p>Battle simulation in progress...</p>
          </div>
        </div>
      );
    }

    return null;
  }
);

// Validation functions
function validateCityPlacement(tile) {
  return tile.type === "grass";
}

function validateStructurePlacement(tile, currentPlayerId) {
  // This would check if the tile is in the player's territory
  // For demonstration, returning true
  return true;
}

function validateTargetSelection(tile, currentPlayerId) {
  // Check if the tile has a city and belongs to an enemy
  // For demonstration, returning true
  return true;
}

export default PhaseUI;
