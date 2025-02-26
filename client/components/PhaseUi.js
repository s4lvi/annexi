// PhaseUI.jsx (updated handleMapClick)
import React, { forwardRef, useImperativeHandle } from "react";
import { useGameState } from "./gameState";
import { ExpandPhaseUI } from "./ExpandPhaseUI";
import { ConquerPhaseUI } from "./ConquerPhaseUI";
import { ResolutionPhaseUI } from "./ResolutionPhaseUI";

// Validation functions (or import them if moved elsewhere)
export const validateCityPlacement = (tile, state) => {
  // Always check the basic tile type
  if (tile.type !== "grass") return false;

  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // If this is the player's first city, they can place anywhere on grass
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }

  // Check if the tile is within the player's territory
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

export const validateStructurePlacement = (tile, state) => {
  // Always check the basic tile type
  if (tile.type !== "grass") return false;

  const { players, currentPlayerId, territories } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // If this is the player's first city, they can place anywhere on grass
  if (
    !currentPlayer ||
    !territories[currentPlayerId] ||
    territories[currentPlayerId].length === 0
  ) {
    return true;
  }

  // Check if the tile is within the player's territory
  const playerTerritory = territories[currentPlayerId] || [];
  return playerTerritory.some((t) => t.x === tile.x && t.y === tile.y);
};

const validateTargetSelection = (tile, currentPlayerId) => {
  // For now return true; you can improve this logic later.
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
  // PhaseUI.jsx
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
      // Validate placement for structures (reusing a similar validation function)
      const valid = validateStructurePlacement(tileInfo, state);
      console.log("Valid structure placement:", valid);
      if (valid && props.onStructurePlacement) {
        // Pass the selected structure along with the tile information
        props.onStructurePlacement(tileInfo, state.selectedStructure);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        // Clear the selected structure after placement
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

  // PhaseUI.jsx (excerpt)
  if (phase === "expand") {
    return <ExpandPhaseUI {...commonProps} onPhaseReady={props.onPhaseReady} />;
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
