"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useCardCollection } from "@/components/CardCollectionContext";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import CollectionCard from "@/components/CollectionCard";
import {
  User,
  ChevronLeft,
  Trophy,
  BarChart2,
  Clock,
  Calendar,
  CreditCard,
  Grid3X3,
  Save,
  BookOpen,
  CheckCircle,
  Zap,
  ShieldCheck,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, updateProfile } = useAuth();
  const { cards, decks, loading: cardsLoading } = useCardCollection();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("stats");

  // Favorite cards
  const [favoriteCards, setFavoriteCards] = useState([]);

  // Load profile and stats when component mounts
  useEffect(() => {
    if (!authLoading && user) {
      loadProfileData();
    }
  }, [authLoading, user]);

  // Set form values when profile is loaded
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  // Load favorite cards when stats and cards are loaded
  useEffect(() => {
    if (stats && stats.favoriteCards && cards.length > 0) {
      const favorites = stats.favoriteCards
        .map((cardId) => cards.find((card) => card.id === cardId))
        .filter(Boolean);
      setFavoriteCards(favorites);
    }
  }, [stats, cards]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Load profile data from API
  const loadProfileData = async () => {
    try {
      setLoadingProfile(true);
      setProfileError(null);

      // Load profile
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/profile/${user._id}`
      );
      const data = await response.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setStats(data.profile.stats || {});
      } else {
        setProfileError("Failed to load profile data");
      }

      setLoadingProfile(false);
    } catch (error) {
      console.error("Error loading profile data:", error);
      setProfileError(error.message || "Failed to load profile data");
      setLoadingProfile(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // Reset states
    setSaveError(null);
    setSaveSuccess(false);

    // Validate passwords match if changing password
    if (password && password !== confirmPassword) {
      setSaveError("Passwords do not match");
      return;
    }

    try {
      setSavingProfile(true);

      // Prepare updated profile data
      const profileData = {
        username,
        email,
      };

      // Only include password if it's being changed
      if (password) {
        profileData.password = password;
      }

      // Call API to update profile
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/profile/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profileData),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update local user data
        updateProfile(data.profile);

        // Show success message
        setSaveSuccess(true);

        // Reload profile data
        await loadProfileData();

        // Clear password fields
        setPassword("");
        setConfirmPassword("");

        // Exit edit mode
        setIsEditing(false);
      } else {
        setSaveError(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveError(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Reset form values
    setUsername(profile?.username || "");
    setEmail(profile?.email || "");
    setPassword("");
    setConfirmPassword("");

    // Exit edit mode
    setIsEditing(false);
    setSaveError(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time duration
  const formatDuration = (seconds) => {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (authLoading || loadingProfile) {
    return <LoadingScreen message="Loading profile..." />;
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
            <h1 className="text-3xl font-bold text-purple-400 flex items-center">
              <User className="mr-3 h-8 w-8" />
              User Profile
            </h1>
          </div>
        </div>

        {profileError && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {profileError}
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
            Profile updated successfully!
          </div>
        )}

        {/* Profile Overview & Account Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Profile Summary */}
          <div className="lg:col-span-4">
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-neutral-700">
                <div className="flex items-center gap-4">
                  <div className="p-5 bg-purple-500/20 rounded-full">
                    <User className="h-10 w-10 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-200">
                      {profile?.username}
                    </h2>
                    <p className="text-neutral-400">{profile?.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Joined</p>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-purple-400 mr-2" />
                      <p className="text-neutral-200">
                        {formatDate(profile?.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Last Match</p>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-purple-400 mr-2" />
                      <p className="text-neutral-200">
                        {formatDate(stats?.lastPlayed)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Currency</p>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-amber-400 mr-2" />
                      <p className="text-amber-400 font-bold">
                        {profile?.currency || 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Collection</p>
                    <div className="flex items-center">
                      <Grid3X3 className="h-4 w-4 text-green-400 mr-2" />
                      <p className="text-neutral-200">
                        {profile?.totalCards || 0} cards
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings / Edit Profile */}
          <div className="lg:col-span-8">
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden h-full">
              <div className="p-6 border-b border-neutral-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-neutral-200">
                  Account Settings
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="p-6">
                {isEditing ? (
                  <form onSubmit={handleSaveProfile}>
                    {saveError && (
                      <div className="mb-4 p-3 bg-red-900/20 border border-red-500 text-red-400 rounded-lg">
                        {saveError}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-neutral-400 text-sm font-medium mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-purple-500 focus:outline-none text-neutral-200"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-neutral-400 text-sm font-medium mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-purple-500 focus:outline-none text-neutral-200"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-neutral-400 text-sm font-medium mb-2">
                        New Password (leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-purple-500 focus:outline-none text-neutral-200"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-neutral-400 text-sm font-medium mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-purple-500 focus:outline-none text-neutral-200"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {savingProfile ? (
                          <>
                            <span className="animate-pulse mr-2">●</span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-neutral-400 mb-1">
                          Username
                        </p>
                        <p className="text-lg text-neutral-200 font-medium">
                          {profile?.username}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-neutral-400 mb-1">Email</p>
                        <p className="text-lg text-neutral-200">
                          {profile?.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-neutral-400 mb-1">
                        Account Type
                      </p>
                      <p className="text-lg text-neutral-200">
                        {profile?.isGuest ? "Guest Account" : "Registered User"}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-neutral-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-neutral-400">Security Settings</p>
                          <p className="text-neutral-200 mt-1">
                            Change your password
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                        >
                          Change Password
                        </button>
                      </div>
                    </div>

                    {user && !user.isGuest && (
                      <div className="pt-4 border-t border-neutral-700">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-red-400">Logout</p>
                            <p className="text-neutral-400 mt-1">
                              Sign out of your account
                            </p>
                          </div>
                          <button
                            onClick={logout}
                            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Stats, Collection, and Decks */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-lg overflow-hidden">
          <div className="flex border-b border-neutral-700">
            <button
              className={`py-4 px-6 font-medium transition-colors ${
                activeTab === "stats"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              onClick={() => setActiveTab("stats")}
            >
              Game Statistics
            </button>
            <button
              className={`py-4 px-6 font-medium transition-colors ${
                activeTab === "collection"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              onClick={() => setActiveTab("collection")}
            >
              Card Collection
            </button>
            <button
              className={`py-4 px-6 font-medium transition-colors ${
                activeTab === "decks"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              onClick={() => setActiveTab("decks")}
            >
              Decks
            </button>
          </div>

          <div className="p-6">
            {/* Stats Tab */}
            {activeTab === "stats" && (
              <div>
                <h3 className="text-xl font-bold text-neutral-200 mb-6 flex items-center">
                  <BarChart2 className="mr-2 h-6 w-6 text-purple-400" />
                  Battle Statistics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-neutral-700 rounded-lg p-6">
                    <p className="text-neutral-400 text-sm mb-1">
                      Matches Played
                    </p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-neutral-100">
                        {stats?.matchesPlayed || 0}
                      </p>
                      <Trophy className="h-6 w-6 text-amber-400" />
                    </div>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-6">
                    <p className="text-neutral-400 text-sm mb-1">Wins</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-green-400">
                        {stats?.wins || 0}
                      </p>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-6">
                    <p className="text-neutral-400 text-sm mb-1">Losses</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-red-400">
                        {stats?.losses || 0}
                      </p>
                      <Zap className="h-6 w-6 text-red-400" />
                    </div>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-6">
                    <p className="text-neutral-400 text-sm mb-1">Win Rate</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-bold text-blue-400">
                        {stats?.winRate || 0}%
                      </p>
                      <ShieldCheck className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Favorite Cards */}
                {favoriteCards.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-neutral-200 mb-6">
                      Most Used Cards
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {favoriteCards.map((card) => (
                        <CollectionCard key={card.id} card={card} />
                      ))}
                    </div>
                  </div>
                )}

                {(!stats || stats.matchesPlayed === 0) && (
                  <div className="py-8 text-center text-neutral-400 border-2 border-dashed border-neutral-700 rounded-lg">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
                    <p className="text-lg mb-2">No match statistics yet</p>
                    <p>Play some games to build your stats!</p>
                  </div>
                )}
              </div>
            )}

            {/* Collection Tab */}
            {activeTab === "collection" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-neutral-200 flex items-center">
                    <Grid3X3 className="mr-2 h-6 w-6 text-purple-400" />
                    Card Collection Overview
                  </h3>

                  <button
                    onClick={() => router.push("/collection")}
                    className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    View Full Collection
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
                  <div className="bg-neutral-700 rounded-lg p-4 text-center">
                    <p className="text-neutral-400 text-sm mb-1">Total Cards</p>
                    <p className="text-2xl font-bold text-neutral-100">
                      {cards.filter((card) => card.ownedCount > 0).length} /{" "}
                      {cards.length}
                    </p>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-4 text-center">
                    <p className="text-neutral-400 text-sm mb-1">Common</p>
                    <p className="text-2xl font-bold text-gray-300">
                      {
                        cards.filter(
                          (card) =>
                            card.rarity === "common" && card.ownedCount > 0
                        ).length
                      }
                    </p>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-4 text-center">
                    <p className="text-neutral-400 text-sm mb-1">Uncommon</p>
                    <p className="text-2xl font-bold text-green-400">
                      {
                        cards.filter(
                          (card) =>
                            card.rarity === "uncommon" && card.ownedCount > 0
                        ).length
                      }
                    </p>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-4 text-center">
                    <p className="text-neutral-400 text-sm mb-1">Rare</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {
                        cards.filter(
                          (card) =>
                            card.rarity === "rare" && card.ownedCount > 0
                        ).length
                      }
                    </p>
                  </div>

                  <div className="bg-neutral-700 rounded-lg p-4 text-center">
                    <p className="text-neutral-400 text-sm mb-1">Epic+</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {
                        cards.filter(
                          (card) =>
                            (card.rarity === "epic" ||
                              card.rarity === "legendary") &&
                            card.ownedCount > 0
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {/* Recently Acquired Cards */}
                <div>
                  <h3 className="text-xl font-bold text-neutral-200 mb-6">
                    Recently Acquired Cards
                  </h3>

                  {cards.filter((card) => card.ownedCount > 0).length === 0 ? (
                    <div className="py-8 text-center text-neutral-400 border-2 border-dashed border-neutral-700 rounded-lg">
                      <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
                      <p className="text-lg mb-2">Your collection is empty</p>
                      <p>Visit the shop to acquire new cards!</p>
                      <button
                        onClick={() => router.push("/shop")}
                        className="mt-4 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                      >
                        Go to Shop
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {cards
                        .filter((card) => card.ownedCount > 0)
                        .sort((a, b) => {
                          // Sort by rarity first
                          const rarityOrder = {
                            legendary: 5,
                            epic: 4,
                            rare: 3,
                            uncommon: 2,
                            common: 1,
                          };
                          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                        })
                        .slice(0, 5)
                        .map((card) => (
                          <CollectionCard key={card.id} card={card} />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decks Tab */}
            {activeTab === "decks" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-neutral-200 flex items-center">
                    <BookOpen className="mr-2 h-6 w-6 text-purple-400" />
                    Your Decks
                  </h3>

                  <button
                    onClick={() => router.push("/decks")}
                    className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Deck Builder
                  </button>
                </div>

                {decks.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 border-2 border-dashed border-neutral-700 rounded-lg">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
                    <p className="text-lg mb-2">
                      You haven't created any decks yet
                    </p>
                    <p>Go to the Deck Builder to create your first deck!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => (
                      <div
                        key={deck._id}
                        className="bg-neutral-700 rounded-lg p-6 hover:border hover:border-purple-500 transition-all cursor-pointer"
                        onClick={() => router.push("/decks")}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-lg font-bold text-neutral-200">
                            {deck.name}
                          </h4>
                          {deck.isDefault && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="text-neutral-400 text-sm mb-3">
                          {deck.description || "No description"}
                        </p>

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-neutral-300">
                            {deck.cards.length} cards
                          </span>
                          <span className="text-neutral-300">
                            {deck.updatedAt
                              ? `Updated ${formatDate(deck.updatedAt)}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
