// TurnUI.jsx
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { useGameState } from "./gameState";
import {
  validateCityPlacement,
  validateStructurePlacement,
} from "./PhaserGame";

import CityPlacementUI from "./CityPlacementUI"; // Step 0
import CardBuyingUI from "./CardBuyingUI"; // Step 1
import TerritoryExpansionUI from "./TerritoryExpansionUI"; // Step 2
import StructurePlacementUI from "./StructurePlacementUI"; // Step 3
import ArmyQueueUI from "./ArmyQueueUI"; // Step 4
import TargetSelectionUI from "./TargetSelectionUI"; // Step 5
import BattleUI from "./BattleUI"; // Step 6

export const TURN_STEPS = [
  "Collect Resources & Place City",
  "Buy Cards",
  "Expand Territory",
  "Place Structures",
  "Queue Army",
  "Select Target",
  "Battle",
];

const TurnUI = forwardRef((props, ref) => {
  const { state, dispatch } = useGameState();
  const { turnStep, placingCity, placingStructure } = state;

  // Create a local ref for the TargetSelectionUI
  const targetSelectionRef = useRef(null);

  // Enhanced map-click handler with delegation.
  const handleMapClick = (tileInfo) => {
    if (turnStep === 0 && placingCity && props.onCityPlacement) {
      const isValid = validateCityPlacement(tileInfo, state);
      if (isValid) {
        props.onCityPlacement(tileInfo);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_CITY", payload: false });
      }
    } else if (
      turnStep === 3 &&
      placingStructure &&
      props.onStructurePlacement
    ) {
      const isValid = validateStructurePlacement(tileInfo, state);
      if (isValid) {
        props.onStructurePlacement(tileInfo, state.selectedStructure);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        dispatch({ type: "SET_SELECTED_STRUCTURE", payload: null });
      }
    } else if (turnStep === 5) {
      console.log("TurnUI: handleMapClick", tileInfo);
      if (
        targetSelectionRef.current &&
        typeof targetSelectionRef.current.handleMapClick === "function"
      ) {
        targetSelectionRef.current.handleMapClick(tileInfo);
      }
    }
  };

  // Expose handleMapClick to the parent via the forwarded ref.
  useImperativeHandle(ref, () => ({
    handleMapClick,
  }));

  // Render the appropriate UI component based on turnStep.
  switch (turnStep) {
    case 0:
      return <CityPlacementUI {...props} />;
    case 1:
      return <CardBuyingUI {...props} />;
    case 2:
      return <TerritoryExpansionUI {...props} />;
    case 3:
      return <StructurePlacementUI {...props} />;
    case 4:
      return <ArmyQueueUI {...props} />;
    case 5:
      return <TargetSelectionUI ref={targetSelectionRef} {...props} />;
    case 6:
      return <BattleUI {...props} />;
    default:
      return <div>Unknown Turn Step</div>;
  }
});

export default TurnUI;
