// CardInventoryModal.jsx
import React from "react";
import GameCard from "./GameCard";

export default function CardInventoryModal({ isOpen, onClose, cards }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg md:max-w-3xl lg:max-w-7xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Card Inventory</h2>
          <button onClick={onClose} className="text-white">
            Close
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, index) => (
            <GameCard
              key={index}
              card={card}
              isDisabled={true}
              needsResource={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
