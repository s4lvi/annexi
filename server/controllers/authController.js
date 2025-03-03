// server/controllers/authController.js
const User = require("../models/user");
const { initializeUserProfile } = require("./profileService");

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }
  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const newUser = new User({ username, email, password });
    await newUser.save();

    // Initialize the user's profile with starter cards and decks
    await initializeUserProfile(newUser._id);

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }
  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    // For MVP: compare plaintext password (in production, hash and compare)
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }
    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.convertGuest = async (req, res) => {
  const { guestId, username, email, password } = req.body;
  if (!guestId || !username || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser && existingUser._id.toString() !== guestId) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Find and update the guest user
    const user = await User.findById(guestId);
    if (!user) {
      return res.status(404).json({ message: "Guest user not found" });
    }

    if (!user.isGuest) {
      return res.status(400).json({ message: "User is not a guest account" });
    }

    user.username = username;
    user.email = email;
    user.password = password;
    user.isGuest = false;
    await user.save();

    res.json({ message: "Guest account converted successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't send back sensitive information
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
      stats: user.stats,
      currency: user.currency,
    };

    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createGuestUser = async (req, res) => {
  try {
    // Generate random ID for guest
    const randomId = Math.random().toString(36).substring(2, 10);
    const guestUser = new User({
      username: `Guest_${randomId}`,
      email: `guest_${randomId}@example.com`, // Placeholder email
      password: randomId, // Random password
      isGuest: true,
    });

    await guestUser.save();

    // Initialize the guest user with starter cards and decks
    await initializeUserProfile(guestUser._id);

    res.status(201).json({
      message: "Guest user created successfully",
      user: {
        _id: guestUser._id,
        username: guestUser.username,
        isGuest: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
