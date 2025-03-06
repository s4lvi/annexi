// server/controllers/authController.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { initializeUserProfile } = require("../controllers/profileService");

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

    // Create new user - password will be hashed by pre-save middleware
    const newUser = new User({ username, email, password });
    await newUser.save();

    // Initialize the user's profile with starter cards and decks
    await initializeUserProfile(newUser._id);

    // Return user without password
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      isGuest: newUser.isGuest,
      isAdmin: newUser.isAdmin,
      createdAt: newUser.createdAt,
    };

    res
      .status(201)
      .json({ message: "User registered successfully", user: userResponse });
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
      console.log(`User not found: ${username}`);
      return res.status(400).json({ message: "User not found" });
    }

    // For admin user, handle potential plain text password during development
    let isMatch = false;

    // First try using the comparePassword method (for bcrypt hashed passwords)
    try {
      if (user.comparePassword) {
        isMatch = await user.comparePassword(password);
      }
    } catch (error) {
      console.error("Error using comparePassword method:", error);
    }

    // If not matched and this is the admin user, try direct comparison as fallback
    // This is only for development to ensure admin can always log in
    if (!isMatch && user.isAdmin && process.env.NODE_ENV !== "production") {
      // Check if the password might not be hashed (only for admin during development)
      if (password === "admin123" && user.username === "admin") {
        console.log("Using development admin password fallback");
        isMatch = true;

        // Update the admin password to be properly hashed for next time
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
      }
    }

    // If still no match, try a direct comparison (only for development)
    if (!isMatch && process.env.NODE_ENV !== "production") {
      if (password === user.password) {
        console.log("Using fallback direct password comparison");
        isMatch = true;

        // Hash the password for future logins
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
      }
    }

    // If we still have no match, the password is wrong
    if (!isMatch) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(400).json({ message: "Invalid password" });
    }

    // Password is correct, prepare user response without sensitive data
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
      isAdmin: user.isAdmin,
      currency: user.currency,
      stats: user.stats,
      createdAt: user.createdAt,
    };

    res.json({ message: "Login successful", user: userResponse });
  } catch (err) {
    console.error("Login error:", err);
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
    user.password = password; // Will be hashed by pre-save middleware
    user.isGuest = false;
    await user.save();

    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      isGuest: false,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };

    res.json({
      message: "Guest account converted successfully",
      user: userResponse,
    });
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
      isAdmin: user.isAdmin,
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
      password: randomId, // Random password will be hashed by pre-save middleware
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
