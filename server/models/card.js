// server/models/card.js
const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["city", "resource", "unit", "defensive"],
  },
  rarity: {
    type: String,
    required: true,
    enum: ["common", "uncommon", "rare", "epic", "legendary"],
    default: "common",
  },
  description: String,
  effect: String,
  inGameCost: {
    production: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
  },
  shopCost: {
    type: Number,
    required: true,
  },
  isBasic: {
    type: Boolean,
    default: false,
  },
  imageUrl: String,
  iconUrl: String,
  animations: {
    moving: [],
    attacking: [],
    death: [],
  },
  // Game mechanic properties
  health: Number,
  attackDamage: Number,
  attackRange: Number,
  attackInterval: Number,
  speed: Number,
  cityDamage: Number,
  reusable: Boolean,
  count: { type: Number, default: 1 }, // Maximum copies allowed in deck
  hideFromInventory: { type: Boolean, default: false },
  alwaysInInventory: { type: Boolean, default: false },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

cardSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Card", cardSchema);
