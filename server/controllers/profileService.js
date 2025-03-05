// server/services/profileService.js
const User = require("../models/user");
const { initializeUserCards } = require("./cardService");
const { initializeUserDecks } = require("./deckService");

// Get user profile
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Return only the necessary profile data
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      currency: user.currency,
      stats: user.stats,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
      totalCards: user.ownedCards.reduce(
        (total, card) => total + card.count,
        0
      ),
      totalDecks: user.decks.length,
    };
  } catch (error) {
    console.error(`Error fetching profile for user ${userId}:`, error);
    throw error;
  }
};

// Update user profile
const updateUserProfile = async (userId, profileData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update fields that are allowed to be changed
    if (profileData.username) {
      // Check if username is taken
      if (profileData.username !== user.username) {
        const existingUser = await User.findOne({
          username: profileData.username,
        });
        if (existingUser) {
          throw new Error("Username is already taken");
        }
        user.username = profileData.username;
      }
    }

    if (profileData.email) {
      // Check if email is taken
      if (profileData.email !== user.email) {
        const existingUser = await User.findOne({ email: profileData.email });
        if (existingUser) {
          throw new Error("Email is already taken");
        }
        user.email = profileData.email;
      }
    }

    // Update password if provided
    if (profileData.password) {
      // In a real app, validate old password first and properly hash the new one
      user.password = profileData.password;
    }

    await user.save();

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
    };
  } catch (error) {
    console.error(`Error updating profile for user ${userId}:`, error);
    throw error;
  }
};

// Get user stats
const getUserStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return user.stats;
  } catch (error) {
    console.error(`Error fetching stats for user ${userId}:`, error);
    throw error;
  }
};

// Update user stats after a match
const updateUserStats = async (userId, matchResult) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update match count
    user.stats.matchesPlayed += 1;

    // Update win/loss
    if (matchResult.won) {
      user.stats.wins += 1;
    } else {
      user.stats.losses += 1;
    }

    // Update last played
    user.stats.lastPlayed = new Date();

    // Update favorite cards
    // This assumes matchResult contains cardsUsed array with cardIds
    if (matchResult.cardsUsed && matchResult.cardsUsed.length > 0) {
      const cardCounts = {};

      // Count existing favorite cards
      user.stats.favoriteCards.forEach((cardId) => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
      });

      // Add new cards used
      matchResult.cardsUsed.forEach((cardId) => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
      });

      // Sort cards by usage and take top 5
      user.stats.favoriteCards = Object.entries(cardCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
    }

    // Add currency based on match result
    const currencyReward = matchResult.won ? 100 : 25;
    user.currency += currencyReward;

    await user.save();

    return {
      stats: user.stats,
      currencyReward,
      newTotal: user.currency,
    };
  } catch (error) {
    console.error(`Error updating stats for user ${userId}:`, error);
    throw error;
  }
};

// Initialize a new user profile with starter cards and decks
const initializeUserProfile = async (userId) => {
  try {
    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Initialize cards
    await initializeUserCards(userId);
    const updatedUser = await User.findById(userId);
    console.log(`Cards initialized for user ${userId}`);
    console.log("User's initial cards:", updatedUser.ownedCards.length);

    // Initialize decks
    await initializeUserDecks(userId);

    return {
      success: true,
      message: "User profile initialized successfully",
    };
  } catch (error) {
    console.error(`Error initializing profile for user ${userId}:`, error);
    throw error;
  }
};

// Convert a guest account to a regular account
const convertGuestAccount = async (guestId, userData) => {
  try {
    // Validate input
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error("Missing required user data");
    }

    // Check if username or email are already taken
    const existingUser = await User.findOne({
      $or: [{ username: userData.username }, { email: userData.email }],
    });

    if (existingUser) {
      throw new Error("Username or email already in use");
    }

    // Find the guest user
    const guestUser = await User.findById(guestId);
    if (!guestUser) {
      throw new Error("Guest user not found");
    }

    if (!guestUser.isGuest) {
      throw new Error("This account is not a guest account");
    }

    // Update the guest user with permanent account info
    guestUser.username = userData.username;
    guestUser.email = userData.email;
    guestUser.password = userData.password; // Should be hashed in production
    guestUser.isGuest = false;

    await guestUser.save();

    return {
      success: true,
      message: "Guest account converted successfully",
      user: {
        _id: guestUser._id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: false,
      },
    };
  } catch (error) {
    console.error(`Error converting guest account ${guestId}:`, error);
    throw error;
  }
};

// Update user currency (add or subtract)
const updateUserCurrency = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if subtracting would result in negative balance
    if (user.currency + amount < 0) {
      throw new Error("Insufficient currency");
    }

    user.currency += amount;
    await user.save();

    return {
      success: true,
      message:
        amount >= 0
          ? "Currency added successfully"
          : "Currency deducted successfully",
      newBalance: user.currency,
      change: amount,
    };
  } catch (error) {
    console.error(`Error updating currency for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserStats,
  updateUserStats,
  initializeUserProfile,
  convertGuestAccount,
  updateUserCurrency,
};
