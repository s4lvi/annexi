import React, { forwardRef, useImperativeHandle } from "react";
import { useGameState } from "./gameState";
import { ExpandPhaseUI } from "./ExpandPhaseUI";
import { ConquerPhaseUI } from "./ConquerPhaseUI";
import { ResolutionPhaseUI } from "./ResolutionPhaseUI";

// Validation functions remain unchanged...
export const validateCityPlacement = (tile, state) => {
  if (tile.type !== "grass") return false;
  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

export const validateStructurePlacement = (tile, state) => {
  if (tile.type !== "grass") return false;
  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

const validateTargetSelection = (tile, currentPlayerId) => {
  return true;
};

const PhaseUI = forwardRef((props, ref) => {
  const { state, dispatch } = useGameState();
  const {
    phase,
    placingCity,
    placingStructure,
    queueingArmy,
    expansionComplete,
    currentPlayerId,
    turnStep,
  } = state;
  const commonProps = {
    onCityPlacement: props.onCityPlacement,
    onCardSelected: props.onCardSelected,
    onStructurePlacement: props.onStructurePlacement,
    onArmyQueued: props.onArmyQueued,
    onTargetSelected: props.onTargetSelected,
    onCancelPlacement: props.onCancelPlacement,
  };

  // Map click handler delegated based on phase.
  const handleMapClick = (tileInfo) => {
    if (phase === "expand" && placingCity) {
      const valid = validateCityPlacement(tileInfo, state);
      console.log("Valid city placement:", valid);
      if (valid) {
        props.onCityPlacement(tileInfo);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_CITY", payload: false });
      }
    } else if (phase === "conquer" && placingStructure && expansionComplete) {
      const valid = validateStructurePlacement(tileInfo, state);
      console.log("Valid structure placement:", valid);
      if (valid && props.onStructurePlacement) {
        props.onStructurePlacement(tileInfo, state.selectedStructure);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        dispatch({ type: "SET_SELECTED_STRUCTURE", payload: null });
      }
    } else if (phase === "conquer" && !placingStructure && !queueingArmy) {
      const valid = validateTargetSelection(tileInfo, currentPlayerId);
      if (valid && props.onTargetSelected) {
        props.onTargetSelected(tileInfo);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    handleMapClick,
  }));

  // Use turnStep to determine what to render for the expand phase.
  if (phase === "expand") {
    if (turnStep <= 1) {
      return (
        <ExpandPhaseUI {...commonProps} onPhaseReady={props.onPhaseReady} />
      );
    } else {
      return (
        <div className="absolute bottom-0 left-0 w-full h-2/5 bg-black bg-opacity-60 flex flex-col items-center z-20 py-2 overflow-hidden">
          <h3 className="text-xl font-bold text-center text-white mb-4">
            Card purchasing complete.
          </h3>
          <p className="text-white text-center">
            Waiting for territory expansion...
          </p>
        </div>
      );
    }
  } else if (phase === "conquer") {
    return (
      <ConquerPhaseUI {...commonProps} onPhaseReady={props.onPhaseReady} />
    );
  } else if (phase === "resolution") {
    return <ResolutionPhaseUI {...commonProps} />;
  }

  return null;
});

export default PhaseUI;
