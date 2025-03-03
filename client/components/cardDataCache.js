// cardDataCache.js
// Implementing more persistent storage to survive remounts

// Try to load from localStorage first
let cardDataCache;
try {
  const storedCache = localStorage.getItem("cardDataCache");
  if (storedCache) {
    cardDataCache = JSON.parse(storedCache);
    console.log("Loaded cache from localStorage", cardDataCache);
  } else {
    cardDataCache = {
      fetched: false,
      cards: [],
      decks: [],
      defaultDeck: null,
      userCurrency: 0,
      error: null,
    };
  }
} catch (e) {
  console.error("Failed to load cache from localStorage", e);
  cardDataCache = {
    fetched: false,
    cards: [],
    decks: [],
    defaultDeck: null,
    userCurrency: 0,
    error: null,
  };
}

export function hasFetchedData() {
  return cardDataCache.fetched;
}

export function setFetchedData(value) {
  cardDataCache.fetched = value;
  saveCache();
}

export function getCachedData() {
  return cardDataCache;
}

export function setCachedData(newData) {
  cardDataCache = { ...cardDataCache, ...newData };
  saveCache();
}

function saveCache() {
  try {
    localStorage.setItem("cardDataCache", JSON.stringify(cardDataCache));
    console.log("Saved cache to localStorage", cardDataCache);
  } catch (e) {
    console.error("Failed to save cache to localStorage", e);
  }
}

// Add a way to clear the cache if needed
export function clearCache() {
  cardDataCache = {
    fetched: false,
    cards: [],
    decks: [],
    defaultDeck: null,
    userCurrency: 0,
    error: null,
  };
  saveCache();
}
