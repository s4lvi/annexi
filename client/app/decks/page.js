"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useCardCollection } from "@/components/CardCollectionContext";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import CollectionCard from "@/components/CollectionCard";
import {
  BookOpen,
  ChevronLeft,
  Edit,
  Trash2,
  Save,
  PlusCircle,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  BarChart2,
} from "lucide-react";
import {
  filterCardsBySearchTerm,
  filterCardsByType,
  filterCardsByRarity,
  filterCardsByOwnership,
  groupCardsByType,
  sortCards,
  validateDeck,
  getDeckStats,
} from "@/utils/cardCollectionUtils";

export default function DeckBuilderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    cards,
    decks,
    defaultDeck,
    loading: cardsLoading,
    error,
    reloadCards,
    reloadDecks,
    api,
  } = useCardCollection();

  // State for deck building
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [editingDeck, setEditingDeck] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [isNewDeck, setIsNewDeck] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [deckStats, setDeckStats] = useState(null);

  // Filters for available cards
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRarity, setFilterRarity] = useState("all");
  const [onlyOwned, setOnlyOwned] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [sortAscending, setSortAscending] = useState(true);

  // UI state
  const [showStats, setShowStats] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Calculate card counts for the current deck
  const getCardCount = (cardId) => {
    return deckCards.filter((id) => id === cardId).length;
  };

  // Filter cards based on current filters
  const filteredCards = sortCards(
    filterCardsByOwnership(
      filterCardsByRarity(
        filterCardsByType(
          filterCardsBySearchTerm(cards, searchTerm),
          filterType
        ),
        filterRarity
      ),
      onlyOwned
    ),
    sortBy,
    sortAscending
  );

  // Load cards and decks when component mounts
  useEffect(() => {
    if (!authLoading && user) {
      reloadCards();
      reloadDecks();
    }
  }, [authLoading, user, reloadCards, reloadDecks]);

  // Set default deck when decks are loaded
  useEffect(() => {
    if (decks.length > 0 && !selectedDeck) {
      const defaultDeck = decks.find((deck) => deck.isDefault) || decks[0];
      setSelectedDeck(defaultDeck._id);
      loadDeck(defaultDeck);
    }
  }, [decks, selectedDeck]);

  // Update deck stats when deck changes
  useEffect(() => {
    if (cards.length > 0 && deckCards.length > 0) {
      setDeckStats(getDeckStats(deckCards, cards));
    } else {
      setDeckStats(null);
    }

    // Validate deck
    if (deckCards.length > 0) {
      const validation = validateDeck(deckCards, cards);
      if (!validation.isValid) {
        setValidationError(validation.error);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError("Deck needs at least 10 cards");
    }
  }, [deckCards, cards]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Load a deck into the editor
  const loadDeck = (deck) => {
    setEditingDeck(deck._id);
    setDeckName(deck.name);
    setDeckDescription(deck.description || "");
    setDeckCards(deck.cards || []);
    setIsNewDeck(false);
    setValidationError(null);
  };

  // Start creating a new deck
  const startNewDeck = () => {
    setEditingDeck(null);
    setDeckName("New Deck");
    setDeckDescription("");
    setDeckCards([]);
    setIsNewDeck(true);
  };

  // Add a card to the deck
  const addCardToDeck = (card) => {
    // Check if we've reached the max allowed for this card
    const currentCount = getCardCount(card.id);
    const maxAllowed = card.count || 3; // Default to 3 if count not specified

    if (currentCount >= maxAllowed) {
      setValidationError(
        `You can only have ${maxAllowed} copies of ${card.name}`
      );
      return;
    }

    // Check if user has enough copies of this card
    if (currentCount >= card.ownedCount) {
      setValidationError(
        `You only own ${card.ownedCount} copies of ${card.name}`
      );
      return;
    }

    // Add card to deck
    setDeckCards([...deckCards, card.id]);
    setValidationError(null);
  };

  // Remove a card from the deck
  const removeCardFromDeck = (card) => {
    // Find the index of the first occurrence of this card
    const index = deckCards.indexOf(card.id);
    if (index !== -1) {
      const newDeckCards = [...deckCards];
      newDeckCards.splice(index, 1);
      setDeckCards(newDeckCards);
    }
  };

  // Save the current deck
  const saveDeck = async () => {
    try {
      setSavingDeck(true);

      // Validate deck before saving
      const validation = validateDeck(deckCards, cards);
      if (!validation.isValid) {
        setValidationError(validation.error);
        setSavingDeck(false);
        return;
      }

      const deckData = {
        name: deckName,
        description: deckDescription,
        cards: deckCards,
      };

      if (isNewDeck) {
        await api.createDeck(deckData);
      } else {
        await api.updateDeck(editingDeck, deckData);
      }

      // Reload decks to get the updated list
      await reloadDecks();

      // Set success state
      setIsNewDeck(false);
      setSavingDeck(false);

      // Find and select the newly created/updated deck
      const updatedDecks = await api.getUserDecks();
      const savedDeck =
        updatedDecks.find((d) => d.name === deckName) || updatedDecks[0];
      setSelectedDeck(savedDeck._id);
      setEditingDeck(savedDeck._id);
    } catch (error) {
      console.error("Error saving deck:", error);
      setValidationError(error.message || "Failed to save deck");
      setSavingDeck(false);
    }
  };

  // Delete the current deck
  const deleteDeck = async () => {
    try {
      if (!editingDeck) return;

      await api.deleteDeck(editingDeck);

      // Reload decks
      await reloadDecks();

      // Reset state
      setEditingDeck(null);
      setSelectedDeck(null);
      setDeckCards([]);
      setDeckName("");
      setDeckDescription("");
      setConfirmDelete(false);

      // Select first deck if available
      if (decks.length > 1) {
        // Should be at least one less after deletion
        const nextDeck = decks.find((d) => d._id !== editingDeck) || decks[0];
        setSelectedDeck(nextDeck._id);
        loadDeck(nextDeck);
      } else {
        startNewDeck();
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
      setValidationError(error.message || "Failed to delete deck");
    }
  };

  // Set a deck as default
  const setAsDefaultDeck = async (deckId) => {
    try {
      await api.setDefaultDeck(deckId);
      await reloadDecks();
    } catch (error) {
      console.error("Error setting default deck:", error);
      setValidationError(error.message || "Failed to set default deck");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterRarity("all");
    setSortBy("name");
    setSortAscending(true);
  };

  if (authLoading) {
    return <LoadingScreen message="Loading deck builder..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/lobby")}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-neutral-400" />
            </button>
            <h1 className="text-3xl font-bold text-primary-400 flex items-center">
              <BookOpen className="mr-3 h-8 w-8" />
              Deck Builder
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Deck List Sidebar */}
          <div className="lg:col-span-3 bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-200">
                Your Decks
              </h2>
              <button
                onClick={startNewDeck}
                className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
                title="Create New Deck"
              >
                <PlusCircle className="h-5 w-5 text-primary-400" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {decks.length === 0 ? (
                <div className="p-6 text-center text-neutral-400">
                  <p>No decks found. Create your first deck!</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-700">
                  {decks.map((deck) => (
                    <div
                      key={deck._id}
                      className={`p-4 hover:bg-neutral-700/30 transition-colors cursor-pointer
                        ${
                          selectedDeck === deck._id
                            ? "bg-neutral-700/50 border-l-4 border-primary-500"
                            : ""
                        }
                      `}
                      onClick={() => {
                        setSelectedDeck(deck._id);
                        loadDeck(deck);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-neutral-200 flex items-center">
                            {deck.name}
                            {deck.isDefault && (
                              <span className="ml-2 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                                Default
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-neutral-400">
                            {deck.cards.length} cards
                          </p>
                        </div>
                        {selectedDeck === deck._id && (
                          <ChevronRight className="h-5 w-5 text-primary-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deck stats toggle button */}
            {deckStats && (
              <div className="p-4 border-t border-neutral-700">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="w-full flex items-center justify-between p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart2 className="h-5 w-5 text-primary-400 mr-2" />
                    <span className="text-neutral-200">Deck Statistics</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-neutral-400 transition-transform ${
                      showStats ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Stats panel */}
                {showStats && (
                  <div className="mt-4 p-4 bg-neutral-700/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-neutral-400">Cards</p>
                        <p className="text-lg font-bold text-neutral-200">
                          {deckStats.cardCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Avg. Cost</p>
                        <p className="text-lg font-bold text-neutral-200">
                          {deckStats.averageCost}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-neutral-400 mb-2">
                        Card Types
                      </p>
                      {Object.entries(deckStats.typeDistribution).map(
                        ([type, count]) => (
                          <div
                            key={type}
                            className="flex justify-between items-center mb-1"
                          >
                            <span className="text-sm text-neutral-300 capitalize">
                              {type}
                            </span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-neutral-200">
                                {count}
                              </span>
                              <span className="text-xs text-neutral-400 ml-1">
                                (
                                {Math.round(
                                  (count / deckStats.cardCount) * 100
                                )}
                                %)
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-neutral-400 mb-2">
                        Card Rarities
                      </p>
                      {Object.entries(deckStats.rarityDistribution).map(
                        ([rarity, count]) => (
                          <div
                            key={rarity}
                            className="flex justify-between items-center mb-1"
                          >
                            <span className="text-sm text-neutral-300 capitalize">
                              {rarity}
                            </span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-neutral-200">
                                {count}
                              </span>
                              <span className="text-xs text-neutral-400 ml-1">
                                (
                                {Math.round(
                                  (count / deckStats.cardCount) * 100
                                )}
                                %)
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Deck Building Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Deck Editor Header */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="Deck Name"
                    className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-primary-500 focus:outline-none text-neutral-200 text-xl font-bold"
                  />
                  <textarea
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    placeholder="Deck Description (optional)"
                    className="w-full mt-3 p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-primary-500 focus:outline-none text-neutral-200 resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex flex-shrink-0 items-center gap-3">
                  {/* Only show "Set as Default" button if not default already */}
                  {editingDeck &&
                    decks.find((d) => d._id === editingDeck) &&
                    !decks.find((d) => d._id === editingDeck).isDefault && (
                      <button
                        onClick={() => setAsDefaultDeck(editingDeck)}
                        className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                      >
                        Set as Default
                      </button>
                    )}

                  <button
                    onClick={saveDeck}
                    disabled={savingDeck || !deckName.trim()}
                    className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    {savingDeck ? "Saving..." : "Save Deck"}
                  </button>

                  {!isNewDeck && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Delete Confirmation UI */}
              {confirmDelete && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                  <p className="text-red-400 mb-3">
                    Are you sure you want to delete this deck?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={deleteDeck}
                      className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="py-2 px-4 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Validation error */}
              {validationError && (
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500 text-amber-400 rounded-lg">
                  {validationError}
                </div>
              )}
            </div>

            {/* Current Deck Cards */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4 flex items-center">
                <Edit className="mr-2 h-5 w-5 text-primary-400" />
                Current Deck ({deckCards.length} cards)
              </h2>

              {deckCards.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 border-2 border-dashed border-neutral-700 rounded-lg">
                  <p className="mb-2">Your deck is empty</p>
                  <p className="text-sm">
                    Add cards from your collection below
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Group and count cards in the deck */}
                  {Array.from(new Set(deckCards)).map((cardId) => {
                    const card = cards.find((c) => c.id === cardId);
                    if (!card) return null;

                    const count = getCardCount(cardId);
                    return (
                      <CollectionCard
                        key={cardId}
                        card={card}
                        compact={true}
                        deckCount={count}
                        onAddToDeck={addCardToDeck}
                        onRemoveFromDeck={removeCardFromDeck}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Cards */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">
                Available Cards
              </h2>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cards..."
                  className="p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-primary-500 focus:outline-none text-neutral-200"
                />

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-primary-500 focus:outline-none text-neutral-200"
                >
                  <option value="all">All Types</option>
                  <option value="city">City</option>
                  <option value="resource">Resource</option>
                  <option value="unit">Unit</option>
                  <option value="defensive">Defensive</option>
                </select>

                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-primary-500 focus:outline-none text-neutral-200"
                >
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              {/* Card list */}
              {filteredCards.length === 0 ? (
                <div className="py-8 text-center text-neutral-400">
                  <p>No cards match your filters</p>
                  <button
                    onClick={resetFilters}
                    className="mt-2 text-primary-400 hover:text-primary-300"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredCards.map((card) => (
                    <CollectionCard
                      key={card.id}
                      card={card}
                      compact={true}
                      isInDeck={deckCards.includes(card.id)}
                      deckCount={getCardCount(card.id)}
                      onAddToDeck={addCardToDeck}
                      onRemoveFromDeck={removeCardFromDeck}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
