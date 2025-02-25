// ResolutionPhaseUI.jsx
import React from "react";

export function ResolutionPhaseUI() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
      <div className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
        <h3 className="text-lg font-semibold">Resolution Phase</h3>
        <p>Battle simulation in progress...</p>
      </div>
    </div>
  );
}
