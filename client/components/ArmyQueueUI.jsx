import React, { useState } from "react";
import { useGameState } from "./gameState";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ConfirmationModal from "./ConfirmationModal";

export default function ArmyQueueUI({ onArmyQueued }) {
  const { state, dispatch } = useGameState();
  const currentPlayer = state.players.find(
    (p) => p._id === state.currentPlayerId
  );

  // Filter available unit cards from player's inventory
  const availableUnitCards = currentPlayer.inventory.filter(
    (card) => card.type === "unit"
  );
  const maxQueueLength = state.cities.filter(
    (city) => city.playerId === currentPlayer._id
  ).length;

  const [selectedCards, setSelectedCards] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Add a card to the queue if not exceeding max allowed
  const handleAddCard = (card) => {
    if (selectedCards.length < maxQueueLength) {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // Remove a card from the queue
  const handleRemoveCard = (index) => {
    const newQueue = [...selectedCards];
    newQueue.splice(index, 1);
    setSelectedCards(newQueue);
  };

  // Reordering using react-beautiful-dnd
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newQueue = Array.from(selectedCards);
    const [removed] = newQueue.splice(result.source.index, 1);
    newQueue.splice(result.destination.index, 0, removed);
    setSelectedCards(newQueue);
  };

  // Trigger the finish modal
  const handleFinish = () => {
    setShowConfirm(true);
  };

  // When confirmed, pass the queued army to the parent and update game state
  const confirmFinish = () => {
    onArmyQueued(selectedCards);
    setSelectedCards([]);
    setShowConfirm(false);
    dispatch({ type: "SET_QUEUING_ARMY", payload: false });
  };

  return (
    <div className="army-queue-ui">
      <h3>Army Queue</h3>
      <p>Select up to {maxQueueLength} unit cards from your available cards.</p>

      {/* Display available unit cards */}
      <div className="available-cards">
        {availableUnitCards.map((card, index) => (
          <div
            key={card.id}
            className="card"
            onClick={() => handleAddCard(card)}
            style={{
              border: "1px solid #ccc",
              padding: "5px",
              margin: "5px",
              cursor: "pointer",
            }}
          >
            <p>{card.name}</p>
          </div>
        ))}
      </div>

      <h4>Selected Queue:</h4>
      {/* <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="armyQueue">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: "50px",
                border: "1px solid #ddd",
                padding: "10px",
              }}
            >
              {selectedCards.map((card, index) => (
                <Draggable
                  key={`${card.id}-${index}`}
                  draggableId={`${card.id}-${index}`}
                  index={index}
                >
                  {(provided) => (
                    <div
                      className="selected-card"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid #aaa",
                        padding: "5px",
                        marginBottom: "5px",
                        background: "#f9f9f9",
                        ...provided.draggableProps.style,
                      }}
                    >
                      <p>{card.name}</p>
                      <button onClick={() => handleRemoveCard(index)}>
                        Remove
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext> */}

      <button
        onClick={handleFinish}
        disabled={selectedCards.length === 0}
        style={{ marginTop: "10px", padding: "10px 20px" }}
      >
        Finished
      </button>

      {showConfirm && (
        <ConfirmationModal
          message="Confirm your army queue?"
          onConfirm={confirmFinish}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
