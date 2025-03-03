"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import TurnUI from "@/components/TurnUI";
import { useGameState } from "../../components/gameState";
import ResourceBar from "../../components/ResourceBar";
import { useAuth } from "@/components/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { CreditCard } from "lucide-react";
import CardInventoryModal from "../../components/CardInventoryModal";
import ReadyButton from "@/components/ReadyButton";
import { useSocket } from "@/components/SocketContext";

// Optional: for labeling steps in the ready button.
const TURN_STEPS = [
  "Build City",
  "Buy Cards",
  "Expand Territory",
  "Place Structures",
  "Queue Army",
  "Set Target",
  "Battle",
];

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
  const { mapData, players, currentPlayerId, currentPlayerReady, turnStep } =
    state;
  const [message, setMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(true);
  const prevLobbyIdRef = useRef(null);
  const turnUIRef = useRef(null);
  const socketInitializedRef = useRef(false);
  const currentUserRef = useRef(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const phaserGameRef = useRef(null);
  const socket = useSocket();
  const toggleUiVisibility = (visible) => {
    console.log("Toggling UI visibility to:", visible);
    setUiVisible(visible);
  };

  const toggleInventory = () => {
    setInventoryOpen((prev) => !prev);
  };

  const { user, loading, ensureUser } = useAuth();
  const currentPlayer = players.find((p) => p._id === currentPlayerId);

  // Forward map clicks to the TurnUI
  const handleMapClick = useCallback((tileInfo) => {
    if (turnUIRef.current) {
      turnUIRef.current.handleMapClick(tileInfo);
    }
  }, []);

  // Basic auth and navigation check
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const recoveredUser = ensureUser();
      if (!recoveredUser) {
        router.push("/");
        return;
      }
    }
    if (!queryLobbyId) router.push("/lobby");
  }, [loading, user, queryLobbyId, router, ensureUser]);

  // Game initialization on lobby change
  useEffect(() => {
    if (loading || !queryLobbyId) return;
    if (prevLobbyIdRef.current !== queryLobbyId) {
      console.log("Resetting game state for new game:", queryLobbyId);
      dispatch({ type: "RESET_STATE" });
      prevLobbyIdRef.current = queryLobbyId;
      const currentUser = ensureUser();
      currentUserRef.current = currentUser;
      console.log("Setting user in game state:", currentUser.username);
      dispatch({ type: "SET_CURRENT_PLAYER", payload: currentUser._id });

      const storedMapData = localStorage.getItem("mapData");
      const storedPlayers = localStorage.getItem("lobbyPlayers");

      if (storedMapData && storedPlayers) {
        dispatch({ type: "SET_MAPDATA", payload: JSON.parse(storedMapData) });
        dispatch({ type: "SET_PLAYERS", payload: JSON.parse(storedPlayers) });
        setLocalLoading(false);
      } else {
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

  // Socket connection (phaseChange events removed)
  useEffect(() => {
    if (
      loading ||
      !queryLobbyId ||
      !currentPlayerId ||
      socketInitializedRef.current
    )
      return;
    console.log("Initializing socket connection for lobby:", queryLobbyId);
    //socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    socketInitializedRef.current = true;
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
      if (data.player) {
        if (data.message) setMessage(data.message);
        socket.emit("requestFullState", {
          lobbyId: queryLobbyId,
          _id: currentPlayerId,
        });
      }
    });

    socket.on("handDealt", (data) => {
      dispatch({
        type: "UPDATE_CARD_PURCHASE",
        payload: {
          hand: data.hand,
        },
      });
    });
    socket.on("updateCards", (data) => {
      console.log("Received card update:", data);
      dispatch({
        type: "UPDATE_CARD_PURCHASE",
        payload: {
          inventory: data.inventory,
        },
      });
    });

    socket.on("fullStateUpdate", (data) => {
      console.log("Received full state update:", data);
      if (data.mapData)
        dispatch({ type: "SET_MAPDATA", payload: data.mapData });
      if (data.players)
        dispatch({ type: "SET_PLAYERS", payload: data.players });
      if (data.cards) dispatch({ type: "SET_CARDS", payload: data.cards });
      if (data.territories) {
        Object.entries(data.territories).forEach(([playerId, territories]) => {
          dispatch({
            type: "BULK_ADD_TERRITORY",
            payload: { claims: territories.map((t) => ({ ...t, playerId })) },
          });
        });
      }
      if (data.cities) {
        data.cities.forEach((city) => {
          dispatch({ type: "ADD_CITY", payload: city });
        });
      }
      if (data.message) setMessage(data.message);
    });

    socket.on("cardPurchaseSuccess", (data) => {
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
      if (data.mapData)
        dispatch({ type: "SET_MAPDATA", payload: data.mapData });
      if (data.players)
        dispatch({ type: "SET_PLAYERS", payload: data.players });
      if (data.cards) dispatch({ type: "SET_CARDS", payload: data.cards });

      // Add this line to update the turn step when server sends it
      if (data.turnStep !== undefined) {
        console.log(`Updating turn step to ${data.turnStep}`);
        dispatch({ type: "SET_TURN_STEP", payload: data.turnStep });

        // Also ensure player isn't marked as ready for the new step
        dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: false });
      }

      // Reset cityBuilt state when a new turn starts (turnStep = 0)
      if (data.turnStep === 0) {
        console.log("New turn started, resetting city built state");
        dispatch({ type: "SET_CITY_BUILT", payload: false });
        dispatch({ type: "SET_EXPANSION_COMPLETE", payload: false });
        dispatch({ type: "SET_PLACING_CITY", payload: false });
        dispatch({ type: "SET_PLACING_STRUCTURE", payload: false });
        dispatch({ type: "SET_SELECTED_STRUCTURE", payload: null });
        dispatch({ type: "SET_SOURCE_CITY", payload: null });
        dispatch({ type: "SET_TARGET_CITY", payload: null });
        dispatch({ type: "SET_ATTACK_PATH", payload: [] });
        dispatch({
          type: "SET_BATTLE_STATE",
          payload: {
            battleUnits: [], // Each battle unit is an object as described above.
          },
        });
      }

      dispatch({ type: "SET_LAST_UPDATE", payload: Date.now() });
      if (data.message) setMessage(data.message);
    });

    socket.on("stepCompleted", (data) => {
      dispatch({ type: "SET_TURN_STEP", payload: data.turnStep });
      dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: false });
    });

    socket.on("lobbyUpdate", (data) => {
      dispatch({ type: "SET_PLAYERS", payload: data.players });
      if (data.message) setMessage(data.message);
    });

    socket.on("resourceUpdate", (data) => {
      dispatch({
        type: "UPDATE_PLAYER_RESOURCES",
        payload: {
          _id: currentPlayerId,
          production: data.production,
          gold: data.gold,
        },
      });
      setMessage(
        `Resources updated: ${data.production} production, ${data.gold} gold`
      );
    });

    socket.on("cardsUpdate", (data) => {
      dispatch({
        type: "UPDATE_PLAYER_CARDS",
        payload: { _id: currentPlayerId, inventory: data.inventory },
      });
      setMessage(`Card inventory updated`);
    });

    socket.on("resetCityBuilt", (data) => {
      dispatch({ type: "SET_CITY_BUILT", payload: false });
      if (data.message) setMessage(data.message);
    });

    socket.on("territoryUpdate", (data) => {
      const { claims, currentRing, remainingInRing, remainingClaims } = data;
      if (!claims || claims.length === 0) return;
      dispatch({ type: "BULK_ADD_TERRITORY", payload: { claims } });
      if (remainingClaims > 0) {
        let msg = `Expanding ring ${currentRing} (${remainingInRing} left, ${remainingClaims} total)`;
        setMessage(msg);
      }
    });

    socket.on("buildStructureSuccess", (data) => {
      dispatch({
        type: "ADD_STRUCTURE",
        payload: {
          x: data.tile.x,
          y: data.tile.y,
          structure: data.structure,
          playerId: data.playerId,
        },
      });
      dispatch({
        type: "REMOVE_CARD_FROM_INVENTORY",
        payload: data.structure.id,
      });
      setMessage("Defensive structure placed!");
    });

    socket.on("territoryExpansionComplete", (data) => {
      setMessage(
        data.message ||
          "Territory expansion complete - Place defensive structures"
      );
      dispatch({ type: "SET_EXPANSION_COMPLETE", payload: true });

      socket.emit("playerReady", {
        lobbyId: queryLobbyId,
        username: currentPlayer.username,
        _id: currentPlayerId,
      });
    });

    socket.on("buildCitySuccess", (data) => {
      console.log("Build city success:", data);
      dispatch({
        type: "ADD_CITY",
        payload: {
          x: data.x,
          y: data.y,
          type: data.type,
          level: data.level,
          playerId: data.playerId,
        },
      });
      if (data.playerId === currentPlayerId) {
        dispatch({ type: "SET_CITY_BUILT", payload: true });
        console.log("City built by current player:", currentPlayerId);
        setMessage("City built! Proceed to buying cards.");

        socket.emit("playerReady", {
          lobbyId: queryLobbyId,
          username: currentPlayer.username,
          _id: currentPlayerId,
        });
      }
    });

    socket.on("buildCityError", (data) => {
      dispatch({ type: "SET_CITY_BUILT", payload: false });
      setMessage(`Failed to build city: ${data.message || "Unknown error"}`);
    });

    socket.on("cardPurchaseSuccess", (data) => {
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

    socket.on("pathCalculated", (data) => {
      console.log("Received path:", data.path);
      // Save the path to your game state
      dispatch({ type: "SET_ATTACK_PATH", payload: data.path });
    });

    socket.on("battleUpdate", (data) => {
      console.log("Battle update received:", data);
      // Update global battle units.
      dispatch({ type: "UPDATE_BATTLE_UNITS", payload: data.battleUnits });
    });

    socket.on("towerFired", (data) => {
      console.log("Tower fired:", data);
      // Optionally, update global state or show a visual effect.
    });

    socket.on("unitAttackedStructure", (data) => {
      console.log("Unit attacked structure:", data);
      // Optionally, update state or trigger animations.
    });

    socket.on("battleResult", (data) => {
      console.log("Battle result received:", data);
      setMessage(data.message);
      // Optionally, update player's resources or mark them ready.
    });

    socket.on("battleFinished", (data) => {
      console.log("Battle finished event received:", data);
      setMessage(data.message);
      // Update game state to indicate battle processing is done.
      dispatch({ type: "SET_BATTLE_FINISHED", payload: true });
    });

    return () => {
      if (socket) {
        console.log("Disconnecting socket for lobby:", queryLobbyId);
        socket.disconnect();
        socketInitializedRef.current = false;
      }
    };
  }, [currentPlayerId, queryLobbyId, loading]);

  // In GameContainer.jsx
  useEffect(() => {
    if (state.battleState.battleRendered) {
      console.log("Battle rendered; emitting playerReady");
      socket.emit("playerReady", {
        lobbyId: queryLobbyId,
        username: currentPlayer.username,
        _id: currentPlayerId,
      });
      // Optionally, reset battle state so it doesn't fire again.
      dispatch({ type: "RESET_BATTLE_STATE" });
    }
  }, [
    state.battleState.battleRendered,
    queryLobbyId,
    currentPlayer,
    currentPlayerId,
    socket,
    dispatch,
  ]);

  const handleCityPlacement = (tileInfo) => {
    socket.emit("buildCity", {
      lobbyId: queryLobbyId,
      tile: tileInfo,
      _id: currentPlayerId,
    });
  };

  const handleStructurePlacement = (tileInfo, structure) => {
    socket.emit("buildStructure", {
      lobbyId: queryLobbyId,
      structure,
      tile: tileInfo,
      _id: currentPlayerId,
    });
  };

  const handleCardSelected = (card) => {
    socket.emit("buyCard", {
      lobbyId: queryLobbyId,
      card,
      _id: currentPlayerId,
    });
  };

  const handleGlobalReady = () => {
    if (!currentPlayerReady) {
      dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });
      socket.emit("playerReady", {
        lobbyId: queryLobbyId,
        username: currentPlayer.username,
        _id: currentPlayerId,
      });
    }
  };

  const handleArmyQueued = (queuedCards) => {
    socket.emit("queueArmy", {
      lobbyId: queryLobbyId,
      _id: currentPlayerId,
      selectedCards: queuedCards,
    });
    dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });
    socket.emit("playerReady", {
      lobbyId: queryLobbyId,
      username: currentPlayer.username,
      _id: currentPlayerId,
    });
  };

  const handleTargetSelected = ({ sourceCity, targetCity }) => {
    socket.emit("selectTarget", {
      lobbyId: queryLobbyId,
      sourceCity,
      targetCity,
      _id: currentPlayerId,
    });
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
        toggleUiVisibility={toggleUiVisibility}
        socket={socket}
      />
      <div
        style={{
          visibility: uiVisible ? "visible" : "hidden",
          opacity: uiVisible ? 1 : 0,
          transition: "opacity 300ms ease-in-out",
          pointerEvents: uiVisible ? "auto" : "none",
        }}
      >
        <TurnUI
          ref={turnUIRef}
          onCityPlacement={handleCityPlacement}
          onCardSelected={handleCardSelected}
          onStructurePlacement={handleStructurePlacement}
          onTargetSelected={handleTargetSelected}
          uiVisible={uiVisible}
          onArmyQueued={handleArmyQueued}
        />
      </div>
      <CardInventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        cards={
          currentPlayer?.inventory.filter((card) => !card.hideFromInventory) ||
          []
        }
      />
      <div className="mobile-scale-resources">
        <div className="absolute top-5 right-1/2 z-10">
          <button onClick={toggleInventory} className="bg-gray-900 p-2 rounded">
            <CreditCard color="white" size={24} />
          </button>
        </div>
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
        <div className="absolute top-16 right-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
          {message && <p>{message}</p>}
        </div>
      </div>

      <ReadyButton
        isReady={currentPlayerReady}
        onClick={handleGlobalReady}
        currentStep={turnStep}
        localReady={currentPlayerReady}
      />
    </div>
  );
}
