import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";
import GameCard from "./GameCard";

export function ConquerPhaseUI({
  onStructurePlacement,
  onArmyQueued,
  onTargetSelected,
  onCancelPlacement,
  onPhaseReady,
}) {
  const { state, dispatch } = useGameState();
  const {
    placingStructure,
    expansionComplete,
    queueingArmy,
    players,
    currentPlayerId,
  } = state;
  const [structuresReady, setStructuresReady] = useState(false);
  const [armiesReady, setArmiesReady] = useState(false);
  // This state controls whether the card panel is visible.
  const [showCardPanel, setShowCardPanel] = useState(true);
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // When a defensive card is clicked, enter placement mode and hide the card panel.
  const handleStructureClick = (structure) => {
    document.body.style.cursor = "crosshair";
    console.log("placing structure", structure);
    dispatch({ type: "SET_SELECTED_STRUCTURE", payload: structure });
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: true });
    setShowCardPanel(false);
  };

  // Internal cancel handler: calls the provided callback and re-shows the card panel.
  const handleCancelPlacementInternal = () => {
    onCancelPlacement();
    setShowCardPanel(true);
  };

  const handleStructuresReady = () => {
    setStructuresReady(true);
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
    dispatch({ type: "SET_QUEUING_ARMY", payload: true });
  };

  const handleArmiesReady = () => {
    setArmiesReady(true);
    dispatch({ type: "SET_QUEUING_ARMY", payload: false });
  };

  // When placing mode ends (structure is placed), re-show the card panel.
  useEffect(() => {
    if (!placingStructure) {
      setShowCardPanel(true);
    }
  }, [placingStructure]);

  return (
    <div>
      {/* Prompt displayed when placing a structure */}
      {placingStructure && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
          <h3 className="text-lg font-semibold">Placing Structure</h3>
          <p>Click on a valid tile in your territory to place the structure.</p>
          <button
            onClick={handleCancelPlacementInternal}
            className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom sweeping panel for defensive structure cards */}
      <div
        className={`absolute bottom-0 left-0 w-full h-2/5 bg-black bg-opacity-60 flex flex-col items-center z-20 py-2 overflow-hidden transform transition-transform duration-300 ${
          !showCardPanel ? "translate-y-full" : ""
        }`}
      >
        {/* Show progress if territory expansion is in progress */}
        {!expansionComplete && (
          <div className="text-center text-white">
            <p>Territory expansion in progress...</p>
          </div>
        )}

        {/* Once expansion is complete, show the defensive structure cards */}
        {expansionComplete && !structuresReady && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Place Defensive Structures
            </h3>
            {currentPlayer?.inventory &&
            currentPlayer.inventory.filter((card) => card.type === "defensive")
              .length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="flex flex-row space-x-2">
                  {currentPlayer.inventory
                    .filter((card) => card.type === "defensive")
                    .map((structure, index) => (
                      <div key={`defensive-${index}`} className="p-2">
                        <GameCard
                          card={structure}
                          onClick={() => handleStructureClick(structure)}
                          needsResource={false}
                        />
                      </div>
                    ))}
                </div>
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

        {/* Next step: Queue Armies */}
        {expansionComplete && structuresReady && !armiesReady && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Queue Armies
            </h3>
            {/* Insert UI for queueing armies here */}
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

        {/* Final step: Select Target City */}
        {expansionComplete && structuresReady && armiesReady && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Select Target City
            </h3>
            <p className="text-white text-center">
              Click on an enemy city on the map to target it.
            </p>
            <button
              onClick={() => onPhaseReady("conquer")}
              className="mt-2 px-4 py-2 rounded bg-green-500 text-white"
            >
              Ready (Conquer)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
