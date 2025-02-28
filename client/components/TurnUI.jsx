// TurnUI.jsx
import React, { forwardRef, useImperativeHandle } from "react";
import { useGameState } from "./gameState";
import { validateCityPlacement, validateStructurePlacement } from "./PhaseUi";

// These components should render the UI for each turn step.
import CityPlacementUI from "./CityPlacementUI"; // Step 0: Collect resources & place city
import CardBuyingUI from "./CardBuyingUI"; // Step 1: Buy cards
import TerritoryExpansionUI from "./TerritoryExpansionUI"; // Step 2: Expand territory
import StructurePlacementUI from "./StructurePlacementUI"; // Step 3: Place structures
import ArmyQueueUI from "./ArmyQueueUI"; // Step 4: Queue army
import TargetSelectionUI from "./TargetSelectionUI"; // Step 5: Select target
import BattleUI from "./BattleUI"; // Step 6: Battle

// Optional: you can also display a label for the current step.
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

  // Enhanced map-click handler with validation
  const handleMapClick = (tileInfo) => {
    // Step 0: City Placement with validation
    if (turnStep === 0 && placingCity && props.onCityPlacement) {
      const isValid = validateCityPlacement(tileInfo, state);
      if (isValid) {
        props.onCityPlacement(tileInfo);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_CITY", payload: false });
      }
    }
    // Step 3: Structure Placement with validation
    else if (turnStep === 3 && placingStructure && props.onStructurePlacement) {
      const isValid = validateStructurePlacement(tileInfo, state);
      if (isValid) {
        props.onStructurePlacement(tileInfo, state.selectedStructure);
        document.body.style.cursor = "default";
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        dispatch({ type: "SET_SELECTED_STRUCTURE", payload: null });
      }
    }
    // Step 5: Target Selection
    else if (turnStep === 5 && props.onTargetSelected) {
      props.onTargetSelected(tileInfo);
    }
  };

  useImperativeHandle(ref, () => ({
    handleMapClick,
  }));

  // Render the appropriate UI component based solely on turnStep.
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
      return <TargetSelectionUI {...props} />;
    case 6:
      return <BattleUI {...props} />;
    default:
      return <div>Unknown Turn Step</div>;
  }
});

export default TurnUI;
