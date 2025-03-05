// server/routes/shop.js
const express = require("express");
const router = express.Router();
const shopService = require("../controllers/shopService");

// Get all cards available in the shop
router.get("/cards", async (req, res) => {
  try {
    const cards = await shopService.getShopCards();
    res.json({ success: true, cards });
  } catch (error) {
    console.error("Error in GET /shop/cards:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get featured or special offer cards
router.get("/featured", async (req, res) => {
  try {
    const featuredCards = await shopService.getFeaturedCards();
    res.json({ success: true, featuredCards });
  } catch (error) {
    console.error("Error in GET /shop/featured:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Purchase a card
router.post("/purchase/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId } = req.body;

    if (!cardId) {
      return res
        .status(400)
        .json({ success: false, message: "Card ID is required" });
    }

    const result = await shopService.purchaseCard(userId, cardId);
    res.json({
      success: true,
      message: result.message,
      card: result.card,
      remainingCurrency: result.remainingCurrency,
    });
  } catch (error) {
    console.error(`Error in POST /shop/purchase/${req.params.userId}:`, error);

    if (
      error.message === "User not found" ||
      error.message.includes("Card with ID")
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (
      error.message === "Insufficient currency" ||
      error.message === "This card cannot be purchased"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Purchase a card pack
router.post("/purchase-pack/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { packType } = req.body;

    if (!packType) {
      return res
        .status(400)
        .json({ success: false, message: "Pack type is required" });
    }

    const result = await shopService.purchaseCardPack(userId, packType);
    res.json({
      success: true,
      message: result.message,
      cards: result.cards,
      remainingCurrency: result.remainingCurrency,
    });
  } catch (error) {
    console.error(
      `Error in POST /shop/purchase-pack/${req.params.userId}:`,
      error
    );

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (
      error.message === "Insufficient currency" ||
      error.message.includes("Invalid pack type")
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
