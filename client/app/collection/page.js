"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useCardCollection } from "@/components/CardCollectionContext";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import CollectionCard from "@/components/CollectionCard";
import {
  Grid3X3,
  BookOpen,
  Filter,
  Search,
  X,
  ChevronLeft,
  FileText,
} from "lucide-react";
import {
  filterCardsBySearchTerm,
  filterCardsByType,
  filterCardsByRarity,
  filterCardsByOwnership,
  groupCardsByType,
  sortCards,
} from "@/utils/cardCollectionUtils";

export default function CollectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    cards,
    loading: cardsLoading,
    error,
    reloadCards,
  } = useCardCollection();
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRarity, setFilterRarity] = useState("all");
  const [onlyOwned, setOnlyOwned] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [sortAscending, setSortAscending] = useState(true);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState(null);

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

  // Group cards by type for display
  const cardsByType = groupCardsByType(filteredCards);

  // Load cards on mount and when user changes
  useEffect(() => {
    if (!authLoading && user) {
      reloadCards();
    }
  }, [authLoading, user, reloadCards]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterRarity("all");
    setOnlyOwned(true);
    setSortBy("name");
    setSortAscending(true);
  };

  if (authLoading) {
    return <LoadingScreen message="Loading your collection..." />;
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
            <h1 className="text-3xl font-bold text-secondary-400 flex items-center">
              <Grid3X3 className="mr-3 h-8 w-8" />
              Card Collection
            </h1>
          </div>

          <button
            onClick={() => router.push("/decks")}
            className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all flex items-center shadow-gold hover:shadow-gold-lg"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Deck Builder
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters and search */}
        <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search cards..."
                className="w-full pl-10 p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-neutral-400 hover:text-neutral-200" />
                </button>
              )}
            </div>

            {/* Type filter */}
            <div className="flex-shrink-0 w-full md:w-48">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              >
                <option value="all">All Types</option>
                <option value="city">City</option>
                <option value="resource">Resource</option>
                <option value="unit">Unit</option>
                <option value="defensive">Defensive</option>
              </select>
            </div>

            {/* Rarity filter */}
            <div className="flex-shrink-0 w-full md:w-48">
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            {/* Ownership filter */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setOnlyOwned(!onlyOwned)}
                className={`w-full p-3 rounded-lg border font-medium ${
                  onlyOwned
                    ? "bg-secondary-600 text-white border-secondary-500"
                    : "bg-neutral-700 text-neutral-300 border-neutral-600"
                }`}
              >
                {onlyOwned ? "Owned Only" : "All Cards"}
              </button>
            </div>

            {/* Reset filters */}
            <div className="flex-shrink-0">
              <button
                onClick={resetFilters}
                className="w-full p-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg border border-neutral-600 font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Collection stats */}
        <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-secondary-400 mr-2" />
              <span className="text-neutral-300 font-medium">
                Collection Stats
              </span>
            </div>
            <div className="flex flex-wrap gap-6 text-center">
              <div>
                <p className="text-sm text-neutral-400">Total Cards</p>
                <p className="text-2xl font-bold text-secondary-400">
                  {cards.filter((card) => card.ownedCount > 0).length} /{" "}
                  {cards.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Common</p>
                <p className="text-xl font-bold text-gray-300">
                  {
                    cards.filter(
                      (card) => card.rarity === "common" && card.ownedCount > 0
                    ).length
                  }{" "}
                  / {cards.filter((card) => card.rarity === "common").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Uncommon</p>
                <p className="text-xl font-bold text-green-400">
                  {
                    cards.filter(
                      (card) =>
                        card.rarity === "uncommon" && card.ownedCount > 0
                    ).length
                  }{" "}
                  / {cards.filter((card) => card.rarity === "uncommon").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Rare</p>
                <p className="text-xl font-bold text-blue-400">
                  {
                    cards.filter(
                      (card) => card.rarity === "rare" && card.ownedCount > 0
                    ).length
                  }{" "}
                  / {cards.filter((card) => card.rarity === "rare").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Epic</p>
                <p className="text-xl font-bold text-purple-400">
                  {
                    cards.filter(
                      (card) => card.rarity === "epic" && card.ownedCount > 0
                    ).length
                  }{" "}
                  / {cards.filter((card) => card.rarity === "epic").length}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Legendary</p>
                <p className="text-xl font-bold text-amber-400">
                  {
                    cards.filter(
                      (card) =>
                        card.rarity === "legendary" && card.ownedCount > 0
                    ).length
                  }{" "}
                  / {cards.filter((card) => card.rarity === "legendary").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card grid */}
        {filteredCards.length === 0 ? (
          <div className="bg-neutral-800 p-8 rounded-xl border border-neutral-700 shadow-lg text-center">
            <Filter className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-300 mb-2">
              No cards match your filters
            </h3>
            <p className="text-neutral-400 mb-4">
              Try adjusting your search or filters to see more cards.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(cardsByType).map(([type, typeCards]) => (
              <div key={type}>
                <h2 className="text-2xl font-bold text-neutral-200 mb-4 capitalize">
                  {type} Cards
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {typeCards.map((card) => (
                    <CollectionCard
                      key={card.id}
                      card={card}
                      onClick={setSelectedCard}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-secondary-400">
                  Card Details
                </h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-neutral-400" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Card preview */}
                <div className="flex-shrink-0">
                  <CollectionCard card={selectedCard} />
                </div>

                {/* Card details */}
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-neutral-200 mb-2">
                    {selectedCard.name}
                  </h3>

                  <div className="flex gap-3 mb-4">
                    <span className="px-3 py-1 bg-neutral-700 rounded-full text-sm font-medium capitalize">
                      {selectedCard.type}
                    </span>
                    <span className="px-3 py-1 bg-neutral-700 rounded-full text-sm font-medium capitalize">
                      {selectedCard.rarity}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-1">
                        Description
                      </h4>
                      <p className="text-neutral-200">
                        {selectedCard.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-1">
                        Effect
                      </h4>
                      <p className="text-neutral-200">{selectedCard.effect}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          In-game Cost
                        </h4>
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">⚙️</span>
                          <span className="text-neutral-200 font-medium">
                            {selectedCard.inGameCost?.production ||
                              selectedCard.cost?.production ||
                              0}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          Copies Owned
                        </h4>
                        <p className="text-neutral-200 font-medium">
                          {selectedCard.ownedCount || 0}
                        </p>
                      </div>

                      {selectedCard.health && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Health
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {selectedCard.health}
                          </p>
                        </div>
                      )}

                      {selectedCard.attackDamage && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Attack Damage
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {selectedCard.attackDamage}
                          </p>
                        </div>
                      )}

                      {selectedCard.attackRange && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Attack Range
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {selectedCard.attackRange}
                          </p>
                        </div>
                      )}

                      {selectedCard.cityDamage && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            City Damage
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {selectedCard.cityDamage}
                          </p>
                        </div>
                      )}

                      {selectedCard.speed && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Speed
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {selectedCard.speed}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
