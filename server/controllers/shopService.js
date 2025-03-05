// server/services/shopService.js
const Card = require("../models/card");
const User = require("../models/user");
const { addCardsToUser } = require("./cardService");
const { updateUserCurrency } = require("./profileService");

// Get all cards available in the shop
const getShopCards = async () => {
  try {
    // Get all cards that have a shop cost (can be purchased)
    return await Card.find({ shopCost: { $gt: 0 } }).sort({
      rarity: 1,
      shopCost: 1,
    });
  } catch (error) {
    console.error("Error fetching shop cards:", error);
    throw error;
  }
};

// Get featured or special offer cards
const getFeaturedCards = async () => {
  try {
    // In a real application, you might have a separate collection for featured cards
    // or some logic to determine which cards are featured

    // For now, just return a few higher-rarity cards
    return await Card.find({
      rarity: { $in: ["rare", "epic", "legendary"] },
      shopCost: { $gt: 0 },
    }).limit(5);
  } catch (error) {
    console.error("Error fetching featured cards:", error);
    throw error;
  }
};

// Purchase a card
const purchaseCard = async (userId, cardId) => {
  try {
    // Validate the card exists
    const card = await Card.findOne({ id: cardId });
    if (!card) {
      throw new Error(`Card with ID ${cardId} not found`);
    }

    if (card.shopCost <= 0) {
      throw new Error("This card cannot be purchased");
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has enough currency
    if (user.currency < card.shopCost) {
      throw new Error(
        `Insufficient currency. Required: ${card.shopCost}, Available: ${user.currency}`
      );
    }

    // Deduct currency
    await updateUserCurrency(userId, -card.shopCost);

    // Add card to user's collection
    await addCardsToUser(userId, cardId, 1);

    return {
      success: true,
      message: `Successfully purchased ${card.name}`,
      card: card,
      remainingCurrency: user.currency - card.shopCost,
    };
  } catch (error) {
    console.error(`Error purchasing card ${cardId} for user ${userId}:`, error);
    throw error;
  }
};

// Purchase a card pack (multiple random cards)
const purchaseCardPack = async (userId, packType) => {
  try {
    // Different pack types with different costs and card distributions
    const packTypes = {
      basic: {
        cost: 200,
        cardCount: 3,
        guaranteedRarity: "uncommon", // At least one card of this rarity or better
        rarityDistribution: {
          common: 70,
          uncommon: 25,
          rare: 4,
          epic: 1,
          legendary: 0,
        },
      },
      premium: {
        cost: 500,
        cardCount: 5,
        guaranteedRarity: "rare",
        rarityDistribution: {
          common: 50,
          uncommon: 35,
          rare: 10,
          epic: 4,
          legendary: 1,
        },
      },
      ultimate: {
        cost: 1000,
        cardCount: 7,
        guaranteedRarity: "epic",
        rarityDistribution: {
          common: 30,
          uncommon: 40,
          rare: 20,
          epic: 8,
          legendary: 2,
        },
      },
    };

    // Validate pack type
    if (!packTypes[packType]) {
      throw new Error(`Invalid pack type: ${packType}`);
    }

    const packConfig = packTypes[packType];

    // Check if user has enough currency
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.currency < packConfig.cost) {
      throw new Error(
        `Insufficient currency. Required: ${packConfig.cost}, Available: ${user.currency}`
      );
    }

    // Deduct currency
    await updateUserCurrency(userId, -packConfig.cost);

    // Select random cards based on rarity distribution
    const selectedCards = await selectRandomCards(packConfig);

    // Add cards to user's collection
    for (const card of selectedCards) {
      await addCardsToUser(userId, card.id, 1);
    }

    return {
      success: true,
      message: `Successfully purchased ${packType} card pack`,
      cards: selectedCards,
      remainingCurrency: user.currency - packConfig.cost,
    };
  } catch (error) {
    console.error(`Error purchasing card pack for user ${userId}:`, error);
    throw error;
  }
};

// Helper function to select random cards based on pack configuration
async function selectRandomCards(packConfig) {
  try {
    const selectedCards = [];
    const allCards = await Card.find({ shopCost: { $gt: 0 } });

    // Group cards by rarity
    const cardsByRarity = {
      common: allCards.filter((card) => card.rarity === "common"),
      uncommon: allCards.filter((card) => card.rarity === "uncommon"),
      rare: allCards.filter((card) => card.rarity === "rare"),
      epic: allCards.filter((card) => card.rarity === "epic"),
      legendary: allCards.filter((card) => card.rarity === "legendary"),
    };

    // Add guaranteed rarity card
    const guaranteedRarityCards = allCards.filter((card) => {
      const rarityValue = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
      };

      return (
        rarityValue[card.rarity] >= rarityValue[packConfig.guaranteedRarity]
      );
    });

    if (guaranteedRarityCards.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * guaranteedRarityCards.length
      );
      selectedCards.push(guaranteedRarityCards[randomIndex]);
    }

    // Fill the rest of the pack with random cards based on rarity distribution
    while (selectedCards.length < packConfig.cardCount) {
      const rarityRoll = Math.random() * 100;
      let cumulativeProbability = 0;
      let selectedRarity = "common";

      for (const [rarity, probability] of Object.entries(
        packConfig.rarityDistribution
      )) {
        cumulativeProbability += probability;
        if (rarityRoll < cumulativeProbability) {
          selectedRarity = rarity;
          break;
        }
      }

      const rarityCards = cardsByRarity[selectedRarity];
      if (rarityCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * rarityCards.length);
        selectedCards.push(rarityCards[randomIndex]);
      }
    }

    return selectedCards;
  } catch (error) {
    console.error("Error selecting random cards:", error);
    throw error;
  }
}

module.exports = {
  getShopCards,
  getFeaturedCards,
  purchaseCard,
  purchaseCardPack,
};
