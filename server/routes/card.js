// server/routes/card.js
const express = require("express");
const router = express.Router();
const cardService = require("../controllers/cardService");

// Get all cards in the repository
router.get("/", async (req, res) => {
  try {
    const cards = await cardService.getAllCards();
    res.json({ success: true, cards });
  } catch (error) {
    console.error("Error in GET /cards:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cards by type
router.get("/type/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const cards = await cardService.getCardsByType(type);
    res.json({ success: true, cards });
  } catch (error) {
    console.error(`Error in GET /cards/type/${req.params.type}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cards by rarity
router.get("/rarity/:rarity", async (req, res) => {
  try {
    const { rarity } = req.params;
    const cards = await cardService.getCardsByRarity(rarity);
    res.json({ success: true, cards });
  } catch (error) {
    console.error(`Error in GET /cards/rarity/${req.params.rarity}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a specific card by ID
router.get("/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await cardService.getCardById(cardId);

    if (!card) {
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });
    }

    res.json({ success: true, card });
  } catch (error) {
    console.error(`Error in GET /cards/${req.params.cardId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all cards owned by a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cards = await cardService.getUserCards(userId);
    res.json({ success: true, cards });
  } catch (error) {
    console.error(`Error in GET /cards/user/${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a card to user's collection (admin only in a real app)
router.post("/user/:userId/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId, count } = req.body;

    if (!cardId) {
      return res
        .status(400)
        .json({ success: false, message: "Card ID is required" });
    }

    const result = await cardService.addCardsToUser(userId, cardId, count || 1);
    res.json({
      success: true,
      message: "Card added to collection",
      ownedCards: result,
    });
  } catch (error) {
    console.error(`Error in POST /cards/user/${req.params.userId}/add:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove a card from user's collection (admin only in a real app)
router.post("/user/:userId/remove", async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId, count } = req.body;

    if (!cardId) {
      return res
        .status(400)
        .json({ success: false, message: "Card ID is required" });
    }

    const result = await cardService.removeCardsFromUser(
      userId,
      cardId,
      count || 1
    );
    res.json({
      success: true,
      message: "Card removed from collection",
      ownedCards: result,
    });
  } catch (error) {
    console.error(
      `Error in POST /cards/user/${req.params.userId}/remove:`,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

// Initialize a new user with starter cards
router.post("/user/:userId/initialize", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await cardService.initializeUserCards(userId);
    res.json({
      success: true,
      message: "User cards initialized",
      ownedCards: result,
    });
  } catch (error) {
    console.error(
      `Error in POST /cards/user/${req.params.userId}/initialize:`,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
