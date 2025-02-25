// ExpandPhaseUI.jsx
import React, { useState } from "react";
import { useGameState } from "./gameState";
import ConfirmationModal from "./ConfirmationModal";
import GameCard from "./GameCard";

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

      <div className="absolute bottom-0 left-0 w-full h-2/5 bg-black bg-opacity-60 flex flex-col items-center z-20 py-2 overflow-hidden">
        {/* If a city has not been built and the player isn't currently placing one */}
        {!cityBuilt && !placingCity && (
          <div className="w-full overflow-x-auto">
            <div className="w-full flex flex-row justify-center items-center">
              <div className="p-2">
                <div className="flex flex-nowrap space-x-1 overflow-x-auto">
                  <GameCard
                    card={baseCityCard}
                    onClick={handleBuildCityClick}
                    isDisabled={
                      currentPlayer?.production < baseCityCard.cost.production
                    }
                    ownedCount={getOwnedCardCount(baseCityCard.id)}
                    currentProduction={currentPlayer?.production || 0}
                  />
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-4 mb-2 text-center">
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
            <div className="w-full overflow-x-auto">
              <div className="w-full flex flex-row">
                {Object.entries(availableCards)
                  .filter(
                    ([group, cards]) =>
                      group !== "citycards" && cards.length > 0
                  )
                  .map(([group, cards]) => (
                    <div key={group} className="p-2">
                      <div className="flex flex-nowrap space-x-1 overflow-x-auto">
                        {cards.map((card) => (
                          <GameCard
                            key={card.id}
                            card={card}
                            onClick={() => handleCardSelection(card)}
                            isDisabled={
                              currentPlayer?.production < card.cost.production
                            }
                            ownedCount={getOwnedCardCount(card.id)}
                            currentProduction={currentPlayer?.production || 0}
                          />
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
