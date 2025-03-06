import React from "react";

const cardTypeColors = {
  city: "border-blue-400",
  resource: "border-yellow-400",
  unit: "border-red-500",
  defensive: "border-green-400",
};

const cardTypeBgColors = {
  city: "from-blue-900/80 to-blue-700/80",
  resource: "from-yellow-900/80 to-yellow-700/80",
  unit: "from-red-900/80 to-red-700/80",
  defensive: "from-green-900/80 to-green-700/80",
};

const GameCard = ({
  card,
  onClick,
  isDisabled = false,
  ownedCount = 0,
  currentProduction = 0,
  needsResource = true,
  halfSize = false, // new prop to control size
}) => {
  const { id, name, type, cost, effect, imageUrl } = card;
  const canAfford = currentProduction >= cost.production;
  const borderColor = cardTypeColors[type] || "border-gray-400";
  const gradientBg =
    cardTypeBgColors[type] || "from-gray-900/80 to-gray-700/80";

  // Handle card click, preventing drag interference
  const handleCardClick = (e) => {
    if (onClick && !isDisabled && (canAfford || !needsResource)) {
      e.stopPropagation();
      onClick(e);
    }
  };
  const getImageUrl = () => {
    if (imageUrl) {
      // Use the backend URL to construct the full path
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imageUrl}`;
    }
    // Fallback to a placeholder or default image
    return "/card-placeholder.png";
  };
  // Set classes based on halfSize flag.
  const outerClass = halfSize ? "w-36 flex-shrink-0" : "w-72 flex-shrink-0";
  const innerWidth = halfSize ? "w-32" : "w-64";
  const innerHeight = halfSize ? "h-40" : "h-80";

  return (
    <div className={outerClass}>
      <div
        className={`relative flex flex-col ${innerWidth} bg-black rounded-lg overflow-hidden cursor-pointer 
                    transition-all duration-200 ${innerHeight} border-4 ${borderColor} 
                    ${
                      isDisabled || (!canAfford && needsResource)
                        ? "opacity-50"
                        : "opacity-90 hover:opacity-100 hover:scale-105"
                    }
                    shadow-[0_8px_16px_rgba(0,0,0,0.5)]
                    hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)]`}
        onClick={handleCardClick}
      >
        {/* Card image section */}
        <div
          className="h-3/5 bg-cover bg-center"
          style={{ backgroundImage: `url(${getImageUrl()})` }}
        />

        {/* Card content section */}
        <div
          className={`h-2/5 p-3 flex flex-col justify-between bg-gradient-to-b ${gradientBg}`}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-white text-lg">{name}</h3>
            {ownedCount > 0 && (
              <span className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {ownedCount}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-xs uppercase tracking-wider text-gray-300 font-semibold">
              {type}
            </span>
          </div>
          <p className="text-sm text-white my-1 flex-grow">{effect}</p>
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
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
};

export default GameCard;
