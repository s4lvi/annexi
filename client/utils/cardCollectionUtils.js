// utils/cardCollectionUtils.js

/**
 * Group cards by type
 * @param {Array} cards - Array of card objects
 * @returns {Object} Cards grouped by type
 */
export function groupCardsByType(cards) {
  return cards.reduce((grouped, card) => {
    const type = card.type || "unknown";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(card);
    return grouped;
  }, {});
}

/**
 * Group cards by rarity
 * @param {Array} cards - Array of card objects
 * @returns {Object} Cards grouped by rarity
 */
export function groupCardsByRarity(cards) {
  return cards.reduce((grouped, card) => {
    const rarity = card.rarity || "common";
    if (!grouped[rarity]) {
      grouped[rarity] = [];
    }
    grouped[rarity].push(card);
    return grouped;
  }, {});
}

/**
 * Sort cards by a specific property
 * @param {Array} cards - Array of card objects
 * @param {String} property - Property to sort by
 * @param {Boolean} ascending - Sort in ascending order
 * @returns {Array} Sorted cards
 */
export function sortCards(cards, property = "name", ascending = true) {
  return [...cards].sort((a, b) => {
    const valueA = a[property];
    const valueB = b[property];

    // Handle different property types
    if (typeof valueA === "string" && typeof valueB === "string") {
      return ascending
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    // Handle numeric properties
    return ascending ? valueA - valueB : valueB - valueA;
  });
}

/**
 * Filter cards by search term
 * @param {Array} cards - Array of card objects
 * @param {String} searchTerm - Term to search for
 * @returns {Array} Filtered cards
 */
export function filterCardsBySearchTerm(cards, searchTerm) {
  if (!searchTerm) return cards;

  const term = searchTerm.toLowerCase();
  return cards.filter((card) => {
    // Search in name
    if (card.name && card.name.toLowerCase().includes(term)) return true;

    // Search in description
    if (card.description && card.description.toLowerCase().includes(term))
      return true;

    // Search in effect
    if (card.effect && card.effect.toLowerCase().includes(term)) return true;

    // Search in type
    if (card.type && card.type.toLowerCase().includes(term)) return true;

    return false;
  });
}

/**
 * Filter cards by type
 * @param {Array} cards - Array of card objects
 * @param {String} type - Card type to filter by
 * @returns {Array} Filtered cards
 */
export function filterCardsByType(cards, type) {
  if (!type || type === "all") return cards;
  return cards.filter((card) => card.type === type);
}

/**
 * Filter cards by rarity
 * @param {Array} cards - Array of card objects
 * @param {String} rarity - Card rarity to filter by
 * @returns {Array} Filtered cards
 */
export function filterCardsByRarity(cards, rarity) {
  if (!rarity || rarity === "all") return cards;
  return cards.filter((card) => card.rarity === rarity);
}

/**
 * Filter cards by ownership
 * @param {Array} cards - Array of card objects
 * @param {Boolean} onlyOwned - Only show owned cards
 * @returns {Array} Filtered cards
 */
export function filterCardsByOwnership(cards, onlyOwned = false) {
  if (!onlyOwned) return cards;
  return cards.filter((card) => card.ownedCount > 0);
}

/**
 * Get card display properties by rarity
 * @param {String} rarity - Card rarity
 * @returns {Object} CSS classes and styles for the card
 */
export function getCardRarityStyles(rarity) {
  switch (rarity) {
    case "legendary":
      return {
        borderColor: "border-amber-500",
        textColor: "text-amber-400",
        bgGradient: "bg-gradient-to-b from-amber-900/80 to-amber-700/80",
        glow: "shadow-amber-500/40",
      };
    case "epic":
      return {
        borderColor: "border-purple-500",
        textColor: "text-purple-400",
        bgGradient: "bg-gradient-to-b from-purple-900/80 to-purple-700/80",
        glow: "shadow-purple-500/40",
      };
    case "rare":
      return {
        borderColor: "border-blue-500",
        textColor: "text-blue-400",
        bgGradient: "bg-gradient-to-b from-blue-900/80 to-blue-700/80",
        glow: "shadow-blue-500/40",
      };
    case "uncommon":
      return {
        borderColor: "border-green-500",
        textColor: "text-green-400",
        bgGradient: "bg-gradient-to-b from-green-900/80 to-green-700/80",
        glow: "shadow-green-500/40",
      };
    case "common":
    default:
      return {
        borderColor: "border-gray-500",
        textColor: "text-gray-300",
        bgGradient: "bg-gradient-to-b from-gray-900/80 to-gray-700/80",
        glow: "shadow-gray-500/20",
      };
  }
}

/**
 * Validate a deck against game rules
 * @param {Array} cardIds - Array of card IDs in the deck
 * @param {Array} allCards - Array of all available cards
 * @returns {Object} Validation result with isValid flag and any error messages
 */
export function validateDeck(cardIds, allCards) {
  // Check minimum deck size
  if (cardIds.length < 10) {
    return {
      isValid: false,
      error: "Deck must contain at least 10 cards",
    };
  }

  // Check maximum deck size
  if (cardIds.length > 30) {
    return {
      isValid: false,
      error: "Deck cannot contain more than 30 cards",
    };
  }

  // Check for card limits
  const cardCounts = {};
  for (const cardId of cardIds) {
    cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
  }

  for (const cardId in cardCounts) {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) {
      return {
        isValid: false,
        error: `Unknown card with ID ${cardId}`,
      };
    }

    const maxCount = card.count || 3; // Default to 3 if not specified
    if (cardCounts[cardId] > maxCount) {
      return {
        isValid: false,
        error: `Too many copies of ${card.name} (max: ${maxCount})`,
      };
    }
  }

  return {
    isValid: true,
  };
}

/**
 * Calculate card distribution statistics for a deck
 * @param {Array} cardIds - Array of card IDs in the deck
 * @param {Array} allCards - Array of all available cards
 * @returns {Object} Card distribution statistics
 */
export function getDeckStats(cardIds, allCards) {
  // Get full card details for each card in the deck
  const deckCards = cardIds
    .map((cardId) => allCards.find((c) => c.id === cardId))
    .filter((card) => card); // Filter out any undefined cards

  // Count cards by type
  const typeDistribution = deckCards.reduce((counts, card) => {
    const type = card.type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  // Count cards by rarity
  const rarityDistribution = deckCards.reduce((counts, card) => {
    const rarity = card.rarity || "common";
    counts[rarity] = (counts[rarity] || 0) + 1;
    return counts;
  }, {});

  // Calculate average cost
  const totalCost = deckCards.reduce((sum, card) => {
    const cost = card.inGameCost?.production || card.cost?.production || 0;
    return sum + cost;
  }, 0);

  const averageCost = totalCost / deckCards.length || 0;

  return {
    cardCount: deckCards.length,
    typeDistribution,
    rarityDistribution,
    averageCost: parseFloat(averageCost.toFixed(2)),
  };
}
