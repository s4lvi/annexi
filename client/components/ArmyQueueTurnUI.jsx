// ArmyQueueTurnUI.jsx
import React from "react";
//import ArmyQueueUI from "./ArmyQueueUI"; // Assuming you have an ArmyQueueUI component

export default function ArmyQueueTurnUI({ onArmyQueued, onPhaseReady }) {
  return (
    <div className="absolute bottom-0 left-0 w-full h-2/5 bg-black bg-opacity-60 flex flex-col items-center z-20 py-2 overflow-hidden">
      <h3 className="text-lg font-semibold text-white mb-2 text-center">
        Queue Army Units
      </h3>
      {/* <ArmyQueueUI
        onArmyQueued={(queuedCards) => {
          onArmyQueued && onArmyQueued(queuedCards);
          onPhaseReady && onPhaseReady();
        }}
      /> */}
    </div>
  );
}
