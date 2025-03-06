// server/middleware/isAdmin.js
const User = require("../models/user");

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // If user is admin, proceed
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = isAdmin;
