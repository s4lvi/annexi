"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { RefreshCw, Users, UserPlus, PlayCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

export default function LobbyPage() {
  const [lobbies, setLobbies] = useState([]);
  const [lobbyName, setLobbyName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loading, ensureUser } = useAuth();

  const fetchLobbies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/list`
      );
      const data = await res.json();
      setLobbies(data.lobbies);
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch lobbies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to login if no user is found
      router.push("/");
      return;
    }

    fetchLobbies();
    // Set up auto-refresh interval
    const interval = setInterval(fetchLobbies, 10000);
    return () => clearInterval(interval);
  }, [loading, user, router]);

  const handleCreateLobby = async (e) => {
    e.preventDefault();

    // Ensure we have a user, create guest if needed
    const currentUser = ensureUser();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostUserId: currentUser._id, lobbyName }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessage("Lobby created successfully");
        router.push(`/lobby/${data.lobby._id}`);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server");
    }
  };

  const joinLobby = (lobbyId) => {
    // Ensure we have a user before joining
    ensureUser();
    router.push(`/lobby/${lobbyId}`);
  };

  if (loading) {
    return <LoadingScreen message="Loading lobbies..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Lobbies List */}
          <div className="md:col-span-2">
            <div className="bg-neutral-800 rounded-xl shadow-gold p-6 border border-secondary-500/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-secondary-400">
                  Available Lobbies
                </h2>
                <button
                  onClick={fetchLobbies}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              <div className="space-y-4">
                {lobbies.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active lobbies found. Create one to get started!</p>
                  </div>
                ) : (
                  lobbies.map((lobby) => (
                    <div
                      key={lobby._id}
                      className="flex items-center justify-between p-4 bg-neutral-700 rounded-lg border border-neutral-600 hover:border-secondary-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-800 rounded-full">
                          <Users className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-200">
                            {lobby.name}
                          </h3>
                          <p className="text-sm text-neutral-400">
                            {lobby.players?.length || 1} player
                            {(lobby.players?.length || 1) !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinLobby(lobby._id)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-gold hover:shadow-gold-lg"
                      >
                        <PlayCircle className="w-5 h-5" />
                        <span className="hidden sm:inline">Join</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Create Lobby Form */}
          <div className="md:col-span-1">
            <div className="bg-neutral-800 rounded-xl shadow-gold p-6 border border-secondary-500/20">
              <div className="flex items-center gap-3 mb-6">
                <UserPlus className="w-6 h-6 text-secondary-400" />
                <h3 className="text-xl font-bold text-secondary-400">
                  Create New Lobby
                </h3>
              </div>

              <form onSubmit={handleCreateLobby} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Lobby Name
                  </label>
                  <input
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-neutral-900 py-3 rounded-lg font-semibold transition-colors shadow-gold hover:shadow-gold-lg"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Lobby
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
