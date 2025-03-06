// server/services/cardService.js
const Card = require("../models/card");
const User = require("../models/user");
const GlobalSettings = require("../models/globalSettings");

// Get all cards in the repository
const getAllCards = async () => {
  try {
    return await Card.find().sort({ rarity: 1, name: 1 });
  } catch (error) {
    console.error("Error fetching all cards:", error);
    throw error;
  }
};

// Get cards by ID
const getCardById = async (cardId) => {
  try {
    return await Card.findOne({ id: cardId });
  } catch (error) {
    console.error(`Error fetching card with ID ${cardId}:`, error);
    throw error;
  }
};

// Get cards by multiple IDs
const getCardsByIds = async (cardIds) => {
  try {
    return await Card.find({ id: { $in: cardIds } });
  } catch (error) {
    console.error("Error fetching cards by IDs:", error);
    throw error;
  }
};

// Get cards by type
const getCardsByType = async (type) => {
  try {
    return await Card.find({ type }).sort({ rarity: 1, name: 1 });
  } catch (error) {
    console.error(`Error fetching cards of type ${type}:`, error);
    throw error;
  }
};

// Get cards by rarity
const getCardsByRarity = async (rarity) => {
  try {
    return await Card.find({ rarity }).sort({ type: 1, name: 1 });
  } catch (error) {
    console.error(`Error fetching cards of rarity ${rarity}:`, error);
    throw error;
  }
};

// Get all cards owned by a user
const getUserCards = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all card IDs owned by the user
    const cardIds = user.ownedCards.map((ownedCard) => ownedCard.cardId);

    // Find all cards in database
    const allCards = await Card.find();

    // Combine card details with owned quantity
    return allCards.map((card) => {
      const ownedCard = user.ownedCards.find((oc) => oc.cardId === card.id);
      return {
        ...card.toObject(),
        ownedCount: ownedCard ? ownedCard.count : 0,
      };
    });
  } catch (error) {
    console.error(`Error fetching cards for user ${userId}:`, error);
    throw error;
  }
};

// Add cards to user's collection
const addCardsToUser = async (userId, cardId, count = 1) => {
  try {
    // Validate the card exists
    const card = await Card.findOne({ id: cardId });
    if (!card) {
      throw new Error(`Card with ID ${cardId} not found`);
    }

    // Update the user's owned cards
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const existingCardIndex = user.ownedCards.findIndex(
      (card) => card.cardId === cardId
    );

    if (existingCardIndex >= 0) {
      // User already owns this card, update the count
      user.ownedCards[existingCardIndex].count += count;
    } else {
      // User doesn't own this card yet, add it
      user.ownedCards.push({
        cardId,
        count,
      });
    }

    await user.save();
    return user.ownedCards;
  } catch (error) {
    console.error(`Error adding cards to user ${userId}:`, error);
    throw error;
  }
};

// Remove cards from user's collection
const removeCardsFromUser = async (userId, cardId, count = 1) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const existingCardIndex = user.ownedCards.findIndex(
      (card) => card.cardId === cardId
    );

    if (existingCardIndex < 0) {
      throw new Error(`User does not own card with ID ${cardId}`);
    }

    // Reduce the count
    user.ownedCards[existingCardIndex].count -= count;

    // If count reaches zero or less, remove the card
    if (user.ownedCards[existingCardIndex].count <= 0) {
      user.ownedCards.splice(existingCardIndex, 1);
    }

    await user.save();
    return user.ownedCards;
  } catch (error) {
    console.error(`Error removing cards from user ${userId}:`, error);
    throw error;
  }
};

// Initialize a new user with starter cards
const initializeUserCards = async (userId) => {
  try {
    // Get default starter deck from global settings
    const defaultDeckSetting = await GlobalSettings.findOne({
      key: "starterDeck",
    });
    const starterDeck = defaultDeckSetting ? defaultDeckSetting.value : [];

    if (!starterDeck || starterDeck.length === 0) {
      console.warn(
        "No starter deck defined in global settings. New users will not receive starter cards."
      );
      return;
    }

    // Count the frequency of each card in the starterDeck array
    const cardCountMap = {};
    starterDeck.forEach((cardId) => {
      cardCountMap[cardId] = (cardCountMap[cardId] || 0) + 1;
    });

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Clear existing owned cards if necessary
    user.ownedCards = [];

    // Set ownedCards based on the frequency counts
    for (const cardId in cardCountMap) {
      // Verify card exists in database
      const cardExists = await Card.findOne({ id: cardId });
      if (cardExists) {
        user.ownedCards.push({
          cardId,
          count: cardCountMap[cardId],
        });
      } else {
        console.warn(`Card with ID ${cardId} not found in database, skipping`);
      }
    }

    await user.save();
    console.log(
      "Initialized ownedCards for user",
      userId,
      "with:",
      user.ownedCards
    );
    return user;
  } catch (error) {
    console.error("Error initializing user cards for user", userId, ":", error);
    throw error;
  }
};

// Get default deck from global settings
const getDefaultDeck = async () => {
  try {
    const defaultDeckSetting = await GlobalSettings.findOne({
      key: "starterDeck",
    });
    return defaultDeckSetting ? defaultDeckSetting.value : [];
  } catch (error) {
    console.error("Error getting default deck:", error);
    throw error;
  }
};

// Update default deck in global settings
const updateDefaultDeck = async (deck, userId) => {
  try {
    if (!deck || !Array.isArray(deck)) {
      throw new Error("Invalid deck format");
    }

    // Verify all cards in deck exist
    for (const cardId of deck) {
      const cardExists = await Card.findOne({ id: cardId });
      if (!cardExists) {
        throw new Error(`Card with ID ${cardId} not found in database`);
      }
    }

    // Update or create the default deck setting
    await GlobalSettings.findOneAndUpdate(
      { key: "starterDeck" },
      {
        key: "starterDeck",
        value: deck,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return { success: true, message: "Default deck updated successfully" };
  } catch (error) {
    console.error("Error updating default deck:", error);
    throw error;
  }
};

module.exports = {
  getAllCards,
  getCardById,
  getCardsByIds,
  getCardsByType,
  getCardsByRarity,
  getUserCards,
  addCardsToUser,
  removeCardsFromUser,
  initializeUserCards,
  getDefaultDeck,
  updateDefaultDeck,
};
