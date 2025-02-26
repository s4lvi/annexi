import React from "react";

const cardTypeColors = {
  city: "border-blue-400",
  resource: "border-yellow-400",
  unit: "border-red-500",
  tech: "border-purple-500",
  defensive: "border-green-400",
  wonder: "border-amber-300",
  // Add more card types as needed
};

const cardTypeBgColors = {
  city: "from-blue-900/80 to-blue-700/80",
  resource: "from-yellow-900/80 to-yellow-700/80",
  unit: "from-red-900/80 to-red-700/80",
  tech: "from-purple-900/80 to-purple-700/80",
  defensive: "from-green-900/80 to-green-700/80",
  wonder: "from-amber-900/80 to-amber-700/80",
  // Add more card types as needed
};

const GameCard = ({
  card,
  onClick,
  isDisabled = false,
  ownedCount = 0,
  currentProduction = 0,
  needsResource = true,
}) => {
  const { id, name, type, cost, effect } = card;
  const canAfford = currentProduction >= cost.production;
  const borderColor = cardTypeColors[type] || "border-gray-400";
  const gradientBg =
    cardTypeBgColors[type] || "from-gray-900/80 to-gray-700/80";

  return (
    <div className="w-72 h-96 flex items-center justify-center px-2">
      <div
        className={`relative flex flex-col w-64 bg-black rounded-lg overflow-hidden cursor-pointer 
                   transition-all duration-200 h-80 border-4 ${borderColor} 
                   ${
                     isDisabled || (!canAfford && needsResource)
                       ? "opacity-50"
                       : "opacity-90 hover:opacity-100 hover:scale-105"
                   }`}
        onClick={
          !isDisabled && (canAfford || !needsResource) ? onClick : undefined
        }
      >
        {/* Card Image Section - Top 60% */}
        <div
          className="h-3/5 bg-cover bg-center"
          style={{ backgroundImage: `url(/${id}.png)` }}
        />

        {/* Card Content Section - Bottom 40% */}
        <div
          className={`h-2/5 p-3 flex flex-col justify-between bg-gradient-to-b ${gradientBg}`}
        >
          {/* Card Header */}
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-white text-lg">{name}</h3>
            {ownedCount > 0 && (
              <span className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {ownedCount}
              </span>
            )}
          </div>

          {/* Card Type */}
          <div className="flex items-center">
            <span className="text-xs uppercase tracking-wider text-gray-300 font-semibold">
              {type}
            </span>
          </div>

          {/* Card Effect */}
          <p className="text-sm text-white my-1 flex-grow">{effect}</p>

          {/* Cost Section */}
          <div className="mt-auto flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-yellow-400 mr-1">⚙️</span>
              <span className="text-white font-medium">{cost.production}</span>
            </div>
            {!canAfford && needsResource && (
              <span className="text-red-400 text-xs">
                Insufficient resources
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
