// server/routes/profile.js
const express = require("express");
const router = express.Router();
const profileService = require("../controllers/profileService");

// Get user profile
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await profileService.getUserProfile(userId);
    res.json({ success: true, profile });
  } catch (error) {
    console.error(`Error in GET /profile/${req.params.userId}:`, error);

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;

    const updatedProfile = await profileService.updateUserProfile(
      userId,
      profileData
    );
    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(`Error in PUT /profile/${req.params.userId}:`, error);

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (
      error.message === "Username is already taken" ||
      error.message === "Email is already taken"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user stats
router.get("/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await profileService.getUserStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error(`Error in GET /profile/${req.params.userId}/stats:`, error);

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user stats after a match
router.post("/:userId/stats/update", async (req, res) => {
  try {
    const { userId } = req.params;
    const matchResult = req.body;

    if (matchResult.won === undefined) {
      return res.status(400).json({
        success: false,
        message: "Match result must include won field",
      });
    }

    const result = await profileService.updateUserStats(userId, matchResult);
    res.json({
      success: true,
      message: "Stats updated successfully",
      stats: result.stats,
      currencyReward: result.currencyReward,
      newTotal: result.newTotal,
    });
  } catch (error) {
    console.error(
      `Error in POST /profile/${req.params.userId}/stats/update:`,
      error
    );

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Initialize a new user profile with starter cards and decks
router.post("/:userId/initialize", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await profileService.initializeUserProfile(userId);
    res.json({
      success: true,
      message: "User profile initialized successfully",
    });
  } catch (error) {
    console.error(
      `Error in POST /profile/${req.params.userId}/initialize:`,
      error
    );

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Convert a guest account to a regular account
router.post("/:guestId/convert", async (req, res) => {
  try {
    const { guestId } = req.params;
    const userData = req.body;

    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    const result = await profileService.convertGuestAccount(guestId, userData);
    res.json({
      success: true,
      message: "Guest account converted successfully",
      user: result.user,
    });
  } catch (error) {
    console.error(
      `Error in POST /profile/${req.params.guestId}/convert:`,
      error
    );

    if (
      error.message === "User not found" ||
      error.message === "Guest user not found"
    ) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (
      error.message === "Username or email already in use" ||
      error.message === "Missing required user data" ||
      error.message === "This account is not a guest account"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user currency (add or subtract)
router.post("/:userId/currency", async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (amount === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is required" });
    }

    const result = await profileService.updateUserCurrency(
      userId,
      parseInt(amount)
    );
    res.json({
      success: true,
      message: result.message,
      newBalance: result.newBalance,
      change: result.change,
    });
  } catch (error) {
    console.error(
      `Error in POST /profile/${req.params.userId}/currency:`,
      error
    );

    if (error.message === "User not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.message === "Insufficient currency") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
