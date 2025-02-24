import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

import gameState from "./gameState";

const PhaseUI = forwardRef(
  (
    {
      phase,
      resourcesData,
      onCityPlacement,
      onCardSelected,
      onCancelPlacement,
    },
    ref
  ) => {
    const [cityPlaced, setCityPlaced] = useState(false);
    const [placingCity, setPlacingCity] = useState(false);
    const [uiHidden, setUIHidden] = useState(false);

    useEffect(() => {
      if (phase !== "expand") {
        setCityPlaced(false);
        setPlacingCity(false);
        setUIHidden(false);
      }
    }, [phase]);

    const handleBuildCityClick = () => {
      setPlacingCity(true);
      setUIHidden(true);
      gameState.setPlacingCity(true);
    };

    // This function is now exposed to the parent
    const handleMapClick = (tileInfo) => {
      console.log("phaseui Map clicked at", tileInfo, placingCity);
      if (placingCity) {
        const valid = validateCityPlacement(tileInfo);
        console.log("Valid city placement:", valid);
        if (valid) {
          setCityPlaced(true);
          setPlacingCity(false);
          setUIHidden(false);
          document.body.style.cursor = "default";
          // Call the parent's callback to send the message to the server
          onCityPlacement(tileInfo);
        }
      }
    };

    // Expose handleMapClick so that GameContainer can call it
    useImperativeHandle(ref, () => ({
      handleMapClick,
    }));

    const handleCancel = () => {
      setPlacingCity(false);
      setUIHidden(false);
      document.body.style.cursor = "default";
      if (onCancelPlacement) {
        onCancelPlacement();
      }
    };

    const containerClasses = `absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 transition-transform duration-500 ${
      uiHidden ? "translate-y-full" : "translate-y-0"
    }`;

    if (phase === "expand") {
      return (
        <>
          {placingCity && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
              <h3 className="text-lg font-semibold">Placing City</h3>
              <p>
                Click on a valid tile (grass and in your territory) to place
                your city.
              </p>
              <button
                onClick={handleCancel}
                className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          )}
          <div className={containerClasses}>
            {!cityPlaced && !placingCity && (
              <div
                className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer"
                onClick={handleBuildCityClick}
              >
                <h3 className="text-lg font-semibold">Build City</h3>
                <p>Click to place a new city in your territory.</p>
              </div>
            )}

            {cityPlaced && resourcesData?.cards && (
              <div className="flex flex-wrap justify-center">
                {resourcesData.cards.map((card, index) => {
                  const affordable = resourcesData.production >= card.cost;
                  return (
                    <div
                      key={index}
                      className={`bg-gray-800 text-white p-5 m-3 rounded-lg text-center cursor-pointer transition-opacity duration-300 ${
                        affordable
                          ? "opacity-100"
                          : "opacity-50 pointer-events-none"
                      }`}
                      onClick={() => onCardSelected(card)}
                    >
                      <h4 className="text-lg font-semibold">{card.name}</h4>
                      <p>Cost: {card.cost} Production</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      );
    } else if (phase === "conquer") {
      return (
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
          <div className="bg-gray-800 text-white p-5 m-3 rounded-lg text-center">
            <h3 className="text-lg font-semibold">Conquer Phase</h3>
          </div>
        </div>
      );
    }
    return null;
  }
);

function validateCityPlacement(tile) {
  // Example validation: tile must be grass.
  return tile.type === "grass";
}

export default PhaseUI;
