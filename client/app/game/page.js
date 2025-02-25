"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import { Check } from "lucide-react";
import PhaseUI from "../../components/PhaseUi";
import { useGameState } from "../../components/gameState";

// Dynamically import the PhaserGame component.
const PhaserGame = dynamic(() => import("../../components/PhaserGame"), {
  ssr: false,
});

let socket;

export default function GameContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryLobbyId = searchParams.get("lobbyId");
  const { state, dispatch } = useGameState();
  const { mapData, players, phase, currentPlayerId } = state;
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(null);
  const [user, setUser] = useState(null);
  const prevLobbyIdRef = useRef(null);

  // Get the current player for display purposes
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  const phaseUIRef = useRef(null);

  // Memoize this function to keep its reference stable
  const handleMapClick = useCallback((tileInfo) => {
    if (phaseUIRef.current) {
      phaseUIRef.current.handleMapClick(tileInfo);
    }
  }, []);

  useEffect(() => {
    // Check if we're joining a new game (different from previous)
    if (prevLobbyIdRef.current !== queryLobbyId) {
      // Reset the game state when joining a new game
      console.log("Resetting game state for new game:", queryLobbyId);
      dispatch({ type: "RESET_STATE" });
      prevLobbyIdRef.current = queryLobbyId;
    }

    // Load from localStorage if available.
    const storedMapData = localStorage.getItem("mapData");
    const storedPlayers = localStorage.getItem("lobbyPlayers");

    if (storedMapData && storedPlayers && queryLobbyId) {
      dispatch({ type: "SET_MAPDATA", payload: JSON.parse(storedMapData) });
      dispatch({ type: "SET_PLAYERS", payload: JSON.parse(storedPlayers) });
    } else if (queryLobbyId) {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/${queryLobbyId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lobby && data.lobby.mapData) {
            dispatch({ type: "SET_MAPDATA", payload: data.lobby.mapData });
            dispatch({
              type: "SET_PLAYERS",
              payload: data.lobby.players || [],
            });
            localStorage.setItem("mapData", JSON.stringify(data.lobby.mapData));
            localStorage.setItem(
              "lobbyPlayers",
              JSON.stringify(data.lobby.players || [])
            );
          } else {
            console.error("No map data in lobby:", data);
          }
        })
        .catch((err) => console.error("Error fetching lobby data", err));
    }

    // Connect to Socket.IO.
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    const userFromStorage = JSON.parse(localStorage.getItem("user"));
    setUser(userFromStorage);

    if (userFromStorage) {
      dispatch({ type: "SET_CURRENT_PLAYER", payload: userFromStorage._id });
    }

    socket.emit("joinLobby", {
      lobbyId: queryLobbyId,
      username: userFromStorage?.username,
      _id: userFromStorage?._id,
    });

    socket.on("lobbyUpdate", (data) => {
      // The backend now sends players with the expected format
      dispatch({ type: "SET_PLAYERS", payload: data.players });
      if (data.message) setMessage(data.message);
    });

    socket.on("phaseChange", (data) => {
      console.log("Phase change received:", data);
      dispatch({ type: "SET_PHASE", payload: data.phase });
      setTimer(data.phaseDuration);
    });

    socket.on("gameStarted", (data) => {
      console.log("Game started/rejoined:", data);
      if (data.mapData)
        dispatch({ type: "SET_MAPDATA", payload: data.mapData });

      if (data.players) {
        // Players are already transformed by the backend
        dispatch({ type: "SET_PLAYERS", payload: data.players });
      }

      if (data.phase) dispatch({ type: "SET_PHASE", payload: data.phase });
      if (data.phaseDuration) setTimer(data.phaseDuration);

      // Update cards for the current player
      if (data.cards && userFromStorage) {
        // Make sure to use the correct property name for cards
        dispatch({
          type: "UPDATE_PLAYER_RESOURCES",
          payload: {
            id: userFromStorage._id,
            production: data.production,
            cards: data.cards,
          },
        });
      }
    });

    socket.on("resourceUpdate", (data) => {
      console.log("Resource update received:", data);
      if (userFromStorage) {
        dispatch({
          type: "UPDATE_PLAYER_RESOURCES",
          payload: {
            id: userFromStorage._id,
            production: data.production,
            gold: data.gold,
          },
        });
      }
    });

    socket.on("territoryUpdate", (data) => {
      console.log("Territory update received:", data);
      const { claims, remainingClaims } = data;

      // Update territories for each claim
      claims.forEach((claim) => {
        dispatch({
          type: "ADD_TERRITORY",
          payload: {
            playerId: claim.playerId,
            territory: { x: claim.x, y: claim.y },
          },
        });
      });

      // Optionally show a progress indicator
      if (remainingClaims > 0) {
        setMessage(
          `Territory expansion in progress: ${remainingClaims} tiles remaining`
        );
      }
    });

    socket.on("territoryExpansionComplete", (data) => {
      console.log("Territory expansion complete:", data);
      setMessage(data.message);

      // After expansion completes, you might want to update game state
      // For example, update the phase or show card purchase UI
      if (phase === "expand" && !cityBuilt) {
        dispatch({ type: "SET_CITY_BUILT", payload: true });
      }
    });

    socket.on("buildCitySuccess", (data) => {
      console.log("City build succeeded:", data);
      const { username, type, level, x, y, playerId } = data;
      console.log("City built by player:", data);
      // Use playerId directly from the backend response
      const cityPlayerId = playerId;

      // Add city to state (regardless of who built it)
      dispatch({
        type: "ADD_CITY",
        payload: {
          x,
          y,
          type,
          level,
          playerId: cityPlayerId,
        },
      });

      // Add territory around the city
      //   const territoryRadius = 7;
      //   for (let dx = -territoryRadius; dx <= territoryRadius; dx++) {
      //     for (let dy = -territoryRadius; dy <= territoryRadius; dy++) {
      //       dispatch({
      //         type: "ADD_TERRITORY",
      //         payload: {
      //           playerId: cityPlayerId,
      //           territory: { x: x + dx, y: y + dy },
      //         },
      //       });
      //     }
      //   }

      if (cityPlayerId === userFromStorage._id) {
        console.log("City built by current player:", username);
        dispatch({ type: "SET_CITY_BUILT", payload: true });
      }
    });

    socket.on("buildCityError", (data) => {
      console.error("City build failed:", data);
      dispatch({ type: "SET_CITY_BUILT", payload: false });
    });

    socket.on("cardPurchaseSuccess", (data) => {
      console.log("Card purchase success:", data);
      if (userFromStorage) {
        dispatch({
          type: "UPDATE_PLAYER_RESOURCES",
          payload: {
            id: userFromStorage._id,
            production: data.production,
            gold: data.gold,
            cards: data.currentCards,
          },
        });
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [queryLobbyId, dispatch]);

  useEffect(() => {
    let countdownInterval;
    if (timer && timer > 0) {
      countdownInterval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1000) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [timer]);

  const handleCityPlacement = (tileInfo) => {
    console.log("City placed at", tileInfo);
    socket.emit("buildCity", {
      lobbyId: queryLobbyId,
      tile: tileInfo,
      _id: user?._id,
    });
  };

  const handleCardSelected = (card) => {
    console.log("Card selected:", card);
    socket.emit("buyCard", { lobbyId: queryLobbyId, card });
  };

  const handleCancelPlacement = () => {
    console.log("City placement canceled");
  };

  const handleReady = () => {
    const userFromStorage = JSON.parse(localStorage.getItem("user"));
    socket.emit("playerReady", {
      lobbyId: queryLobbyId,
      username: userFromStorage?.username,
      _id: userFromStorage?._id,
    });
  };

  // Additional handler to go back to lobby and reset state
  const handleBackToLobby = () => {
    // Reset state before navigating back
    dispatch({ type: "RESET_STATE" });
    router.push("/lobby");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PhaserGame
        mapData={mapData}
        matchId={queryLobbyId}
        onMapClick={handleMapClick}
      />
      <PhaseUI
        ref={phaseUIRef}
        onCityPlacement={handleCityPlacement}
        onCardSelected={handleCardSelected}
        onCancelPlacement={handleCancelPlacement}
      />
      <div className="absolute top-5 left-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
        <h2>Game Room: {queryLobbyId}</h2>
        <h3>
          Player: {user ? user.username + " (" + user._id + ")" : "Guest"}{" "}
        </h3>
        <h3>
          Phase: {phase} {timer !== null && `(${Math.floor(timer / 1000)}s)`}
        </h3>
        <hr />
        <h3>Players:</h3>
        <ul>
          {players.map((p, index) => (
            <li key={index} className="flex items-center">
              {p.username}
              {p.ready && <Check color="green" size={16} className="ml-1" />}
            </li>
          ))}
        </ul>
        <hr />
        <p>Production: {currentPlayer?.production || 0}</p>
        <button
          onClick={handleReady}
          className="mt-2 px-4 py-2 rounded bg-green-500 text-white"
        >
          Ready
        </button>
        <button
          onClick={handleBackToLobby}
          className="mt-2 ml-2 px-4 py-2 rounded bg-green-500 text-white"
        >
          Back to Lobby
        </button>
      </div>
      <div className="absolute top-5 right-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
