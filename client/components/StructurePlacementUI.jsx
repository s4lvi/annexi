// StructurePlacementUI.jsx
import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";
import GameCard from "./GameCard";
import CardDisplayBar from "./CardDisplayBar.jsx";

export default function StructurePlacementUI({
  onStructurePlacement,
  onPhaseReady,
}) {
  const { state, dispatch } = useGameState();
  const {
    placingStructure,
    expansionComplete,
    players,
    currentPlayerId,
    selectedStructure,
  } = state;
  const [showCardPanel, setShowCardPanel] = useState(true);
  const [showPopup, setShowPopup] = useState(true);
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  const handleStructureClick = (structure) => {
    document.body.style.cursor = "crosshair";
    dispatch({ type: "SET_SELECTED_STRUCTURE", payload: structure });
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: true });
    setShowCardPanel(false);
    setShowPopup(true);
  };

  const handleCancelPlacementInternal = () => {
    // Callback to cancel placement.
    document.body.style.cursor = "default";
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
    dispatch({ type: "SET_SELECTED_STRUCTURE", payload: null });
    setShowCardPanel(true);
  };

  const handleStructuresReady = () => {
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
    // When done, the global ready button will be used.
    onPhaseReady && onPhaseReady();
  };

  useEffect(() => {
    if (!placingStructure) {
      setShowCardPanel(true);
    }
  }, [placingStructure]);

  // Reset showPopup when placingStructure changes
  useEffect(() => {
    if (placingStructure) {
      setShowPopup(true);
    }
  }, [placingStructure]);

  // Get available defensive structures
  const defensiveStructures = currentPlayer?.inventory
    ? currentPlayer.inventory.filter((card) => card.type === "defensive")
    : [];

  // Determine title and message based on state
  let title = "";
  let message = "";

  if (!expansionComplete) {
    title = "Territory Expansion in Progress";
    message = "Please wait for territory expansion to complete.";
  } else if (defensiveStructures.length === 0) {
    title = "No Defensive Structures Available";
    message = "Click Ready to proceed to the next step.";
  } else if (placingStructure) {
    title = `Placing ${selectedStructure?.name || "Structure"}`;
    message = "Click on your territory to place the selected structure.";
  } else {
    title = "Place Defensive Structures";
    message = "Select a structure to place in your territory.";
  }

  // Optional right content for the card bar
  const rightContent = placingStructure ? (
    <button
      onClick={handleCancelPlacementInternal}
      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
    >
      Cancel Placement
    </button>
  ) : null;

  return (
    <>
      {placingStructure && showPopup && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 rounded-lg text-center z-30"
          onMouseEnter={() => setShowPopup(false)}
        >
          <h3 className="text-lg font-semibold">
            Placing {selectedStructure?.name || "Structure"}
          </h3>
          <p>Click on a valid tile in your territory to place the structure.</p>
          <button
            className="mt-2 text-xs text-gray-400 hover:text-white"
            onClick={() => setShowPopup(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      <CardDisplayBar
        title={title}
        message={message}
        rightContent={rightContent}
      >
        {expansionComplete &&
          showCardPanel &&
          defensiveStructures.length > 0 &&
          defensiveStructures.map((structure, index) => (
            <GameCard
              key={`defensive-${index}`}
              card={structure}
              onClick={() => handleStructureClick(structure)}
              needsResource={false}
            />
          ))}
      </CardDisplayBar>
    </>
  );
}
