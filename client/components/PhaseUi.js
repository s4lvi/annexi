// PhaseUI.jsx (updated handleMapClick)
import React, { forwardRef, useImperativeHandle } from "react";
import { useGameState } from "./gameState";
import { ExpandPhaseUI } from "./ExpandPhaseUI";
import { ConquerPhaseUI } from "./ConquerPhaseUI";
import { ResolutionPhaseUI } from "./ResolutionPhaseUI";

// Validation functions (or import them if moved elsewhere)
const validateCityPlacement = (tile) => tile.type === "grass";
const validateStructurePlacement = (tile, currentPlayerId) => {
  // Add your own logic here; for now return true.
  return true;
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
  const handleMapClick = (tileInfo) => {
    if (phase === "expand" && placingCity) {
      const valid = validateCityPlacement(tileInfo);
      console.log("Valid city placement:", valid);
      if (valid) {
        // Pass the tile info back to the parent so it can build the city.
        props.onCityPlacement(tileInfo);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_CITY", payload: false });
      }
    } else if (phase === "conquer" && placingStructure && expansionComplete) {
      const valid = validateStructurePlacement(tileInfo, currentPlayerId);
      console.log("Valid structure placement:", valid);
      if (valid && props.onStructurePlacement) {
        props.onStructurePlacement(tileInfo);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
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

  if (phase === "expand") {
    return <ExpandPhaseUI {...commonProps} />;
  } else if (phase === "conquer") {
    return <ConquerPhaseUI {...commonProps} />;
  } else if (phase === "resolution") {
    return <ResolutionPhaseUI {...commonProps} />;
  }
  return null;
});

export default PhaseUI;
