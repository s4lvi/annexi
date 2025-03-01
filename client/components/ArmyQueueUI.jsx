import React, { useState, useEffect } from "react";
import { useGameState } from "./gameState";
import GameCard from "./GameCard";
import CardDisplayBar from "./CardDisplayBar";

function QueuedCardsDisplay({ queuedCards }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="flex gap-4 pointer-events-auto">
        {queuedCards.map((card, index) => (
          <GameCard key={index} card={card} halfSize={true} />
        ))}
      </div>
    </div>
  );
}

export default function ArmyQueueUI({ onArmyQueued }) {
  const { state } = useGameState();
  const currentPlayer = state.players.find(
    (p) => p._id === state.currentPlayerId
  );

  // The maximum number of unit cards that can be queued equals the number of cities owned.
  const maxQueueLength = currentPlayer?.cities
    ? currentPlayer.cities.length
    : 0;

  // Local state to keep track of the temporary inventory (available unit cards) and selected queue.
  const [selectedCards, setSelectedCards] = useState([]);
  const [tempInventory, setTempInventory] = useState([]);

  // Initialize tempInventory from the player's unit cards.
  useEffect(() => {
    if (currentPlayer && currentPlayer.inventory) {
      const availableUnitCards = currentPlayer.inventory.filter(
        (card) => card.type === "unit"
      );
      setTempInventory(availableUnitCards);
    }
  }, [currentPlayer]);

  // On clicking a card, if there's room, move it from the temporary inventory to the selected queue.
  const handleCardClick = (card) => {
    if (selectedCards.length < maxQueueLength) {
      setSelectedCards([...selectedCards, card]);
      setTempInventory(tempInventory.filter((c) => c !== card));
    }
  };

  // Reset button: clear the selected queue and put the cards back into the temporary inventory.
  const handleReset = () => {
    setTempInventory([...tempInventory, ...selectedCards]);
    setSelectedCards([]);
  };

  // When ready is clicked, call the provided callback to send the queued order to the server.
  const handleFinish = () => {
    onArmyQueued(selectedCards);
    // Optionally, clear the queue afterward.
    setSelectedCards([]);
  };

  // Title and message for the CardDisplayBar.
  const title = "Queue Army Units";
  const message = `Select up to ${maxQueueLength} unit cards from your inventory.`;

  // Right content for the bar shows the Reset button if there are selected cards.
  const rightContent =
    selectedCards.length > 0 ? (
      <div className=" flex flex-row gap-2">
        <button
          onClick={handleFinish}
          disabled={selectedCards.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Ready
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Reset Queue
        </button>
      </div>
    ) : null;

  return (
    <div className="army-queue-ui">
      <CardDisplayBar
        title={title}
        message={message}
        rightContent={rightContent}
      >
        {tempInventory.map((card, index) => (
          <GameCard
            key={`unit-${index}`}
            card={card}
            onClick={() => handleCardClick(card)}
            needsResource={false}
          />
        ))}
      </CardDisplayBar>

      {/* Display the selected queue */}
      {selectedCards.length > 0 && (
        <div className="selected-queue mt-4">
          <h4 className="text-white text-lg mb-2">Selected Queue:</h4>
          <div className="flex gap-4">
            {selectedCards.length > 0 && (
              <QueuedCardsDisplay queuedCards={selectedCards} />
            )}
          </div>
        </div>
      )}

      {/* Ready button to confirm the queued units */}
    </div>
  );
}
