// components/TargetSelectionUI.jsx
import React, {
  forwardRef,
  useState,
  useImperativeHandle,
  useEffect,
} from "react";
import { useGameState } from "./gameState";
import ConfirmationModal from "./ConfirmationModal";
import { validateSourceCity, validateTargetCity } from "./PhaserGame";

const TargetSelectionUI = forwardRef((props, ref) => {
  const { state, dispatch } = useGameState();
  const { sourceCity, targetCity, currentPlayerId, targetSelectionActive } =
    state;
  const [validationFeedback, setValidationFeedback] = useState(null); // "valid" or "invalid"
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Expose a handleMapClick method via the ref so PhaserGame (via TurnUI) can call it.
  useImperativeHandle(ref, () => ({
    handleMapClick: (tile) => {
      if (!targetSelectionActive) return; // No active selection, ignore click

      let isValid = false;
      if (targetSelectionActive === "source") {
        isValid = validateSourceCity(tile, state, currentPlayerId);
        if (isValid) {
          dispatch({ type: "SET_SOURCE_CITY", payload: tile });
        }
      } else if (targetSelectionActive === "target") {
        isValid = validateTargetCity(tile, state, currentPlayerId);
        if (isValid) {
          dispatch({ type: "SET_TARGET_CITY", payload: tile });
        }
      }
      setValidationFeedback(isValid ? "valid" : "invalid");
    },
    // Optionally, you could expose a pointer-move handler here if you wish to update the highlighter
    // in real time from within the UI. For now, we let PhaserGame handle pointermove based on global state.
  }));

  // When both cities are selected, open the confirmation modal.
  useEffect(() => {
    if (sourceCity && targetCity) {
      setShowConfirmModal(true);
    }
  }, [sourceCity, targetCity]);

  const handleButtonClick = (selectionType) => {
    // Dispatch the active selection to the global state.
    dispatch({ type: "SET_TARGET_SELECTION_ACTIVE", payload: selectionType });
    setValidationFeedback(null);
  };

  const handleConfirm = () => {
    // Invoke the parent's callback to send target selection to the server.
    if (props.onTargetSelected) {
      props.onTargetSelected({ sourceCity, targetCity });
    }
    // Optionally, mark the player as ready for this step.
    // For example: dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });
    // And clear the active selection.
    dispatch({ type: "SET_TARGET_SELECTION_ACTIVE", payload: null });
  };

  return (
    <div className="absolute bottom-0 right-0 p-4 bg-neutral-800 rounded-lg border border-neutral-600">
      <h2 className="text-2xl font-bold mb-4 text-white">
        Select Source and Target Cities
      </h2>
      <div className="flex flex-col space-y-4">
        <button
          onClick={() => handleButtonClick("source")}
          className={`px-4 py-2 rounded text-white ${
            sourceCity
              ? "bg-green-500"
              : targetSelectionActive === "source"
              ? validationFeedback === "invalid"
                ? "bg-red-500"
                : "bg-yellow-500"
              : "bg-gray-700"
          }`}
        >
          {sourceCity ? "Source City Selected" : "Select Source City"}
        </button>
        <button
          onClick={() => handleButtonClick("target")}
          className={`px-4 py-2 rounded text-white ${
            targetCity
              ? "bg-green-500"
              : targetSelectionActive === "target"
              ? validationFeedback === "invalid"
                ? "bg-red-500"
                : "bg-yellow-500"
              : "bg-gray-700"
          }`}
        >
          {targetCity ? "Target City Selected" : "Select Target City"}
        </button>
      </div>
      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
          title="Confirm Target Selection"
          message="Are you sure you want to proceed with these source and target cities?"
          confirmText="Confirm"
          cancelText="Cancel"
        />
      )}
    </div>
  );
});

export default TargetSelectionUI;
