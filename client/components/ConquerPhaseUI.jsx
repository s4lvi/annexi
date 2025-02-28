// ConquerPhaseUI.jsx
import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";
import GameCard from "./GameCard";
import ArmyQueueUI from "./ArmyQueueUI"; // Your army queue component
import ConfirmationModal from "./ConfirmationModal";

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
  const [showCardPanel, setShowCardPanel] = useState(true);
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // When a defensive card is clicked, start placement mode and hide the card panel.
  const handleStructureClick = (structure) => {
    document.body.style.cursor = "crosshair";
    dispatch({ type: "SET_SELECTED_STRUCTURE", payload: structure });
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: true });
    setShowCardPanel(false);
  };

  // Cancel structure placement and re-show the card panel.
  const handleCancelPlacementInternal = () => {
    onCancelPlacement();
    setShowCardPanel(true);
  };

  // When structure placement is done, transition to the army queue step.
  // (If you want the panel to remain visible until the player decides to move on,
  // you might call this only when they're finished placing *all* structures.)
  const handleStructuresReady = () => {
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
    dispatch({ type: "SET_QUEUING_ARMY", payload: true });
  };

  // This effect ensures that if placingStructure becomes false (after a structure is placed),
  // the card panel is re-shown so the player can continue placing structures if desired.
  useEffect(() => {
    if (!placingStructure) {
      setShowCardPanel(true);
    }
  }, [placingStructure]);

  return (
    <div>
      {/* When placing a defensive structure */}
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

      {/* Bottom sweeping panel */}
      <div
        className={`absolute bottom-0 left-0 w-full h-2/5 bg-black bg-opacity-60 flex flex-col items-center z-20 py-2 overflow-hidden transform transition-transform duration-300 ${
          !showCardPanel ? "translate-y-full" : ""
        }`}
      >
        {/* While territory expansion is still in progress */}
        {!expansionComplete && (
          <div className="text-center text-white">
            <p>Territory expansion in progress...</p>
          </div>
        )}

        {/* Once expansion is complete and before army queuing begins, show defensive cards */}
        {expansionComplete && !queueingArmy && (
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

        {/* Army Queue UI: shown when the player is in the unit‐ordering step */}
        {expansionComplete && queueingArmy && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Queue Armies
            </h3>
            <ArmyQueueUI
              onArmyQueued={(queuedCards) => {
                onArmyQueued(queuedCards);
                // Mark the army queue as complete
                dispatch({ type: "SET_QUEUING_ARMY", payload: false });
              }}
            />
          </div>
        )}

        {/* Final step: target selection instructions */}
        {expansionComplete && !queueingArmy && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Select Target City
            </h3>
            <p className="text-white text-center">
              Click on an enemy city on the map to target it.
            </p>
            {/* The final readiness action is handled by the global ready button */}
          </div>
        )}
      </div>
    </div>
  );
}
