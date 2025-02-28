// game/page.js
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import { Check } from "lucide-react";
import PhaseUI from "../../components/PhaseUi";
import { useGameState } from "../../components/gameState";
import ResourceBar from "../../components/ResourceBar";
import { useAuth } from "@/components/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { CreditCard } from "lucide-react";
import CardInventoryModal from "../../components/CardInventoryModal";
import ReadyButton from "@/components/ReadyButton";

// At the top of GameContainer.jsx (after your imports)
const TURN_STEPS = [
  "Build City",
  "Buy Cards",
  "Expand Territory",
  "Place Structures",
  "Queue Army",
  "Set Target",
  "Battle",
];

const getCurrentStepLabel = (turnStep) => {
  return TURN_STEPS[turnStep] || "";
};

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
  const {
    mapData,
    players,
    phase,
    currentPlayerId,
    currentPlayerReady,
    queueingArmy,
    placingCity,
  } = state;
  const [message, setMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(true);
  const prevLobbyIdRef = useRef(null);
  const phaseUIRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const currentUserRef = useRef(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const toggleInventory = () => {
    setInventoryOpen(!inventoryOpen);
  };

  // Auth context
  const { user, loading, ensureUser } = useAuth();

  // Get the current player for display purposes
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // Memoize this function to keep its reference stable
  const handleMapClick = useCallback((tileInfo) => {
    if (phaseUIRef.current) {
      phaseUIRef.current.handleMapClick(tileInfo);
    }
  }, []);

  // Effect 1: Basic auth and navigation check - runs on auth state change
  useEffect(() => {
    if (loading) return;

    // If no user, try to recover or redirect
    if (!user) {
      const recoveredUser = ensureUser();
      if (!recoveredUser) {
        router.push("/");
        return;
      }
    }

    // If no lobby ID, go back to lobby list
    if (!queryLobbyId) {
      router.push("/lobby");
    }
  }, [loading, user, queryLobbyId, router, ensureUser]);

  // Effect 2: Game initialization - runs once when joining a new game
  useEffect(() => {
    // Skip if still loading auth or no lobby ID
    if (loading || !queryLobbyId) return;

    // Check if joining a new game
    if (prevLobbyIdRef.current !== queryLobbyId) {
      // Reset game state for new game
      console.log("Resetting game state for new game:", queryLobbyId);
      dispatch({ type: "RESET_STATE" });
      prevLobbyIdRef.current = queryLobbyId;

      // Store current user reference (without triggering re-renders)
      const currentUser = ensureUser();
      currentUserRef.current = currentUser;

      // Set current player ID once
      console.log("Setting user in game state:", currentUser.username);
      dispatch({ type: "SET_CURRENT_PLAYER", payload: currentUser._id });

      // Load data from localStorage if available
      const storedMapData = localStorage.getItem("mapData");
      const storedPlayers = localStorage.getItem("lobbyPlayers");

      if (storedMapData && storedPlayers) {
        dispatch({ type: "SET_MAPDATA", payload: JSON.parse(storedMapData) });
        dispatch({ type: "SET_PLAYERS", payload: JSON.parse(storedPlayers) });
        setLocalLoading(false);
      } else {
        // Fetch from API if not in localStorage
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/${queryLobbyId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.lobby && data.lobby.mapData) {
              dispatch({ type: "SET_MAPDATA", payload: data.lobby.mapData });
              dispatch({
                type: "SET_PLAYERS",
                payload: data.lobby.players || [],
              });
              localStorage.setItem(
                "mapData",
                JSON.stringify(data.lobby.mapData)
              );
              localStorage.setItem(
                "lobbyPlayers",
                JSON.stringify(data.lobby.players || [])
              );
            } else {
              console.error("No map data in lobby:", data);
            }
            setLocalLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching lobby data", err);
            setLocalLoading(false);
          });
      }
    }
  }, [loading, queryLobbyId, dispatch, ensureUser]);

  // Effect 3: Socket connection - runs when currentPlayerId is set
  useEffect(() => {
    // Skip if required data isn't ready
    if (
      loading ||
      !queryLobbyId ||
      !currentPlayerId ||
      socketInitializedRef.current
    )
      return;

    // Set up socket connection (only once)
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    socketInitializedRef.current = true;

    // Get current user info for socket events
    const currentUser = currentUserRef.current || ensureUser();

    socket.emit("joinLobby", {
      lobbyId: queryLobbyId,
      username: currentUser.username,
      _id: currentPlayerId,
    });

    socket.emit("requestFullState", {
      lobbyId: queryLobbyId,
      _id: currentPlayerId,
    });

    socket.on("playerStateSync", (data) => {
      console.log("Received player state sync:", data);

      if (data.player) {
        // Show reconnection message
        if (data.message) {
          setMessage(data.message);
        }

        // Request full state update to restore all game data
        socket.emit("requestFullState", {
          lobbyId: queryLobbyId,
          _id: currentPlayerId,
        });
      }
    });

    // Socket event handlers
    socket.on("fullStateUpdate", (data) => {
      console.log("Received full state update:", data);

      if (data.mapData) {
        dispatch({ type: "SET_MAPDATA", payload: data.mapData });
      }

      if (data.players) {
        dispatch({ type: "SET_PLAYERS", payload: data.players });
      }

      if (data.phase) {
        dispatch({ type: "SET_PHASE", payload: data.phase });
      }

      if (data.cards) {
        dispatch({ type: "SET_CARDS", payload: data.cards });
      }

      // Set territories if they exist
      if (data.territories) {
        // Process territories into the format your state expects
        Object.entries(data.territories).forEach(([playerId, territories]) => {
          dispatch({
            type: "BULK_ADD_TERRITORY",
            payload: {
              claims: territories.map((t) => ({ ...t, playerId })),
            },
          });
        });
      }

      // Set cities if they exist
      if (data.cities) {
        data.cities.forEach((city) => {
          dispatch({
            type: "ADD_CITY",
            payload: city,
          });
        });
      }
    });

    socket.on("cardPurchaseSuccess", (data) => {
      console.log("Card purchase success:", data);
      // Update player resources, inventory, and the current hand in state
      dispatch({
        type: "UPDATE_CARD_PURCHASE",
        payload: {
          inventory: data.currentCards,
          hand: data.hand,
          production: data.production,
        },
      });
    });

    socket.on("gameStateUpdate", (data) => {
      console.log("Game state update received:", data);

      // Update phase if provided
      if (data.phase) {
        dispatch({ type: "SET_PHASE", payload: data.phase });
      }

      // Update players if provided
      if (data.players) {
        dispatch({ type: "SET_PLAYERS", payload: data.players });
      }

      if (data.cards) {
        dispatch({ type: "SET_CARDS", payload: data.cards });
      }

      // If this is the expand phase, ensure cityBuilt is reset
      if (data.phase === "expand") {
        console.log(
          "Game state update indicates expand phase - resetting cityBuilt flag"
        );
        dispatch({ type: "SET_CITY_BUILT", payload: false });
      }

      dispatch({ type: "SET_LAST_UPDATE", payload: Date.now() });
      // Show message if provided
      if (data.message) {
        setMessage(data.message);
      }
    });

    socket.on("lobbyUpdate", (data) => {
      // The backend now sends players with the expected format
      dispatch({ type: "SET_PLAYERS", payload: data.players });
      if (data.message) setMessage(data.message);
    });

    socket.on("phaseChange", (data) => {
      console.log("Phase change received:", data);

      // Update phase in state
      dispatch({ type: "SET_PHASE", payload: data.phase });

      // Show message if provided
      if (data.message) {
        setMessage(data.message);
      }

      // If we're entering the expand phase, reset cityBuilt
      if (data.phase === "expand") {
        console.log("Phase changed to expand - resetting cityBuilt flag");
        dispatch({ type: "SET_CITY_BUILT", payload: false });
      }
      // If entering conquer phase, reset expansion complete flag
      else if (data.phase === "conquer") {
        console.log(
          "Phase changed to conquer - setting expansionComplete to false"
        );
        dispatch({ type: "RESET_READY_STATUS" });
        dispatch({ type: "SET_EXPANSION_COMPLETE", payload: false });
      }
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

      // Update cards for the current player
      if (data.cards) {
        dispatch({
          type: "SET_CARDS",
          payload: data.cards,
        });
        // Make sure to use the correct property name for cards
        dispatch({
          type: "UPDATE_PLAYER_RESOURCES",
          payload: {
            _id: currentPlayerId,
            production: data.production,
            gold: data.gold || 0,
          },
        });
      }
    });

    socket.on("resourceUpdate", (data) => {
      console.log("Resource update received:", data);

      // Update the player's resources in the game state
      dispatch({
        type: "UPDATE_PLAYER_RESOURCES",
        payload: {
          _id: currentPlayerId,
          production: data.production,
          gold: data.gold,
        },
      });

      // Display a message about the resource update
      setMessage(
        `Resources updated: ${data.production} production, ${data.gold} gold`
      );
    });

    socket.on("cardsUpdate", (data) => {
      console.log("Cards inventory update received:", data);

      // Update the player's resources in the game state
      dispatch({
        type: "UPDATE_PLAYER_CARDS",
        payload: {
          _id: currentPlayerId,
          inventory: data.inventory,
        },
      });
      console.log("Updated player cards in state:", state.inventory);
      // Display a message about the resource update
      setMessage(`Card inventory updated`);
    });

    socket.on("resetCityBuilt", (data) => {
      console.log("City built flag reset received:", data);

      // Reset the cityBuilt flag to allow building a new city
      dispatch({ type: "SET_CITY_BUILT", payload: false });

      // Force a log of the cityBuilt state change
      console.log("cityBuilt flag reset to false");

      // Display the message
      if (data.message) {
        setMessage(data.message);
      }
    });

    socket.on("territoryUpdate", (data) => {
      console.log("Territory update received:", data);
      const { claims, currentRing, remainingInRing, remainingClaims } = data;

      if (!claims || claims.length === 0) {
        console.warn("Received empty territory update");
        return;
      }

      // Use bulk update for better performance
      dispatch({
        type: "BULK_ADD_TERRITORY",
        payload: { claims },
      });

      // Show progress with ring information
      if (remainingClaims > 0) {
        let message = `Territory expansion in progress: ${remainingClaims} tiles remaining`;

        if (currentRing !== undefined && remainingInRing !== undefined) {
          message = `Expanding ring ${currentRing} (${remainingInRing} tiles left in ring, ${remainingClaims} total)`;
        }

        setMessage(message);
      }
    });

    socket.on("handDealt", (data) => {
      console.log("Hand dealt event received:", data);
      dispatch({ type: "SET_CURRENT_HAND", payload: data.hand });
    });

    socket.on("buildStructureSuccess", (data) => {
      console.log("Defensive structure placed successfully:", data);

      // Update the game state to add the new defensive structure to the map.
      dispatch({
        type: "ADD_STRUCTURE",
        payload: {
          x: data.tile.x,
          y: data.tile.y,
          structure: data.structure, // contains details like name, effect, etc.
          playerId: data.playerId,
        },
      });
      console.log("Structure added to game state:", data.structure, state);

      // Remove the placed defensive structure card from the player's inventory.
      // Assume that data.cardId identifies the card that was played.
      dispatch({
        type: "REMOVE_CARD_FROM_INVENTORY",
        payload: data.structure.id,
      });

      setMessage("Defensive structure placed!");
    });

    socket.on("territoryExpansionComplete", (data) => {
      console.log("Territory expansion complete event received:", data);
      setMessage(
        data.message ||
          "Territory expansion complete - Place defensive structures"
      );

      // Update UI to show territory expansion is complete
      dispatch({ type: "SET_EXPANSION_COMPLETE", payload: true });
    });

    socket.on("buildCitySuccess", (data) => {
      console.log("City build succeeded:", data);
      const { username, type, level, x, y, playerId } = data;

      // Use playerId directly from the backend response
      const cityPlayerId = playerId;

      // Add city to state
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

      // If this is the current player's city
      if (cityPlayerId === currentPlayerId) {
        console.log("City built by current player:", username);
        dispatch({ type: "SET_CITY_BUILT", payload: true });
        setMessage("City built! Territory will expand in the conquer phase.");
      }
    });

    socket.on("buildCityError", (data) => {
      console.error("City build failed:", data);
      dispatch({ type: "SET_CITY_BUILT", payload: false });
      setMessage(`Failed to build city: ${data.message || "Unknown error"}`);
    });

    socket.on("cardPurchaseSuccess", (data) => {
      console.log("Card purchase success:", data);
      dispatch({
        type: "UPDATE_PLAYER_RESOURCES",
        payload: {
          _id: currentPlayerId,
          production: data.production,
          gold: data.gold,
          cards: data.currentCards,
        },
      });
    });

    // Cleanup socket connection on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        socketInitializedRef.current = false;
      }
    };
  }, [currentPlayerId, queryLobbyId, dispatch, loading, ensureUser]);

  const handleCityPlacement = (tileInfo) => {
    console.log("City placed at", tileInfo);
    socket.emit("buildCity", {
      lobbyId: queryLobbyId,
      tile: tileInfo,
      _id: currentPlayerId,
    });
  };

  const handleStructurePlacement = (tileInfo, structure) => {
    console.log("Structure placed at", tileInfo);
    socket.emit("buildStructure", {
      lobbyId: queryLobbyId,
      structure: structure,
      tile: tileInfo,
      _id: currentPlayerId,
    });
  };

  const handleCardSelected = (card) => {
    console.log("Card selected:", card);
    socket.emit("buyCard", {
      lobbyId: queryLobbyId,
      card,
      _id: currentPlayerId,
    });
  };

  const onPhaseReadyWrapper = (phaseType) => {
    console.log(`Player ready for phase: ${phaseType}`);
    socket.emit("playerReady", {
      lobbyId: queryLobbyId,
      username: currentPlayer.username,
      _id: currentPlayerId,
      phase: phaseType,
    });
    dispatch({ type: "ADVANCE_TURN_STEP" });
  };

  const handleGlobalReady = () => {
    if (!currentPlayerReady) {
      // Mark the local player as ready for the current step.
      dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });
      socket.emit("playerReady", {
        lobbyId: queryLobbyId,
        username: currentPlayer.username,
        _id: currentPlayerId,
        turnStep: turnStep, // send the current turn step to the server
      });
    }
  };

  const handleCancelPlacement = () => {
    console.log("City placement canceled");
  };

  if (loading || localLoading) {
    return <LoadingScreen message="Loading game..." />;
  }

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
        onStructurePlacement={handleStructurePlacement}
        onPhaseReady={onPhaseReadyWrapper}
      />
      <div className="absolute top-5 right-1/3 z-10">
        <button onClick={toggleInventory} className="bg-gray-900 p-2 rounded">
          <CreditCard color="white" size={24} />
        </button>
      </div>
      <CardInventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        cards={
          currentPlayer?.inventory.filter((card) => !card.hideFromInventory) ||
          []
        }
      />
      <div className="absolute top-5 bg-gray-900 rounded right-5 z-10 flex flex-row">
        <ResourceBar
          resourceValue={currentPlayer?.production || 0}
          icon={"⚙️"}
          title="production"
        />
        <ResourceBar
          resourceValue={currentPlayer?.gold || 0}
          icon={"💰"}
          title="gold"
        />
        <ResourceBar
          resourceValue={currentPlayer?.iron || 0}
          icon={"🔗"}
          title="iron"
        />
        <ResourceBar
          resourceValue={currentPlayer?.wood || 0}
          icon={"🪵"}
          title="wood"
        />
        <ResourceBar
          resourceValue={currentPlayer?.stone || 0}
          icon={"🪨"}
          title="stone"
        />
        <ResourceBar
          resourceValue={currentPlayer?.horses || 0}
          icon={"🐎"}
          title="horses"
        />
      </div>
      {/* <div className="absolute top-5 left-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
        <h2>Game Room: {queryLobbyId}</h2>
        <h3>Player: {user ? `${user.username} (${user._id})` : "Guest"}</h3>
        <h3>Phase: {phase}</h3>
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
        <button
          onClick={handleBackToLobby}
          className="mt-2 ml-2 px-4 py-2 rounded bg-green-500 text-white"
        >
          Back to Lobby
        </button>
      </div> */}
      <div className="absolute top-16 right-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
        {message && <p>{message}</p>}
      </div>
      <ReadyButton
        isReady={currentPlayerReady} // When this is true, the button shows "Waiting"
        onClick={handleGlobalReady}
        currentStep={turnStep} // Turn step index from 0 to 6
        localReady={currentPlayerReady} // Used to fill the current segment yellow
      />
    </div>
  );
}
