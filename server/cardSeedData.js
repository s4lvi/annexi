// server/data/cardSeedData.js

// Convert existing card definitions to the new format
// This maintains compatibility with your current card system
const cardSeedData = [
  {
    id: "capital-city",
    name: "Capital City",
    type: "city",
    rarity: "legendary",
    description:
      "Your main base of operations. If this falls, you lose the game.",
    effect: "Generates 1 production per turn. Cannot be rebuilt if destroyed.",
    inGameCost: { production: 10 },
    shopCost: 0, // Not purchasable
    isBasic: true,
    count: 1,
    hideFromInventory: true,
    health: 200,
  },
  {
    id: "base-city",
    name: "Base City",
    type: "city",
    rarity: "rare",
    description:
      "Establishes a new base for resource gathering and unit production.",
    effect: "Generates 1 production per turn.",
    inGameCost: { production: 10 },
    shopCost: 1000,
    isBasic: true,
    count: 1,
    alwaysInInventory: true,
    hideFromInventory: true,
    health: 150,
  },
  {
    id: "city-upgrade-1",
    name: "Fortified City",
    type: "city",
    rarity: "uncommon",
    description: "A reinforced city with better defenses.",
    effect:
      "Increases city health by 50 and adds basic defensive capabilities.",
    inGameCost: { production: 1, gold: 1 },
    shopCost: 300,
    isBasic: false,
    count: 3,
    health: 200,
  },
  {
    id: "defensive-structure-1",
    name: "Watchtower",
    type: "defensive",
    rarity: "common",
    description:
      "A tall structure allowing defenders to spot enemies from afar.",
    effect: "Attacks enemy units within range.",
    inGameCost: { production: 2 },
    shopCost: 150,
    isBasic: true,
    count: 5,
    health: 50,
    attackDamage: 10,
    attackRange: 4,
    attackInterval: 1000,
  },
  {
    id: "defensive-structure-2",
    name: "Wall",
    type: "defensive",
    rarity: "common",
    description: "A basic defensive structure that blocks enemy movement.",
    effect: "Blocks enemy units, forcing them to destroy it or go around.",
    inGameCost: { production: 1 },
    shopCost: 100,
    isBasic: true,
    count: 20,
    health: 100,
    reusable: true,
  },
  {
    id: "defensive-structure-3",
    name: "Archer",
    type: "defensive",
    rarity: "common",
    description: "Ranged units that attack from safety.",
    effect: "Attacks enemy units from range with moderate damage.",
    inGameCost: { production: 1 },
    shopCost: 150,
    isBasic: true,
    count: 10,
    health: 20,
    attackDamage: 10,
    attackRange: 3,
    attackInterval: 1000,
    reusable: true,
  },
  {
    id: "army-unit-1",
    name: "Militia",
    type: "unit",
    rarity: "common",
    description: "Basic infantry units with minimal training.",
    effect: "Attacks enemy structures and units.",
    inGameCost: { production: 1 },
    shopCost: 100,
    isBasic: true,
    count: 10,
    health: 50,
    cityDamage: 10,
    speed: 0.1,
    attackInterval: 1000,
    reusable: false,
  },
  {
    id: "army-unit-2",
    name: "Light Infantry",
    type: "unit",
    rarity: "uncommon",
    description: "Trained soldiers equipped for battle.",
    effect: "Stronger attack against enemy structures.",
    inGameCost: { production: 2 },
    shopCost: 200,
    isBasic: false,
    count: 5,
    health: 60,
    cityDamage: 20,
    speed: 0.1,
    attackInterval: 1000,
    reusable: false,
  },
  // Additional new cards
  {
    id: "defensive-structure-4",
    name: "Ballista",
    type: "defensive",
    rarity: "rare",
    description: "Heavy siege weapon for defense.",
    effect: "High damage attack with long range but slow firing rate.",
    inGameCost: { production: 3, gold: 1 },
    shopCost: 400,
    isBasic: false,
    count: 3,
    health: 40,
    attackDamage: 30,
    attackRange: 6,
    attackInterval: 2000,
    reusable: true,
  },
  {
    id: "army-unit-3",
    name: "Heavy Infantry",
    type: "unit",
    rarity: "rare",
    description: "Well-armored soldiers specialized in sieges.",
    effect: "High health and damage against structures.",
    inGameCost: { production: 3, gold: 1 },
    shopCost: 400,
    isBasic: false,
    count: 4,
    health: 100,
    cityDamage: 30,
    speed: 0.08,
    attackInterval: 1200,
    reusable: false,
  },
  {
    id: "resource-generator-1",
    name: "Farm",
    type: "resource",
    rarity: "uncommon",
    description: "Produces food to sustain your population.",
    effect: "Generates 1 additional production per turn.",
    inGameCost: { production: 2 },
    shopCost: 250,
    isBasic: false,
    count: 5,
    health: 30,
  },
  {
    id: "resource-generator-2",
    name: "Gold Mine",
    type: "resource",
    rarity: "rare",
    description: "Extracts precious metals from the ground.",
    effect: "Generates 1 gold per turn.",
    inGameCost: { production: 3 },
    shopCost: 500,
    isBasic: false,
    count: 3,
    health: 40,
  },
];

module.exports = cardSeedData;
