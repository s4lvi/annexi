"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import { Swords, Crown, Play, User } from "lucide-react";
import io from "socket.io-client";
import { useGameState } from "@/components/gameState";
import { useAuth } from "@/components/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import ColorDropdown from "@/components/ColorDropdown";
import { useSocket } from "@/components/SocketContext";

export default function LobbyRoom() {
  const router = useRouter();
  const { lobbyId } = useParams();
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [lobbyName, setLobbyName] = useState("");
  const [localLoading, setLocalLoading] = useState(true);
  const joinedRef = useRef(false);
  const prevLobbyIdRef = useRef(null);

  // Auth context
  const { user, loading, ensureUser } = useAuth();

  // Access the gameState context
  const { dispatch } = useGameState();

  const socket = useSocket();
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to login if no user is found
      router.push("/");
      return;
    }

    // Check if we're joining a new lobby (different from previous)
    if (!lobbyId) return;

    if (prevLobbyIdRef.current !== lobbyId) {
      // Reset the game state when joining a new lobby
      console.log("Resetting game state for new lobby:", lobbyId);
      dispatch({ type: "RESET_STATE" });
      prevLobbyIdRef.current = lobbyId;
    }

    if (!joinedRef.current && socket) {
      socket.emit("joinLobby", {
        lobbyId,
        username: user.username,
        _id: user._id,
      });
      joinedRef.current = true;
    }

    socket.on("lobbyUpdate", (data) => {
      setPlayers(data.players);
      setMessage(data.message);
    });

    socket.on("colorSelectionError", (data) => {
      setMessage(data.message);
    });

    socket.on("playerStateSync", (data) => {
      setMessage(data.message);
    });

    socket.on("gameStarted", (data) => {
      console.log("Game started with data:", data);
      localStorage.setItem("mapData", JSON.stringify(data.mapData));
      localStorage.setItem("lobbyPlayers", JSON.stringify(data.players));
      router.push(`/game?lobbyId=${lobbyId}`);
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("colorSelectionError");
      socket.off("playerStateSync");
      socket.off("gameStarted");
      joinedRef.current = false;
      console.log("Cleaning up lobby socket listeners");
    };
  }, [lobbyId, user, loading, router, dispatch, socket]);

  useEffect(() => {
    if (!lobbyId) return;

    setLocalLoading(true);

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.lobby && data.lobby.gameStarted) {
          router.push(`/game?lobbyId=${lobbyId}`);
        }
        console.log("Lobby data:", data);
        setLobbyName(data.lobby.name);
        setLocalLoading(false);
      })
      .catch((err) => {
        console.error("Error checking lobby state", err);
        setMessage("Error checking lobby state");
        setLocalLoading(false);
      });
  }, [lobbyId, router]);

  const handleColorSelect = (colorValue) => {
    if (!socket || !user) return;
    socket.emit("selectColor", {
      lobbyId,
      _id: user._id,
      colorValue,
    });
  };

  const getTakenColors = () => {
    return players.map((player) => player.color?.value).filter(Boolean);
  };

  const handleStartGame = async () => {
    try {
      // Ensure we have a valid user
      const currentUser = ensureUser();

      // Reset the game state before starting a new game (defensive measure)
      dispatch({ type: "RESET_STATE" });

      const playerIds = players.map((p) => p._id).filter(Boolean);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/match/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lobbyId,
            hostUserId: currentUser._id,
            players: playerIds,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        socket.emit("startGame", {
          lobbyId,
          matchId: data.match._id,
          mapData: data.mapData,
        });
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error starting game");
    }
  };

  // Check if current user is host
  const isHost =
    user && players.length > 0 && players[0].username === user.username;

  if (loading || localLoading) {
    return <LoadingScreen message="Entering lobby..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-neutral-800 rounded-xl shadow-gold p-6 border border-secondary-500/20">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-neutral-700 rounded-full">
                <Swords className="w-8 h-8 text-secondary-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-secondary-400">
                  Battle Room: {lobbyName}
                </h2>
                <p className="text-neutral-400 mt-1">
                  Waiting for players to join...
                </p>
              </div>
            </div>

            {message && (
              <div className="bg-primary-900/20 border border-primary-500 text-primary-400 px-4 py-3 rounded-lg mb-6">
                {message}
              </div>
            )}

            <div className="space-y-3 mb-8">
              <div className="text-sm font-medium text-neutral-400 mb-2">
                Players ({players.length}/4)
              </div>
              {players.map((player, index) => (
                <div
                  key={player.socketId || player._id}
                  className="flex items-center justify-between p-4 bg-neutral-700 rounded-lg border border-neutral-600 transition-colors hover:border-secondary-500/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-800 rounded-full">
                      {index === 0 ? (
                        <Crown className="w-5 h-5 text-secondary-400" />
                      ) : (
                        <User className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-neutral-200">
                        {player.username}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 text-xs bg-secondary-500/20 text-secondary-400 px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Add Color Dropdown */}
                    <ColorDropdown
                      selectedColor={player.color?.value}
                      onColorSelect={handleColorSelect}
                      takenColors={getTakenColors()}
                      isCurrentUser={user && player._id === user._id}
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-neutral-400">Ready</span>
                    </div>
                  </div>
                </div>
              ))}

              {Array.from({ length: Math.max(0, 4 - players.length) }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center p-4 bg-neutral-700/50 rounded-lg border border-dashed border-neutral-600"
                  >
                    <span className="text-neutral-500">
                      Waiting for player...
                    </span>
                  </div>
                )
              )}
            </div>

            {isHost ? (
              <button
                onClick={handleStartGame}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-lg font-semibold transition-all shadow-gold hover:shadow-gold-lg"
              >
                <Play className="w-5 h-5" />
                Start Battle
              </button>
            ) : (
              <div className="text-center text-neutral-400 py-4 bg-neutral-700/50 rounded-lg">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
