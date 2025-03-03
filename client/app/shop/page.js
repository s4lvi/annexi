"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useCardCollection } from "@/components/CardCollectionContext";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import CollectionCard from "@/components/CollectionCard";
import {
  ShoppingCart,
  ChevronLeft,
  Package,
  Gift,
  CreditCard,
  Check,
  X,
  AlertTriangle,
  Star,
} from "lucide-react";

export default function ShopPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    cards,
    loading: cardsLoading,
    error,
    reloadCards,
    api,
  } = useCardCollection();

  // Shop state
  const [shopCards, setShopCards] = useState([]);
  const [featuredCards, setFeaturedCards] = useState([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopError, setShopError] = useState(null);
  const [userCurrency, setUserCurrency] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);

  // Pack purchase state
  const [selectingPack, setSelectingPack] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [packPurchaseResult, setPackPurchaseResult] = useState(null);
  const [acquiredCards, setAcquiredCards] = useState([]);

  // Filter state
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Card packs definitions
  const cardPacks = [
    {
      id: "basic",
      name: "Basic Pack",
      description: "3 cards with at least one Uncommon or better",
      cost: 200,
      cardCount: 3,
      guaranteedRarity: "uncommon",
      image: "basic-pack.png",
      color: "bg-gradient-to-br from-green-600 to-green-800",
    },
    {
      id: "premium",
      name: "Premium Pack",
      description: "5 cards with at least one Rare or better",
      cost: 500,
      cardCount: 5,
      guaranteedRarity: "rare",
      image: "premium-pack.png",
      color: "bg-gradient-to-br from-blue-600 to-blue-800",
    },
    {
      id: "ultimate",
      name: "Ultimate Pack",
      description: "7 cards with at least one Epic or better",
      cost: 1000,
      cardCount: 7,
      guaranteedRarity: "epic",
      image: "ultimate-pack.png",
      color: "bg-gradient-to-br from-purple-600 to-purple-800",
    },
  ];

  // Load user info and shop data when component mounts
  useEffect(() => {
    if (!authLoading && user) {
      loadShopData();
      getUserInfo();
    }
  }, [authLoading, user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Filter shop cards based on search and type filter
  const filteredShopCards = shopCards
    .filter((card) => {
      // Filter by type
      if (filterType !== "all" && card.type !== filterType) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          card.name.toLowerCase().includes(term) ||
          (card.description && card.description.toLowerCase().includes(term)) ||
          (card.effect && card.effect.toLowerCase().includes(term))
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by rarity (descending) then by name (ascending)
      const rarityOrder = {
        legendary: 5,
        epic: 4,
        rare: 3,
        uncommon: 2,
        common: 1,
      };
      if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      }
      return a.name.localeCompare(b.name);
    });

  // Load shop data from API
  const loadShopData = async () => {
    try {
      setLoadingShop(true);
      setShopError(null);

      // Load shop cards
      const shopCardsData = await api.getShopCards();

      // Combine with owned card data
      const combinedCards = shopCardsData.map((shopCard) => {
        const ownedCard = cards.find((c) => c.id === shopCard.id);
        return {
          ...shopCard,
          ownedCount: ownedCard ? ownedCard.ownedCount : 0,
        };
      });

      setShopCards(combinedCards);

      // Load featured cards
      const featuredCardsData = await api.getFeaturedCards();
      const combinedFeatured = featuredCardsData.map((featuredCard) => {
        const ownedCard = cards.find((c) => c.id === featuredCard.id);
        return {
          ...featuredCard,
          ownedCount: ownedCard ? ownedCard.ownedCount : 0,
        };
      });

      setFeaturedCards(combinedFeatured);
      setLoadingShop(false);
    } catch (error) {
      console.error("Error loading shop data:", error);
      setShopError(error.message || "Failed to load shop data");
      setLoadingShop(false);
    }
  };

  // Get user info (especially currency)
  const getUserInfo = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/profile/${user._id}`
      );
      const data = await response.json();

      if (data.success && data.profile) {
        setUserCurrency(data.profile.currency || 0);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // Handle card purchase
  const handlePurchaseCard = async (card) => {
    if (isPurchasing) return;

    try {
      setIsPurchasing(true);
      setPurchaseResult(null);

      // Check if user has enough currency
      if (userCurrency < card.shopCost) {
        setPurchaseResult({
          success: false,
          message: "Not enough currency to purchase this card",
        });
        setIsPurchasing(false);
        return;
      }

      // Attempt to purchase the card
      const result = await api.purchaseCard(card.id);

      // Update local state
      setUserCurrency(result.remainingCurrency);
      setPurchaseResult({
        success: true,
        message: `Successfully purchased ${card.name}`,
        card: card,
      });

      // Reload cards to update collection
      await reloadCards();
      await loadShopData();
    } catch (error) {
      console.error("Error purchasing card:", error);
      setPurchaseResult({
        success: false,
        message: error.message || "Failed to purchase card",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle pack purchase
  const handlePurchasePack = async (pack) => {
    if (isPurchasing) return;

    try {
      setIsPurchasing(true);
      setPackPurchaseResult(null);
      setAcquiredCards([]);

      // Check if user has enough currency
      if (userCurrency < pack.cost) {
        setPackPurchaseResult({
          success: false,
          message: "Not enough currency to purchase this pack",
        });
        setIsPurchasing(false);
        return;
      }

      // Attempt to purchase the pack
      const result = await api.purchaseCardPack(pack.id);

      // Update local state
      setUserCurrency(result.remainingCurrency);
      setPackPurchaseResult({
        success: true,
        message: `Successfully opened ${pack.name}`,
        cards: result.cards,
      });

      // Set acquired cards for display
      setAcquiredCards(result.cards);

      // Reload cards to update collection
      await reloadCards();
    } catch (error) {
      console.error("Error purchasing pack:", error);
      setPackPurchaseResult({
        success: false,
        message: error.message || "Failed to purchase pack",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Close purchase modals
  const closePurchaseModals = () => {
    setSelectedCard(null);
    setPurchaseResult(null);
    setSelectingPack(false);
    setSelectedPack(null);
    setPackPurchaseResult(null);
    setAcquiredCards([]);
  };

  if (authLoading || loadingShop) {
    return <LoadingScreen message="Loading shop..." />;
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
            <h1 className="text-3xl font-bold text-amber-400 flex items-center">
              <ShoppingCart className="mr-3 h-8 w-8" />
              Card Shop
            </h1>
          </div>

          {/* Currency display */}
          <div className="py-2 px-4 bg-neutral-800 rounded-lg border border-amber-500/20 flex items-center">
            <CreditCard className="h-5 w-5 text-amber-400 mr-2" />
            <span className="font-bold text-amber-400">{userCurrency}</span>
            <span className="ml-1 text-neutral-400">currency</span>
          </div>
        </div>

        {(error || shopError) && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error || shopError}
          </div>
        )}

        {/* Card Packs Section */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center">
            <Package className="mr-3 h-6 w-6" />
            Card Packs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cardPacks.map((pack) => (
              <div
                key={pack.id}
                className={`${pack.color} rounded-xl border border-neutral-600 shadow-lg overflow-hidden transition-transform hover:scale-105 cursor-pointer`}
                onClick={() => {
                  setSelectingPack(true);
                  setSelectedPack(pack);
                }}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {pack.name}
                  </h3>
                  <p className="text-white/80 mb-4">{pack.description}</p>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-white/80" />
                      <span className="text-white font-medium">
                        {pack.cardCount} Cards
                      </span>
                    </div>
                    <div className="py-1 px-3 bg-black/30 rounded-full text-white font-bold">
                      {pack.cost}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Cards Section */}
        {featuredCards.length > 0 && (
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center">
              <Star className="mr-3 h-6 w-6" />
              Featured Cards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {featuredCards.map((card) => (
                <CollectionCard
                  key={card.id}
                  card={card}
                  showShopControls={true}
                  userCurrency={userCurrency}
                  onClick={() => setSelectedCard(card)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Cards Section */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg p-6">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">All Cards</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cards..."
              className="p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-amber-500 focus:outline-none text-neutral-200"
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-amber-500 focus:outline-none text-neutral-200"
            >
              <option value="all">All Types</option>
              <option value="city">City</option>
              <option value="resource">Resource</option>
              <option value="unit">Unit</option>
              <option value="defensive">Defensive</option>
            </select>
          </div>

          {/* Card Grid */}
          {filteredShopCards.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <p>No cards match your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredShopCards.map((card) => (
                <CollectionCard
                  key={card.id}
                  card={card}
                  showShopControls={true}
                  userCurrency={userCurrency}
                  onClick={() => setSelectedCard(card)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Purchase Modal */}
      {selectedCard && !purchaseResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-6">
                Purchase Card
              </h2>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <CollectionCard
                    card={selectedCard}
                    disabled={userCurrency < selectedCard.shopCost}
                  />
                </div>

                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-neutral-200 mb-2">
                    {selectedCard.name}
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-neutral-700 rounded-full text-sm font-medium capitalize">
                      {selectedCard.type}
                    </span>
                    <span className="px-3 py-1 bg-neutral-700 rounded-full text-sm font-medium capitalize">
                      {selectedCard.rarity}
                    </span>
                    {selectedCard.ownedCount > 0 && (
                      <span className="px-3 py-1 bg-neutral-700 rounded-full text-sm font-medium">
                        Owned: {selectedCard.ownedCount}
                      </span>
                    )}
                  </div>

                  <p className="text-neutral-300 mb-4">
                    {selectedCard.description || selectedCard.effect}
                  </p>

                  <div className="mt-6 p-4 bg-neutral-700 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-neutral-400 text-sm">Purchase Price</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {selectedCard.shopCost}
                      </p>
                    </div>

                    <div>
                      <p className="text-neutral-400 text-sm">Your Balance</p>
                      <p
                        className={`text-lg font-bold ${
                          userCurrency >= selectedCard.shopCost
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {userCurrency}
                      </p>
                    </div>
                  </div>

                  {userCurrency < selectedCard.shopCost && (
                    <div className="mt-4 flex items-start p-3 bg-red-900/20 border border-red-500 text-red-400 rounded-lg">
                      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <p>
                        You don't have enough currency to purchase this card.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={closePurchaseModals}
                      className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => handlePurchaseCard(selectedCard)}
                      disabled={
                        userCurrency < selectedCard.shopCost || isPurchasing
                      }
                      className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isPurchasing ? (
                        <>
                          <span className="animate-pulse mr-2">●</span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Purchase
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Result Modal */}
      {purchaseResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-center mb-6">
                {purchaseResult.success ? (
                  <div className="p-4 bg-green-500/20 rounded-full">
                    <Check className="h-12 w-12 text-green-500" />
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/20 rounded-full">
                    <X className="h-12 w-12 text-red-500" />
                  </div>
                )}
              </div>

              <h2
                className={`text-xl font-bold text-center mb-4 ${
                  purchaseResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {purchaseResult.success
                  ? "Purchase Successful"
                  : "Purchase Failed"}
              </h2>

              <p className="text-neutral-300 text-center mb-6">
                {purchaseResult.message}
              </p>

              {purchaseResult.success && purchaseResult.card && (
                <div className="flex justify-center mb-6">
                  <CollectionCard card={purchaseResult.card} disabled={false} />
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={closePurchaseModals}
                  className="py-2 px-6 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Pack Selection Modal */}
      {selectingPack && selectedPack && !packPurchaseResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-6">
                Purchase Card Pack
              </h2>

              <div
                className={`${selectedPack.color} rounded-xl p-6 border border-neutral-600 mb-6`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedPack.name}
                </h3>
                <p className="text-white/80 mb-4">{selectedPack.description}</p>

                <ul className="mb-4 space-y-2 text-white/90">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Contains {selectedPack.cardCount} random cards
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Guaranteed {selectedPack.guaranteedRarity} or better rarity
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-neutral-700 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-neutral-400 text-sm">Pack Price</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {selectedPack.cost}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-400 text-sm">Your Balance</p>
                  <p
                    className={`text-lg font-bold ${
                      userCurrency >= selectedPack.cost
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {userCurrency}
                  </p>
                </div>
              </div>

              {userCurrency < selectedPack.cost && (
                <div className="mt-4 flex items-start p-3 bg-red-900/20 border border-red-500 text-red-400 rounded-lg">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p>You don't have enough currency to purchase this pack.</p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closePurchaseModals}
                  className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handlePurchasePack(selectedPack)}
                  disabled={userCurrency < selectedPack.cost || isPurchasing}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isPurchasing ? (
                    <>
                      <span className="animate-pulse mr-2">●</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-5 w-5" />
                      Purchase Pack
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pack Opening Result Modal */}
      {packPurchaseResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-4xl w-full">
            <div className="p-6">
              <div className="flex justify-center mb-6">
                {packPurchaseResult.success ? (
                  <div className="p-4 bg-green-500/20 rounded-full">
                    <Gift className="h-12 w-12 text-green-500" />
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/20 rounded-full">
                    <X className="h-12 w-12 text-red-500" />
                  </div>
                )}
              </div>

              <h2
                className={`text-xl font-bold text-center mb-4 ${
                  packPurchaseResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {packPurchaseResult.success
                  ? "Pack Opened!"
                  : "Purchase Failed"}
              </h2>

              <p className="text-neutral-300 text-center mb-6">
                {packPurchaseResult.message}
              </p>

              {packPurchaseResult.success && acquiredCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  {acquiredCards.map((card, index) => (
                    <div
                      key={`${card.id}-${index}`}
                      className="flex justify-center"
                    >
                      <CollectionCard card={card} disabled={false} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={closePurchaseModals}
                  className="py-2 px-6 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
