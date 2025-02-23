// server/controllers/authController.js
const User = require("../models/user");

let users = []; // In-memory user store

exports.register = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }
  const newUser = new User(username, password);
  users.push(newUser);
  res
    .status(201)
    .json({ message: "User registered successfully", user: newUser });
};
