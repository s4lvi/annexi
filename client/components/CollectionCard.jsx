import React from "react";
import { getCardRarityStyles } from "@/utils/cardCollectionUtils";
import { ShoppingCart, Plus, Minus } from "lucide-react";

const CollectionCard = ({
  card,
  onClick,
  onAddToDeck,
  onRemoveFromDeck,
  isInDeck = false,
  deckCount = 0,
  showShopControls = false,
  disabled = false,
  compact = false,
  userCurrency = 0,
}) => {
  const {
    id,
    name,
    type,
    rarity = "common",
    description,
    effect,
    inGameCost = {},
    shopCost = 0,
    ownedCount = 0,
    imageUrl, // Use the imageUrl from the card object
  } = card;
  // Get styles based on card rarity
  const rarityStyles = getCardRarityStyles(rarity);

  // Calculate if the card can be afforded in the shop
  const canAffordInShop = userCurrency >= shopCost;

  // Determine if maximum copies of this card are in the deck
  const maxInDeck = card.count || 3; // Default max is 3 copies per card
  const isMaxInDeck = deckCount >= maxInDeck;

  // Card dimensions - compact mode for deck builder, regular for collection
  const cardClass = compact
    ? "w-48 h-56 flex-shrink-0"
    : "w-64 h-80 flex-shrink-0";

  const imageSizeClass = compact ? "h-1/2" : "h-3/5";
  const contentSizeClass = compact ? "h-1/2" : "h-2/5";
  const nameClass = compact ? "text-base" : "text-lg";
  const effectClass = compact
    ? "text-xs line-clamp-2"
    : "text-sm my-1 flex-grow";

  // Get the correct image URL - use the stored imageUrl or fallback to a default
  const getImageUrl = () => {
    if (imageUrl) {
      // Use the backend URL to construct the full path
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imageUrl.slice(1)}`;
    }
    // Fallback to a placeholder or default image
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}cards/card-placeholder.png`;
  };

  // Handle card click
  const handleCardClick = (e) => {
    if (onClick && !disabled) {
      e.stopPropagation();
      onClick(card);
    }
  };

  // Handle add to deck
  const handleAddToDeck = (e) => {
    e.stopPropagation(); // Prevent triggering card click
    if (onAddToDeck && !isMaxInDeck && !disabled) {
      onAddToDeck(card);
    }
  };

  // Handle remove from deck
  const handleRemoveFromDeck = (e) => {
    e.stopPropagation(); // Prevent triggering card click
    if (onRemoveFromDeck && !disabled) {
      onRemoveFromDeck(card);
    }
  };

  // Handle purchase card
  const handlePurchaseCard = (e) => {
    e.stopPropagation(); // Prevent triggering card click
    if (showShopControls && canAffordInShop && !disabled) {
      // This will be implemented in the parent component through onClick
      onClick(card);
    }
  };

  return (
    <div className={cardClass}>
      <div
        className={`relative flex flex-col bg-black rounded-lg overflow-hidden cursor-pointer 
                  transition-all duration-200 h-full border-4 ${
                    rarityStyles.borderColor
                  } 
                  ${
                    disabled
                      ? "opacity-50"
                      : "opacity-90 hover:opacity-100 hover:scale-105"
                  }
                  shadow-[0_8px_16px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)]
                  ${rarityStyles.glow}`}
        onClick={handleCardClick}
      >
        {/* Card image section */}
        <div
          className={`${imageSizeClass} bg-cover bg-center`}
          style={{ backgroundImage: `url(${getImageUrl()})` }}
        />

        {/* Owned count badge */}
        {ownedCount > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white rounded-full px-2 py-1 text-xs font-bold flex items-center">
            {ownedCount}x
          </div>
        )}

        {/* Rarity indicator */}
        <div className="absolute top-2 left-2 bg-black/70 text-white rounded-full px-2 py-1 text-xs font-bold capitalize">
          <span className={rarityStyles.textColor}>{rarity}</span>
        </div>

        {/* Card content section */}
        <div
          className={`${contentSizeClass} p-3 flex flex-col justify-between bg-gradient-to-b ${rarityStyles.bgGradient}`}
        >
          <div className="flex justify-between items-start">
            <h3 className={`font-bold text-white ${nameClass}`}>{name}</h3>
          </div>

          <div className="flex items-center">
            <span className="text-xs uppercase tracking-wider text-gray-300 font-semibold">
              {type}
            </span>
          </div>

          <p className={`text-white ${effectClass}`}>{effect || description}</p>

          <div className="mt-auto flex justify-between items-center">
            <div className="flex items-center">
              {/* In-game cost */}
              <span className="text-yellow-400 mr-1">⚙️</span>
              <span className="text-white font-medium">
                {inGameCost.production || 0}
              </span>

              {/* Shop cost, if shown */}
              {showShopControls && (
                <div className="ml-3 flex items-center">
                  <span className="text-amber-400 mr-1">💰</span>
                  <span
                    className={`font-medium ${
                      canAffordInShop ? "text-white" : "text-red-400"
                    }`}
                  >
                    {shopCost}
                  </span>
                </div>
              )}
            </div>

            {/* Deck actions */}
            {!showShopControls && !compact && (
              <div className="flex gap-1">
                {isInDeck ? (
                  <button
                    onClick={handleRemoveFromDeck}
                    className="p-1 bg-red-600 hover:bg-red-700 rounded-full"
                    disabled={disabled}
                    title="Remove from deck"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddToDeck}
                    className={`p-1 bg-green-600 hover:bg-green-700 rounded-full ${
                      isMaxInDeck || ownedCount <= 0
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={isMaxInDeck || ownedCount <= 0 || disabled}
                    title={
                      isMaxInDeck
                        ? `Maximum of ${maxInDeck} copies allowed`
                        : ownedCount <= 0
                        ? "You don't own this card"
                        : "Add to deck"
                    }
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            )}

            {/* Shop purchase button */}
            {showShopControls && (
              <button
                onClick={handlePurchaseCard}
                className={`p-1 bg-amber-600 hover:bg-amber-700 rounded-full ${
                  !canAffordInShop ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!canAffordInShop || disabled}
                title={
                  !canAffordInShop ? "Not enough currency" : "Purchase card"
                }
              >
                <ShoppingCart className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Deck builder counts */}
            {compact && deckCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveFromDeck}
                  className="p-1 bg-red-600 hover:bg-red-700 rounded-full"
                  disabled={disabled}
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="font-bold text-white">{deckCount}x</span>
                <button
                  onClick={handleAddToDeck}
                  className={`p-1 bg-green-600 hover:bg-green-700 rounded-full ${
                    isMaxInDeck || ownedCount <= deckCount
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={isMaxInDeck || ownedCount <= deckCount || disabled}
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionCard;
