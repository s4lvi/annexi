// ExpandPhaseUI.jsx
import React, { useState } from "react";
import { useGameState } from "./gameState";
import ConfirmationModal from "./ConfirmationModal";

const baseCityCard = {
  id: "base-city",
  name: "Base City",
  type: "city",
  cost: { production: 10 },
  effect: "Establish your capital city.",
};

export function ExpandPhaseUI({
  onCityPlacement,
  onCardSelected,
  onCancelPlacement,
}) {
  const { state, dispatch } = useGameState();
  const { placingCity, cityBuilt, players, currentPlayerId, availableCards } =
    state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // State for confirmation modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  // Count owned cards
  const getOwnedCardCount = (cardId) => {
    if (!currentPlayer || !currentPlayer.cards) return 0;

    // Search through all card categories
    let count = 0;
    Object.values(currentPlayer.cards).forEach((category) => {
      category.forEach((card) => {
        if (card.id === cardId) count++;
      });
    });

    return count;
  };

  const handleBuildCityClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = "crosshair";
    dispatch({ type: "SET_PLACING_CITY", payload: true });
  };

  const handleCardSelection = (card) => {
    // Open the confirmation modal with the selected card
    setSelectedCard(card);
    setModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedCard) {
      onCardSelected(selectedCard);
    }
  };

  return (
    <div>
      {placingCity && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-5 m-3 rounded-lg text-center z-30">
          <h3 className="text-lg font-semibold">Placing City</h3>
          <p>Click on a valid tile (grass) to place your city.</p>
          <button
            onClick={onCancelPlacement}
            className="mt-3 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
        {/* If a city has not been built and the player isn't currently placing one */}
        {!cityBuilt && !placingCity && (
          <div className="w-full h-full overflow-x-auto">
            <div className="w-full flex flex-row h-full justify-center items-center">
              <div className="mb-4 p-2 pt-6 pb-6 pl-4 h-full">
                <div className="flex flex-nowrap overflow-x-auto space-x-4 h-full">
                  <div
                    className="flex flex-col justify-end h-full w-64 opacity-90 text-white p-3 rounded-lg cursor-pointer hover:opacity-100 bg-cover bg-center"
                    onClick={handleBuildCityClick}
                    style={{
                      backgroundImage: `url(/base-city.png)`,
                      backgroundColor: "#2d3748",
                    }}
                    disabled={
                      currentPlayer?.production < baseCityCard.cost.production
                    }
                  >
                    <div className="backdrop-blur-xs bg-black/50 p-2 rounded-lg">
                      <div className="flex justify-between">
                        <p className="font-semibold">{baseCityCard.name}</p>
                        {getOwnedCardCount(baseCityCard.id) > 0 && (
                          <p className="font-bold bg-white text-black rounded-full w-6 h-6 flex items-center justify-center">
                            {getOwnedCardCount(baseCityCard.id)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm">{baseCityCard.effect}</p>
                      <p className="text-xs">
                        Cost: {baseCityCard.cost.production} Production
                      </p>
                      {currentPlayer?.production <
                        baseCityCard.cost.production && (
                        <p className="text-red-400 text-xs mt-2">
                          Insufficient resources
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2 text-center">
              {cityBuilt
                ? "You have already built a city this turn."
                : "You can build one city per turn."}
            </p>
          </div>
        )}

        {/* When a city is built, show available card options */}
        {cityBuilt &&
          availableCards &&
          Object.entries(availableCards).length > 0 && (
            <div className="w-full h-full overflow-x-auto">
              <div className="w-full flex flex-row h-full">
                {Object.entries(availableCards)
                  .filter(
                    ([group, cards]) =>
                      group !== "citycards" && cards.length > 0
                  )
                  .map(([group, cards]) => (
                    <div key={group} className="mb-4 p-2 pt-6 pb-6 pl-4 h-full">
                      <div className="flex flex-nowrap overflow-x-auto space-x-4 h-full">
                        {cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex flex-col justify-end h-full w-64 opacity-50 text-white p-3 rounded-lg cursor-pointer hover:opacity-100 bg-cover bg-center"
                            onClick={() => handleCardSelection(card)}
                            style={{ backgroundImage: `url(/${card.id}.png)` }}
                          >
                            <div className="backdrop-blur-xs bg-black/50 p-2 rounded-lg">
                              <div className="flex justify-between">
                                <p className="font-semibold">{card.name}</p>
                                {getOwnedCardCount(card.id) > 0 && (
                                  <p className="font-bold bg-white text-black rounded-full w-6 h-6 flex items-center justify-center">
                                    {getOwnedCardCount(card.id)}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm">{card.effect}</p>
                              <p className="text-xs">
                                Cost: {card.cost.production} Production
                              </p>
                              {currentPlayer?.production <
                                card.cost.production && (
                                <p className="text-red-400 text-xs mt-2">
                                  Insufficient resources
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {cityBuilt &&
          availableCards &&
          Object.entries(availableCards).length == 0 && (
            <div className="w-full overflow-x-auto">
              <h3 className="text-xl font-bold text-center text-white mb-4">
                No cards available. You can click ready and move to the next
                phase.
              </h3>
            </div>
          )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        title="Confirm Purchase"
        message={
          selectedCard
            ? `Purchase ${selectedCard.name} for ${selectedCard.cost.production} production?`
            : "Confirm your purchase"
        }
        confirmText="Purchase"
        cancelText="Cancel"
      />
    </div>
  );
}
