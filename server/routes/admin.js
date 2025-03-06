// server/routes/admin.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const isAdmin = require("../middleware/isAdmin");
const Card = require("../models/card");
const GlobalSettings = require("../models/globalSettings");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;

    // Determine the appropriate directory based on file type
    if (file.fieldname === "icon") {
      uploadDir = path.join(__dirname, "../public/card-icons");
    } else if (
      file.fieldname.startsWith("moving") ||
      file.fieldname.startsWith("attacking") ||
      file.fieldname.startsWith("death")
    ) {
      uploadDir = path.join(
        __dirname,
        "../public/animations",
        file.fieldname.split("-")[0]
      );
    } else {
      // Default for card images
      uploadDir = path.join(__dirname, "../public/cards");
    }

    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cardId = req.params.id;

    // For animations, add an index to the filename
    if (
      file.fieldname.startsWith("moving") ||
      file.fieldname.startsWith("attacking") ||
      file.fieldname.startsWith("death")
    ) {
      // Extract animation type (moving, attacking, death)
      const animationType =
        req.body.animationType || file.fieldname.split("-")[0];
      const timestamp = Date.now();
      cb(
        null,
        `${cardId}-${animationType}-${timestamp}${path.extname(
          file.originalname
        )}`
      );
    } else if (file.fieldname === "icon") {
      cb(null, `${cardId}-icon${path.extname(file.originalname)}`);
    } else {
      cb(null, `${cardId}${path.extname(file.originalname)}`);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

// Get all cards (admin view with full details)
router.get("/cards", isAdmin, async (req, res) => {
  try {
    const cards = await Card.find().sort({ rarity: 1, name: 1 });
    res.json({ cards });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific card by ID
router.get("/cards/:id", isAdmin, async (req, res) => {
  try {
    const card = await Card.findOne({ id: req.params.id });
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    res.json({ card });
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new card
router.post("/cards", isAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    // Check if card ID already exists
    const existingCard = await Card.findOne({ id });
    if (existingCard) {
      return res.status(400).json({ message: "Card ID already exists" });
    }

    const newCard = new Card(req.body);
    await newCard.save();

    res
      .status(201)
      .json({ message: "Card created successfully", card: newCard });
  } catch (error) {
    console.error("Error creating card:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update an existing card
router.put("/cards/:id", isAdmin, async (req, res) => {
  try {
    const updatedCard = await Card.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedCard) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.json({ message: "Card updated successfully", card: updatedCard });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a card
router.delete("/cards/:id", isAdmin, async (req, res) => {
  try {
    const deletedCard = await Card.findOneAndDelete({ id: req.params.id });

    if (!deletedCard) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Delete all associated images
    const filesToCheck = [
      // Main card image
      path.join(__dirname, "../public/cards", `${req.params.id}.png`),
      path.join(__dirname, "../public/cards", `${req.params.id}.jpg`),
      path.join(__dirname, "../public/cards", `${req.params.id}.jpeg`),
      path.join(__dirname, "../public/cards", `${req.params.id}.gif`),

      // Icon
      path.join(__dirname, "../public/card-icons", `${req.params.id}-icon.png`),
      path.join(__dirname, "../public/card-icons", `${req.params.id}-icon.jpg`),
      path.join(
        __dirname,
        "../public/card-icons",
        `${req.params.id}-icon.jpeg`
      ),
      path.join(__dirname, "../public/card-icons", `${req.params.id}-icon.gif`),
    ];

    // Try to delete each file if it exists
    filesToCheck.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Also check for animation files and delete them
    const animationDirs = [
      path.join(__dirname, "../public/animations/moving"),
      path.join(__dirname, "../public/animations/attacking"),
      path.join(__dirname, "../public/animations/death"),
    ];

    animationDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (file.startsWith(`${req.params.id}-`)) {
            fs.unlinkSync(path.join(dir, file));
          }
        });
      }
    });

    res.json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload card image
router.post(
  "/cards/:id/image",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const card = await Card.findOne({ id: req.params.id });

      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      // Update image URL
      card.imageUrl = `/cards/${req.params.id}${path.extname(
        req.file.originalname
      )}`;
      await card.save();

      res.json({ message: "Image uploaded successfully", card });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Upload card icon
router.post(
  "/cards/:id/icon",
  isAdmin,
  upload.single("icon"),
  async (req, res) => {
    try {
      const card = await Card.findOne({ id: req.params.id });

      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      // Update icon URL
      card.iconUrl = `/card-icons/${req.params.id}-icon${path.extname(
        req.file.originalname
      )}`;
      await card.save();

      res.json({ message: "Icon uploaded successfully", card });
    } catch (error) {
      console.error("Error uploading icon:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Upload card animations
router.post(
  "/cards/:id/animation",
  isAdmin,
  upload.array(["moving", "attacking", "death"], 20), // Support multiple files for each animation type
  async (req, res) => {
    try {
      const card = await Card.findOne({ id: req.params.id });
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      const { animationType } = req.body;
      if (
        !animationType ||
        !["moving", "attacking", "death"].includes(animationType)
      ) {
        return res
          .status(400)
          .json({ message: "Valid animation type is required" });
      }

      // Get the uploaded files
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No animation files uploaded" });
      }

      // Create animation URLs array
      const animationUrls = files.map((file) => {
        const filename = file.filename;
        return `/animations/${animationType}/${filename}`;
      });

      // Update the card's animations field
      // If animations is not defined yet, initialize it
      if (!card.animations) {
        card.animations = { moving: [], attacking: [], death: [] };
      }

      // Add new animation frames to the existing ones
      card.animations[animationType] = [
        ...(card.animations[animationType] || []),
        ...animationUrls,
      ];

      await card.save();

      res.json({
        message: `${animationType} animations uploaded successfully`,
        card,
        uploadedFiles: files.length,
      });
    } catch (error) {
      console.error("Error uploading animations:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get global default deck
router.get("/default-deck", isAdmin, async (req, res) => {
  try {
    const setting = await GlobalSettings.findOne({ key: "starterDeck" });

    if (!setting) {
      return res.json({ deck: [] });
    }

    res.json({ deck: setting.value });
  } catch (error) {
    console.error("Error getting default deck:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Set global default deck
router.post("/default-deck", isAdmin, async (req, res) => {
  try {
    const { deck, userId } = req.body;

    if (!deck || !Array.isArray(deck)) {
      return res.status(400).json({ message: "Invalid deck format" });
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

    res.json({ message: "Default deck updated successfully" });
  } catch (error) {
    console.error("Error setting default deck:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
