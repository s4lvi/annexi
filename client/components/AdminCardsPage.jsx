"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import {
  PlusCircle,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Eye,
  Filter,
  Image,
  Film,
} from "lucide-react";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import GameCard from "@/components/GameCard";

export default function AdminCardsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [newCardFormVisible, setNewCardFormVisible] = useState(false);
  const [cardFormData, setCardFormData] = useState({
    id: "",
    name: "",
    type: "city",
    rarity: "common",
    description: "",
    effect: "",
    inGameCost: { production: 0, gold: 0 },
    shopCost: 0,
    isBasic: false,
    health: 0,
    attackDamage: 0,
    attackRange: 0,
    speed: 0,
    cityDamage: 0,
    reusable: false,
    count: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [iconPreviewUrl, setIconPreviewUrl] = useState("");
  const [previewCard, setPreviewCard] = useState(null);

  // Animation files state
  const [animationFiles, setAnimationFiles] = useState({
    moving: [],
    attacking: [],
    death: [],
  });
  // Animation previews
  const [animationPreviews, setAnimationPreviews] = useState({
    moving: [],
    attacking: [],
    death: [],
  });

  // Animation upload section toggle
  const [showAnimationUpload, setShowAnimationUpload] = useState(false);

  // Default deck management
  const [defaultDeck, setDefaultDeck] = useState([]);
  const [editingDefaultDeck, setEditingDefaultDeck] = useState(false);
  const [cardCounts, setCardCounts] = useState({});
  const [filter, setFilter] = useState({
    type: "all",
    rarity: "all",
    search: "",
  });

  // Fetch cards on component mount
  useEffect(() => {
    if (!loading && user) {
      if (user.isAdmin) {
        fetchCards();
        fetchDefaultDeck();
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards?userId=${user._id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }
      const data = await response.json();
      setCards(data.cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDefaultDeck = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/default-deck?userId=${user._id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch default deck");
      }
      const data = await response.json();
      setDefaultDeck(data.deck || []);

      // Count occurrences of each card in the deck
      const counts = {};
      (data.deck || []).forEach((cardId) => {
        counts[cardId] = (counts[cardId] || 0) + 1;
      });
      setCardCounts(counts);
    } catch (error) {
      console.error("Error fetching default deck:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setCardFormData({
        ...cardFormData,
        [parent]: {
          ...cardFormData[parent],
          [child]: type === "number" ? Number(value) : value,
        },
      });
    } else {
      setCardFormData({
        ...cardFormData,
        [name]:
          type === "checkbox"
            ? checked
            : type === "number"
            ? Number(value)
            : value,
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);
      setIconPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnimationChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (files && files.length > 0) {
      // Update animation files
      setAnimationFiles({
        ...animationFiles,
        [type]: [...animationFiles[type], ...files],
      });

      // Create and update preview URLs
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setAnimationPreviews({
        ...animationPreviews,
        [type]: [...animationPreviews[type], ...newPreviews],
      });
    }
  };

  const removeAnimation = (type, index) => {
    const updatedFiles = [...animationFiles[type]];
    const updatedPreviews = [...animationPreviews[type]];

    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setAnimationFiles({
      ...animationFiles,
      [type]: updatedFiles,
    });

    setAnimationPreviews({
      ...animationPreviews,
      [type]: updatedPreviews,
    });
  };

  const handleNewCard = () => {
    setCardFormData({
      id: "",
      name: "",
      type: "city",
      rarity: "common",
      description: "",
      effect: "",
      inGameCost: { production: 0, gold: 0 },
      shopCost: 0,
      isBasic: false,
      health: 0,
      attackDamage: 0,
      attackRange: 0,
      speed: 0,
      cityDamage: 0,
      reusable: false,
      count: 1,
    });
    setImageFile(null);
    setIconFile(null);
    setPreviewUrl("");
    setIconPreviewUrl("");
    setAnimationFiles({ moving: [], attacking: [], death: [] });
    setAnimationPreviews({ moving: [], attacking: [], death: [] });
    setNewCardFormVisible(true);
    setEditingCard(null);
    setShowAnimationUpload(false);
  };

  const handleEditCard = (card) => {
    setCardFormData({
      ...card,
      inGameCost: card.inGameCost || { production: 0, gold: 0 },
    });
    setPreviewUrl(
      card.imageUrl
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}${card.imageUrl}`
        : ""
    );
    setIconPreviewUrl(
      card.iconUrl
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}${card.iconUrl}`
        : ""
    );
    setNewCardFormVisible(false);
    setEditingCard(card);
    setShowAnimationUpload(false);

    // Reset animation previews
    setAnimationFiles({ moving: [], attacking: [], death: [] });
    setAnimationPreviews({ moving: [], attacking: [], death: [] });
  };

  const handlePreviewCard = (card) => {
    setPreviewCard(card);
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm("Are you sure you want to delete this card?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards/${cardId}?userId=${user._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete card");
      }

      setCards(cards.filter((card) => card.id !== cardId));

      // Also remove from default deck if present
      if (defaultDeck.includes(cardId)) {
        setDefaultDeck(defaultDeck.filter((id) => id !== cardId));
        await handleSaveDefaultDeck(defaultDeck.filter((id) => id !== cardId));
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      setError(error.message);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();

    try {
      // Create or update the card
      const method = editingCard ? "PUT" : "POST";
      const url = editingCard
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards/${editingCard.id}?userId=${user._id}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards?userId=${user._id}`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save card");
      }

      const { card } = await response.json();

      // Upload image if provided
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("userId", user._id);

        const imageResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards/${card.id}/image?userId=${user._id}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!imageResponse.ok) {
          throw new Error("Failed to upload image");
        }
      }

      // Upload icon if provided
      if (iconFile) {
        const formData = new FormData();
        formData.append("icon", iconFile);
        formData.append("userId", user._id);

        const iconResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards/${card.id}/icon?userId=${user._id}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!iconResponse.ok) {
          throw new Error("Failed to upload icon");
        }
      }

      // Upload animations if provided
      const animationTypes = ["moving", "attacking", "death"];
      for (const type of animationTypes) {
        if (animationFiles[type].length > 0) {
          const formData = new FormData();
          animationFiles[type].forEach((file, index) => {
            formData.append(`${type}`, file);
          });
          formData.append("userId", user._id);
          formData.append("animationType", type);

          const animationResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/cards/${card.id}/animation?userId=${user._id}`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!animationResponse.ok) {
            throw new Error(`Failed to upload ${type} animations`);
          }
        }
      }

      // Reset form and refresh cards
      setNewCardFormVisible(false);
      setEditingCard(null);
      setShowAnimationUpload(false);
      fetchCards();
    } catch (error) {
      console.error("Error saving card:", error);
      setError(error.message);
    }
  };

  const handleSaveDefaultDeck = async (deckToSave = defaultDeck) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/admin/default-deck?userId=${user._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deck: deckToSave,
            userId: user._id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update default deck");
      }

      setEditingDefaultDeck(false);

      // Update card counts
      const counts = {};
      deckToSave.forEach((cardId) => {
        counts[cardId] = (counts[cardId] || 0) + 1;
      });
      setCardCounts(counts);
    } catch (error) {
      console.error("Error saving default deck:", error);
      setError(error.message);
    }
  };

  const handleAddToDeck = (cardId) => {
    const card = cards.find((c) => c.id === cardId);
    const currentCount = cardCounts[cardId] || 0;
    const maxCopies = card.count || 3;

    if (currentCount >= maxCopies) {
      setError(`Maximum ${maxCopies} copies of ${card.name} allowed in deck`);
      return;
    }

    const newDeck = [...defaultDeck, cardId];
    setDefaultDeck(newDeck);
    setCardCounts({
      ...cardCounts,
      [cardId]: currentCount + 1,
    });
  };

  const handleRemoveFromDeck = (index) => {
    const newDeck = [...defaultDeck];
    const removedCardId = newDeck[index];
    newDeck.splice(index, 1);
    setDefaultDeck(newDeck);

    // Update card count
    setCardCounts({
      ...cardCounts,
      [removedCardId]: (cardCounts[removedCardId] || 0) - 1,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value,
    });
  };

  const filteredCards = cards.filter((card) => {
    const matchesType = filter.type === "all" || card.type === filter.type;
    const matchesRarity =
      filter.rarity === "all" || card.rarity === filter.rarity;
    const matchesSearch =
      !filter.search ||
      card.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      card.id.toLowerCase().includes(filter.search.toLowerCase());

    return matchesType && matchesRarity && matchesSearch;
  });

  if (loading) {
    return <LoadingScreen message="Loading admin panel..." />;
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="bg-neutral-800 p-8 rounded-xl shadow-gold border border-secondary-500/20 text-center">
          <h1 className="text-2xl font-bold text-secondary-400 mb-4">
            Access Denied
          </h1>
          <p className="text-neutral-300 mb-6">
            You need admin privileges to access this page.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-secondary-400">
            Admin Card Management
          </h1>
          <button
            onClick={handleNewCard}
            className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all shadow-gold hover:shadow-gold-lg flex items-center"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Card
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <p>{error}</p>
            <button onClick={() => setError(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Card Form */}
        {(newCardFormVisible || editingCard) && (
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-lg mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-secondary-400">
                {editingCard
                  ? `Edit Card: ${editingCard.name}`
                  : "Create New Card"}
              </h2>
              <button
                onClick={() => {
                  setNewCardFormVisible(false);
                  setEditingCard(null);
                }}
                className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-neutral-400" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCard}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Card ID
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={cardFormData.id}
                    onChange={handleInputChange}
                    disabled={!!editingCard}
                    className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    required
                    placeholder="unique-card-id"
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    Unique identifier, use kebab-case (e.g., "archer-tower")
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Card Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={cardFormData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    required
                    placeholder="Card Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={cardFormData.type}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                      required
                    >
                      <option value="city">City</option>
                      <option value="resource">Resource</option>
                      <option value="unit">Unit</option>
                      <option value="defensive">Defensive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Rarity
                    </label>
                    <select
                      name="rarity"
                      value={cardFormData.rarity}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                      required
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={cardFormData.description}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Card description visible in collection"
                    className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Effect
                  </label>
                  <textarea
                    name="effect"
                    value={cardFormData.effect}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Card effect text visible during gameplay"
                    className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Production Cost
                    </label>
                    <input
                      type="number"
                      name="inGameCost.production"
                      value={cardFormData.inGameCost.production}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Gold Cost
                    </label>
                    <input
                      type="number"
                      name="inGameCost.gold"
                      value={cardFormData.inGameCost.gold}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Shop Cost
                  </label>
                  <input
                    type="number"
                    name="shopCost"
                    value={cardFormData.shopCost}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isBasic"
                    name="isBasic"
                    checked={cardFormData.isBasic}
                    onChange={handleInputChange}
                    className="w-4 h-4 bg-neutral-700 border-neutral-600 rounded-sm focus:ring-secondary-500"
                  />
                  <label
                    htmlFor="isBasic"
                    className="ml-2 text-sm text-neutral-300"
                  >
                    Basic Card (available to all players)
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Health
                    </label>
                    <input
                      type="number"
                      name="health"
                      value={cardFormData.health}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Attack Damage
                    </label>
                    <input
                      type="number"
                      name="attackDamage"
                      value={cardFormData.attackDamage}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Attack Range
                    </label>
                    <input
                      type="number"
                      name="attackRange"
                      value={cardFormData.attackRange}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Speed
                    </label>
                    <input
                      type="number"
                      name="speed"
                      value={cardFormData.speed}
                      onChange={handleInputChange}
                      min="0"
                      step="0.1"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      City Damage
                    </label>
                    <input
                      type="number"
                      name="cityDamage"
                      value={cardFormData.cityDamage}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Max Copies in Deck
                    </label>
                    <input
                      type="number"
                      name="count"
                      value={cardFormData.count}
                      onChange={handleInputChange}
                      min="1"
                      max="20"
                      className="w-full p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                    />
                  </div>
                </div>

                <div className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    id="reusable"
                    name="reusable"
                    checked={cardFormData.reusable}
                    onChange={handleInputChange}
                    className="w-4 h-4 bg-neutral-700 border-neutral-600 rounded-sm focus:ring-secondary-500"
                  />
                  <label
                    htmlFor="reusable"
                    className="ml-2 text-sm text-neutral-300"
                  >
                    Reusable Card
                  </label>
                </div>

                {/* Card Images Section */}
                <div className="mb-2">
                  <h3 className="text-lg font-medium text-neutral-200 mb-3">
                    Card Images
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Card Image */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Card Image
                      </label>
                      <div className="flex-shrink-0 w-full h-40 bg-neutral-700 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-600 mb-2">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Card Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-neutral-400">No image</span>
                        )}
                      </div>
                      <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer bg-neutral-700 hover:bg-neutral-600 transition-colors">
                        <div className="flex items-center justify-center">
                          <Upload className="w-5 h-5 text-neutral-400 mr-2" />
                          <p className="text-sm text-neutral-300">
                            Click to upload card image
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>

                    {/* Card Icon */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Map Icon
                      </label>
                      <div className="flex-shrink-0 w-full h-40 bg-neutral-700 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-600 mb-2">
                        {iconPreviewUrl ? (
                          <img
                            src={iconPreviewUrl}
                            alt="Icon Preview"
                            className="w-24 h-24 object-contain"
                          />
                        ) : (
                          <span className="text-neutral-400">No icon</span>
                        )}
                      </div>
                      <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer bg-neutral-700 hover:bg-neutral-600 transition-colors">
                        <div className="flex items-center justify-center">
                          <Image className="w-5 h-5 text-neutral-400 mr-2" />
                          <p className="text-sm text-neutral-300">
                            Click to upload card icon
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleIconChange}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Animation Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowAnimationUpload(!showAnimationUpload)}
                    className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Film className="mr-2 h-5 w-5" />
                    {showAnimationUpload
                      ? "Hide Animation Uploads"
                      : "Show Animation Uploads"}
                  </button>
                </div>

                {/* Animation Uploads Section */}
                {showAnimationUpload && (
                  <div className="border border-neutral-700 rounded-lg p-4 bg-neutral-800/50 mb-4">
                    <h3 className="text-lg font-medium text-neutral-200 mb-3">
                      Card Animations
                    </h3>

                    {/* Moving Animations */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Moving Animations
                      </label>

                      {/* Preview of uploaded animations */}
                      {animationPreviews.moving.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {animationPreviews.moving.map((preview, index) => (
                            <div key={`moving-${index}`} className="relative">
                              <img
                                src={preview}
                                alt={`Moving Animation ${index}`}
                                className="w-16 h-16 object-cover rounded-md border border-neutral-600"
                              />
                              <button
                                onClick={() => removeAnimation("moving", index)}
                                className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                                type="button"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer bg-neutral-700 hover:bg-neutral-600 transition-colors">
                        <div className="flex items-center justify-center">
                          <Upload className="w-5 h-5 text-neutral-400 mr-2" />
                          <p className="text-sm text-neutral-300">
                            Upload moving animation frames
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAnimationChange(e, "moving")}
                        />
                      </label>
                    </div>

                    {/* Attacking Animations */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Attacking Animations
                      </label>

                      {/* Preview of uploaded animations */}
                      {animationPreviews.attacking.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {animationPreviews.attacking.map((preview, index) => (
                            <div
                              key={`attacking-${index}`}
                              className="relative"
                            >
                              <img
                                src={preview}
                                alt={`Attacking Animation ${index}`}
                                className="w-16 h-16 object-cover rounded-md border border-neutral-600"
                              />
                              <button
                                onClick={() =>
                                  removeAnimation("attacking", index)
                                }
                                className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                                type="button"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer bg-neutral-700 hover:bg-neutral-600 transition-colors">
                        <div className="flex items-center justify-center">
                          <Upload className="w-5 h-5 text-neutral-400 mr-2" />
                          <p className="text-sm text-neutral-300">
                            Upload attacking animation frames
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            handleAnimationChange(e, "attacking")
                          }
                        />
                      </label>
                    </div>

                    {/* Death Animations */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Death Animations
                      </label>

                      {/* Preview of uploaded animations */}
                      {animationPreviews.death.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {animationPreviews.death.map((preview, index) => (
                            <div key={`death-${index}`} className="relative">
                              <img
                                src={preview}
                                alt={`Death Animation ${index}`}
                                className="w-16 h-16 object-cover rounded-md border border-neutral-600"
                              />
                              <button
                                onClick={() => removeAnimation("death", index)}
                                className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                                type="button"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer bg-neutral-700 hover:bg-neutral-600 transition-colors">
                        <div className="flex items-center justify-center">
                          <Upload className="w-5 h-5 text-neutral-400 mr-2" />
                          <p className="text-sm text-neutral-300">
                            Upload death animation frames
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAnimationChange(e, "death")}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg font-semibold transition-all shadow-gold hover:shadow-gold-lg flex items-center justify-center"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save Card
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Default Deck Management */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-secondary-400">
              Default Deck Management
            </h2>
            <div className="flex space-x-2">
              {editingDefaultDeck ? (
                <>
                  <button
                    onClick={() => handleSaveDefaultDeck()}
                    className="py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save Deck
                  </button>
                  <button
                    onClick={() => {
                      setEditingDefaultDeck(false);
                      fetchDefaultDeck(); // Reset to saved deck
                    }}
                    className="py-2 px-4 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
                  >
                    <X className="mr-2 h-5 w-5" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingDefaultDeck(true)}
                  className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
                >
                  <Edit className="mr-2 h-5 w-5" />
                  Edit Default Deck
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-neutral-300">
              This is the starter deck that new players will receive when they
              create an account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-neutral-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-neutral-200 mb-2">
                Current Default Deck ({defaultDeck.length} cards)
              </h3>

              {defaultDeck.length === 0 ? (
                <p className="text-neutral-400">No cards in default deck yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {defaultDeck.map((cardId, index) => {
                    const card = cards.find((c) => c.id === cardId);
                    return (
                      <div
                        key={`${cardId}-${index}`}
                        className="bg-neutral-800 rounded-lg p-2 flex justify-between items-center"
                      >
                        <span className="text-sm text-neutral-300">
                          {card ? card.name : cardId}
                        </span>
                        {editingDefaultDeck && (
                          <button
                            onClick={() => handleRemoveFromDeck(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {editingDefaultDeck && (
              <div className="bg-neutral-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-neutral-200 mb-4">
                  Add Cards to Default Deck
                </h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  <input
                    type="text"
                    name="search"
                    value={filter.search}
                    onChange={handleFilterChange}
                    placeholder="Search cards..."
                    className="p-2 bg-neutral-800 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  />

                  <select
                    name="type"
                    value={filter.type}
                    onChange={handleFilterChange}
                    className="p-2 bg-neutral-800 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  >
                    <option value="all">All Types</option>
                    <option value="city">City</option>
                    <option value="resource">Resource</option>
                    <option value="unit">Unit</option>
                    <option value="defensive">Defensive</option>
                  </select>

                  <select
                    name="rarity"
                    value={filter.rarity}
                    onChange={handleFilterChange}
                    className="p-2 bg-neutral-800 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  >
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredCards.map((card) => {
                    const currentCount = cardCounts[card.id] || 0;
                    const maxCopies = card.count || 3;

                    return (
                      <div
                        key={card.id}
                        className="bg-neutral-800 rounded-lg p-3 flex flex-col items-center"
                      >
                        <div className="text-center mb-2">
                          <p className="font-medium text-neutral-200">
                            {card.name}
                          </p>
                          <p className="text-xs text-neutral-400 uppercase">
                            {card.type} - {card.rarity}
                          </p>
                          {currentCount > 0 && (
                            <p className="text-xs text-secondary-400 mt-1">
                              {currentCount} / {maxCopies} in deck
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAddToDeck(card.id)}
                            disabled={currentCount >= maxCopies}
                            className={`py-1 px-3 rounded-lg text-sm transition-colors ${
                              currentCount >= maxCopies
                                ? "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                                : "bg-secondary-600 hover:bg-secondary-700 text-white"
                            }`}
                          >
                            Add to Deck
                          </button>

                          <button
                            onClick={() => handlePreviewCard(card)}
                            className="py-1 px-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg text-sm transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-2xl font-semibold text-secondary-400 mb-4 md:mb-0">
              All Cards
            </h2>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search cards..."
                className="p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              />

              <select
                name="type"
                value={filter.type}
                onChange={handleFilterChange}
                className="p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              >
                <option value="all">All Types</option>
                <option value="city">City</option>
                <option value="resource">Resource</option>
                <option value="unit">Unit</option>
                <option value="defensive">Defensive</option>
              </select>

              <select
                name="rarity"
                value={filter.rarity}
                onChange={handleFilterChange}
                className="p-2 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary-500 mx-auto"></div>
              <p className="mt-4 text-neutral-300">Loading cards...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
              {cards.length === 0 ? (
                <>
                  <p className="text-neutral-400 mb-4">
                    No cards found in the database
                  </p>
                  <button
                    onClick={handleNewCard}
                    className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors inline-flex items-center"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create First Card
                  </button>
                </>
              ) : (
                <>
                  <p className="text-neutral-400 mb-4">
                    No cards match your filters
                  </p>
                  <button
                    onClick={() =>
                      setFilter({ type: "all", rarity: "all", search: "" })
                    }
                    className="py-2 px-4 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-neutral-700 rounded-lg overflow-hidden shadow-lg"
                >
                  <div className="aspect-w-3 aspect-h-2 bg-neutral-600">
                    {card.imageUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${card.imageUrl}`}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-lg">
                        {card.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs uppercase font-medium 
                        ${
                          card.rarity === "common"
                            ? "bg-neutral-600 text-neutral-300"
                            : ""
                        }
                        ${
                          card.rarity === "uncommon"
                            ? "bg-green-900/50 text-green-400"
                            : ""
                        }
                        ${
                          card.rarity === "rare"
                            ? "bg-blue-900/50 text-blue-400"
                            : ""
                        }
                        ${
                          card.rarity === "epic"
                            ? "bg-purple-900/50 text-purple-400"
                            : ""
                        }
                        ${
                          card.rarity === "legendary"
                            ? "bg-amber-900/50 text-amber-400"
                            : ""
                        }
                      `}
                      >
                        {card.rarity}
                      </span>
                    </div>

                    <div className="flex items-center mb-2">
                      <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                        {card.type}
                      </span>
                      {card.isBasic && (
                        <span className="ml-2 px-2 py-0.5 bg-secondary-500/20 text-secondary-400 rounded-full text-xs uppercase font-medium">
                          Basic
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-neutral-300 line-clamp-2 mb-3">
                      {card.effect || card.description}
                    </p>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">⚙️</span>
                        <span className="text-white font-medium">
                          {card.inGameCost?.production || 0}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreviewCard(card)}
                          className="p-2 bg-neutral-600 hover:bg-neutral-500 rounded-full transition-colors"
                          title="Preview Card"
                        >
                          <Eye className="h-4 w-4 text-neutral-200" />
                        </button>

                        <button
                          onClick={() => handleEditCard(card)}
                          className="p-2 bg-neutral-600 hover:bg-neutral-500 rounded-full transition-colors"
                          title="Edit Card"
                        >
                          <Edit className="h-4 w-4 text-neutral-200" />
                        </button>

                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-full transition-colors"
                          title="Delete Card"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Preview Modal */}
      {previewCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-secondary-400">
                  Card Preview
                </h2>
                <button
                  onClick={() => setPreviewCard(null)}
                  className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-neutral-400" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Card visualization */}
                <div className="flex-shrink-0 w-64 mx-auto md:mx-0">
                  <div className="bg-neutral-700 rounded-lg overflow-hidden shadow-lg">
                    <div className="aspect-w-3 aspect-h-2 bg-neutral-600">
                      {previewCard.imageUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${previewCard.imageUrl}`}
                          alt={previewCard.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg">
                          {previewCard.name}
                        </h3>
                      </div>

                      <div className="flex items-center mb-2">
                        <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                          {previewCard.type}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-300 mb-3">
                        {previewCard.effect || previewCard.description}
                      </p>

                      <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">⚙️</span>
                        <span className="text-white font-medium">
                          {previewCard.inGameCost?.production || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card details */}
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-neutral-200 mb-2">
                    {previewCard.name}
                  </h3>

                  <div className="flex gap-3 mb-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium capitalize 
                      ${
                        previewCard.type === "city"
                          ? "bg-blue-900/30 text-blue-400"
                          : ""
                      }
                      ${
                        previewCard.type === "resource"
                          ? "bg-yellow-900/30 text-yellow-400"
                          : ""
                      }
                      ${
                        previewCard.type === "unit"
                          ? "bg-red-900/30 text-red-400"
                          : ""
                      }
                      ${
                        previewCard.type === "defensive"
                          ? "bg-green-900/30 text-green-400"
                          : ""
                      }
                    `}
                    >
                      {previewCard.type}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium capitalize 
                      ${
                        previewCard.rarity === "common"
                          ? "bg-neutral-700 text-neutral-300"
                          : ""
                      }
                      ${
                        previewCard.rarity === "uncommon"
                          ? "bg-green-900/30 text-green-400"
                          : ""
                      }
                      ${
                        previewCard.rarity === "rare"
                          ? "bg-blue-900/30 text-blue-400"
                          : ""
                      }
                      ${
                        previewCard.rarity === "epic"
                          ? "bg-purple-900/30 text-purple-400"
                          : ""
                      }
                      ${
                        previewCard.rarity === "legendary"
                          ? "bg-amber-900/30 text-amber-400"
                          : ""
                      }
                    `}
                    >
                      {previewCard.rarity}
                    </span>
                    {previewCard.isBasic && (
                      <span className="px-3 py-1 bg-secondary-500/20 text-secondary-400 rounded-lg text-sm font-medium">
                        Basic
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-1">
                        Description
                      </h4>
                      <p className="text-neutral-200">
                        {previewCard.description || "No description"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-1">
                        Effect
                      </h4>
                      <p className="text-neutral-200">
                        {previewCard.effect || "No effect"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          In-game Production Cost
                        </h4>
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">⚙️</span>
                          <span className="text-neutral-200 font-medium">
                            {previewCard.inGameCost?.production || 0}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          In-game Gold Cost
                        </h4>
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">💰</span>
                          <span className="text-neutral-200 font-medium">
                            {previewCard.inGameCost?.gold || 0}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          Shop Cost
                        </h4>
                        <p className="text-neutral-200 font-medium">
                          {previewCard.shopCost || 0} currency
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          Maximum Copies
                        </h4>
                        <p className="text-neutral-200 font-medium">
                          {previewCard.count || 3} per deck
                        </p>
                      </div>

                      {previewCard.health > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Health
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {previewCard.health}
                          </p>
                        </div>
                      )}

                      {previewCard.attackDamage > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Attack Damage
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {previewCard.attackDamage}
                          </p>
                        </div>
                      )}

                      {previewCard.attackRange > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Attack Range
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {previewCard.attackRange}
                          </p>
                        </div>
                      )}

                      {previewCard.cityDamage > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            City Damage
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {previewCard.cityDamage}
                          </p>
                        </div>
                      )}

                      {previewCard.speed > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-neutral-400 mb-1">
                            Speed
                          </h4>
                          <p className="text-neutral-200 font-medium">
                            {previewCard.speed}
                          </p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-neutral-400 mb-1">
                          Reusable
                        </h4>
                        <p className="text-neutral-200 font-medium">
                          {previewCard.reusable ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewCard(null);
                          handleEditCard(previewCard);
                        }}
                        className="py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg font-medium transition-colors flex items-center"
                      >
                        <Edit className="mr-2 h-5 w-5" />
                        Edit Card
                      </button>

                      {editingDefaultDeck && (
                        <button
                          onClick={() => {
                            handleAddToDeck(previewCard.id);
                            setPreviewCard(null);
                          }}
                          disabled={
                            (cardCounts[previewCard.id] || 0) >=
                            (previewCard.count || 3)
                          }
                          className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center ${
                            (cardCounts[previewCard.id] || 0) >=
                            (previewCard.count || 3)
                              ? "bg-neutral-600 text-neutral-400 cursor-not-allowed"
                              : "bg-primary-600 hover:bg-primary-700 text-white"
                          }`}
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Add to Deck
                        </button>
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
