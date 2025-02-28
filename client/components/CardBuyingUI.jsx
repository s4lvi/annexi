// CardBuyingUI.jsx
import React, { useState } from "react";
import { useGameState } from "./gameState";
import ConfirmationModal from "./ConfirmationModal";
import GameCard from "./GameCard";
import CardDisplayBar from "./CardDisplayBar.jsx";

export default function CardBuyingUI({ onCardSelected, onPhaseReady }) {
  const { state, dispatch } = useGameState();
  const { cityBuilt, currentHand, players, currentPlayerId } = state;
  const currentPlayer = players.find((p) => p._id === currentPlayerId);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  // Returns the number of purchased copies for a given card from the player's inventory.
  const getOwnedCardCount = (cardId) => {
    if (!currentPlayer || !currentPlayer.inventory) return 0;
    return currentPlayer.inventory.filter((card) => card.id === cardId).length;
  };

  const handleCardSelection = (card) => {
    setSelectedCard(card);
    setModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedCard) {
      onCardSelected(selectedCard);
      setModalOpen(false);
    }
  };

  // Filter out the base city card from the current hand.
  const handCards = currentHand
    ? currentHand.filter((card) => card.id !== "base-city")
    : [];

  // Determine title and message
  let title = "";
  let message = "";

  if (!cityBuilt) {
    title = "Build Your City First";
    message = "Return to the previous step to build your city.";
  } else if (handCards.length === 0) {
    title = "No Cards Available";
    message = "You can click Ready to move to the next step.";
  } else {
    title = "Buy Cards";
    message = `Available Production: ${currentPlayer?.production || 0}`;
  }

  // Show production status in right content
  const rightContent =
    cityBuilt && handCards.length > 0 ? (
      <div className="bg-gray-800 px-4 py-2 rounded-md">
        <span className="text-yellow-400 mr-1">⚙️</span>
        <span className="text-white font-medium">
          {currentPlayer?.production || 0}
        </span>
      </div>
    ) : null;

  return (
    <>
      <CardDisplayBar title={title}>
        {cityBuilt &&
          handCards.length > 0 &&
          handCards.map((card, index) => (
            <GameCard
              key={index}
              card={card}
              onClick={() => handleCardSelection(card)}
              isDisabled={currentPlayer?.production < card.cost.production}
              ownedCount={getOwnedCardCount(card.id)}
              currentProduction={currentPlayer?.production || 0}
            />
          ))}
      </CardDisplayBar>

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
    </>
  );
}
