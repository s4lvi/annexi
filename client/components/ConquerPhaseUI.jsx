// ConquerPhaseUI.jsx
import React, { useState } from "react";
import { useGameState } from "./gameState";

export function ConquerPhaseUI({
  onStructurePlacement,
  onArmyQueued,
  onTargetSelected,
  onCancelPlacement,
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
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  const handleStructureClick = (structure) => {
    document.body.style.cursor = "crosshair";
    dispatch({ type: "SET_SELECTED_STRUCTURE", payload: structure });
    dispatch({ type: "SET_PLACING_STRUCTURE", payload: true });
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

  return (
    <div>
      {placingStructure && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
          <h3 className="text-lg font-semibold">Placing Structure</h3>
          <p>Click on a valid tile in your territory to place the structure.</p>
          <button
            onClick={onCancelPlacement}
            className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
        {!expansionComplete && (
          <div className="text-center text-white">
            <p>Territory expansion in progress...</p>
            {/* Insert spinner or animated progress indicator here */}
          </div>
        )}
        {expansionComplete && !structuresReady && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Place Defensive Structures
            </h3>
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
        {expansionComplete && structuresReady && !armiesReady && (
          <div className="w-full">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Queue Armies
            </h3>
            {currentPlayer?.cards?.units &&
            currentPlayer.cards.units.length > 0 ? (
              <div className="flex flex-wrap justify-center">
                {currentPlayer.cards.units.map((unit, index) => (
                  <div
                    key={`unit-${index}`}
                    className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer hover:bg-gray-700"
                    onClick={() => onArmyQueued(unit)}
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
    </div>
  );
}
