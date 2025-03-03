"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Swords,
  Users,
  Plus,
  Award,
  ChevronsRight,
  ChevronRight,
  BookOpen,
  Grid3X3,
  ShoppingCart,
} from "lucide-react";

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading: authLoading, ensureUser } = useAuth();

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    // Redirect to login if no user
    if (!user) {
      router.push("/");
      return;
    }

    // Fetch lobbies
    fetchLobbies();
  }, [authLoading, user, router]);

  const fetchLobbies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/list`
      );
      const data = await response.json();
      setLobbies(data.lobbies || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching lobbies:", err);
      setError("Failed to load lobbies. Please try again.");
      setLoading(false);
    }
  };

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    if (!newLobbyName.trim()) {
      setError("Please enter a lobby name");
      return;
    }

    try {
      // Ensure we have a valid user
      const currentUser = ensureUser();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lobbyName: newLobbyName,
            hostUserId: currentUser._id,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        router.push(`/lobby/${data.lobby._id}`);
      } else {
        setError(data.message || "Failed to create lobby");
      }
    } catch (err) {
      console.error("Error creating lobby:", err);
      setError("Failed to create lobby. Please try again.");
    }
  };

  const handleJoinLobby = (lobbyId) => {
    router.push(`/lobby/${lobbyId}`);
  };

  if (authLoading || (loading && !error)) {
    return <LoadingScreen message="Loading lobbies..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-12 gap-8">
          {/* Main game lobbies section */}
          <div className="md:col-span-7">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-secondary-400 mb-6 flex items-center">
                <Swords className="mr-3 h-8 w-8" />
                Match Lobbies
              </h2>

              {/* Create lobby form */}
              <form
                onSubmit={handleCreateLobby}
                className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-gold mb-6"
              >
                <h3 className="text-xl font-semibold text-neutral-200 mb-4">
                  Create New Match
                </h3>
                {error && (
                  <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newLobbyName}
                    onChange={(e) => setNewLobbyName(e.target.value)}
                    placeholder="Enter battle name..."
                    className="flex-grow p-3 bg-neutral-700 rounded-lg border border-neutral-600 focus:border-secondary-500 focus:outline-none text-neutral-200"
                  />
                  <button
                    type="submit"
                    className="py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all flex items-center shadow-gold hover:shadow-gold-lg"
                  >
                    <Plus className="mr-2 h-5 w-5" /> Create
                  </button>
                </div>
              </form>

              {/* Lobbies list */}
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-gold">
                <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-200 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-neutral-400" />
                    Available Matches
                  </h3>
                  <button
                    onClick={fetchLobbies}
                    className="p-2 hover:bg-neutral-700 rounded-full transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>

                {lobbies.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    <div className="flex justify-center mb-4">
                      <Swords className="h-12 w-12 text-neutral-500" />
                    </div>
                    <p className="text-lg mb-2">No active battle rooms found</p>
                    <p>Create a new battle or try refreshing the list.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-700">
                    {lobbies.map((lobby) => (
                      <div
                        key={lobby._id}
                        className="p-4 hover:bg-neutral-700/30 transition-colors flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-medium text-neutral-200">
                            {lobby.name}
                          </h4>
                          <p className="text-sm text-neutral-400">
                            {lobby.players?.length || 0} players
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinLobby(lobby._id)}
                          className="py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg transition-all flex items-center shadow-lg hover:shadow-xl"
                        >
                          Join <ChevronRight className="ml-1 h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Collection & Deck Builder Section */}
          <div className="md:col-span-5">
            <h2 className="text-3xl font-bold text-secondary-400 mb-6 flex items-center">
              <Award className="mr-3 h-8 w-8" />
              Card Collection
            </h2>

            <div className="space-y-4">
              {/* Deck Builder */}
              <div
                className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-gold hover:shadow-gold-lg transition-all cursor-pointer group"
                onClick={() => router.push("/decks")}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-3 bg-neutral-700 rounded-full">
                      <BookOpen className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-neutral-200 group-hover:text-primary-400 transition-colors">
                        Deck Builder
                      </h3>
                      <p className="text-neutral-400">
                        Create and manage your battle decks
                      </p>
                    </div>
                  </div>
                  <ChevronsRight className="w-6 h-6 text-neutral-500 group-hover:text-primary-400 transition-colors" />
                </div>
              </div>

              {/* Card Collection */}
              <div
                className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-gold hover:shadow-gold-lg transition-all cursor-pointer group"
                onClick={() => router.push("/collection")}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-3 bg-neutral-700 rounded-full">
                      <Grid3X3 className="w-6 h-6 text-secondary-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-neutral-200 group-hover:text-secondary-400 transition-colors">
                        Card Collection
                      </h3>
                      <p className="text-neutral-400">
                        Browse your owned cards and stats
                      </p>
                    </div>
                  </div>
                  <ChevronsRight className="w-6 h-6 text-neutral-500 group-hover:text-secondary-400 transition-colors" />
                </div>
              </div>

              {/* Card Shop */}
              <div
                className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-gold hover:shadow-gold-lg transition-all cursor-pointer group"
                onClick={() => router.push("/shop")}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-3 bg-neutral-700 rounded-full">
                      <ShoppingCart className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors">
                        Card Shop
                      </h3>
                      <p className="text-neutral-400">
                        Buy new cards and packs with your currency
                      </p>
                    </div>
                  </div>
                  <ChevronsRight className="w-6 h-6 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>

              {/* User Profile */}
              <div
                className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-gold hover:shadow-gold-lg transition-all cursor-pointer group"
                onClick={() => router.push("/profile")}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="p-3 bg-neutral-700 rounded-full">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-neutral-200 group-hover:text-purple-400 transition-colors">
                        User Profile
                      </h3>
                      <p className="text-neutral-400">
                        View your stats and manage account settings
                      </p>
                    </div>
                  </div>
                  <ChevronsRight className="w-6 h-6 text-neutral-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
