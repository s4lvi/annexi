"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import { Check } from "lucide-react";
import PhaseUI from "../../components/PhaseUi";
import gameState from "../../components/gameState";

// Dynamically import the PhaserGame component
const PhaserGame = dynamic(() => import("../../components/PhaserGame"), {
  ssr: false,
});

let socket;

export default function GameContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryLobbyId = searchParams.get("lobbyId");
  const [mapData, setMapData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [lobbyId, setLobbyId] = useState(queryLobbyId);
  const [phase, setPhase] = useState("expand");
  const [message, setMessage] = useState("");
  const [resourcesData, setResourcesData] = useState(null);
  const [timer, setTimer] = useState(null);
  const [user, setUser] = useState(null);
  const [cityBuilt, setCityBuilt] = useState(false); // New state for whether the city was successfully built

  // Create a ref to access PhaseUI's handleMapClick
  const phaseUIRef = useRef(null);

  useEffect(() => {
    // Try to load data from localStorage
    const storedMapData = localStorage.getItem("mapData");
    const storedPlayers = localStorage.getItem("lobbyPlayers");

    if (storedMapData && storedPlayers && queryLobbyId) {
      const parsedMapData = JSON.parse(storedMapData);
      setMapData(parsedMapData);
      setPlayers(JSON.parse(storedPlayers));
      setLobbyId(queryLobbyId);
    } else if (queryLobbyId) {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}api/lobby/${queryLobbyId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lobby && data.lobby.mapData) {
            setMapData(data.lobby.mapData);
            setPlayers(data.lobby.players || []);
            setLobbyId(queryLobbyId);
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

    // Connect to Socket.IO for real-time updates
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    const user = JSON.parse(localStorage.getItem("user"));
    setUser(user);
    socket.emit("joinLobby", {
      lobbyId: lobbyId || queryLobbyId,
      username: user?.username,
      _id: user?._id,
    });

    socket.on("lobbyUpdate", (data) => {
      setPlayers(data.players);
      if (data.message) {
        setMessage(data.message);
      }
    });

    socket.on("phaseChange", (data) => {
      console.log("Phase change received:", data);
      setPhase(data.phase);
      setTimer(data.phaseDuration);
      gameState.setPhase(data.phase);
    });

    // When the game starts or re-joins mid-phase, update game state & available cards.
    socket.on("gameStarted", (data) => {
      console.log("Game started/rejoined:", data);
      if (data.mapData) {
        setMapData(data.mapData);
      }
      if (data.players) {
        setPlayers(data.players);
      }
      if (data.phase) {
        setPhase(data.phase);
        gameState.setPhase(data.phase);
      }
      if (data.phaseDuration) {
        setTimer(data.phaseDuration);
      }
      if (data.cards) {
        // Update local state and global gameState with the grouped card data.
        setResourcesData({
          ...data.cards,
          production: data.production, // assume backend sends player's current production
        });
        gameState.setResources({
          production: data.production,
          cards: data.cards,
        });
      }
    });

    // Listen for resource updates.
    socket.on("resourceUpdate", (data) => {
      console.log(resourcesData);
      setResourcesData((prev) => ({
        ...prev,
        production: data.production,
      }));
      gameState.setResources((prev) => ({
        ...prev,
        production: data.production,
      }));
    });

    socket.on("buildCitySuccess", (data) => {
      console.log("City build succeeded:", data);
      const { type, level, x, y } = data;
      setMapData((prevMap) => {
        if (!prevMap) return prevMap;
        const newMap = prevMap.map((row) =>
          row.map((tile) => {
            // Match tile based on x and y coordinates.
            if (tile.x === x && tile.y === y) {
              // Add a city property to the tile.
              return { ...tile, city: { type, level, x, y } };
            }
            return tile;
          })
        );
        return newMap;
      });
      setCityBuilt(true);
    });

    socket.on("buildCityError", (data) => {
      console.error("City build failed:", data);
      // Reset the city build flag so the UI goes back to the base city card stage.
      setCityBuilt(false);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [queryLobbyId, lobbyId]);

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

  // Called by PhaseUI when a valid city placement is made.
  const handleCityPlacement = (tileInfo) => {
    console.log("City placed at", tileInfo);
    // Emit buildCity request; waiting for server response to update UI.
    socket.emit("buildCity", { lobbyId, tile: tileInfo, _id: user?._id });
  };

  const handleCardSelected = (card) => {
    console.log("Card selected:", card);
    socket.emit("buyCard", { lobbyId, card });
  };

  const handleCancelPlacement = () => {
    console.log("City placement canceled");
  };

  // This onMapClick is passed to PhaserGame. It will forward tile clicks from ControlsManager.
  const handleMapClick = (tileInfo) => {
    if (phaseUIRef.current) {
      phaseUIRef.current.handleMapClick(tileInfo);
    }
  };

  const handleReady = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("Emitting playerReady with lobbyId:", lobbyId || queryLobbyId);
    socket.emit("playerReady", {
      lobbyId: lobbyId || queryLobbyId,
      username: user?.username,
      _id: user?._id,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Phaser game canvas */}
      <PhaserGame
        mapData={mapData}
        matchId={lobbyId}
        onMapClick={handleMapClick}
      />

      {/* PhaseUI with ref and cityBuilt prop */}
      <PhaseUI
        ref={phaseUIRef}
        phase={phase}
        resourcesData={resourcesData}
        cityBuilt={cityBuilt}
        onCityPlacement={handleCityPlacement}
        onCardSelected={handleCardSelected}
        onCancelPlacement={handleCancelPlacement}
      />

      {/* Other UI elements (e.g., header, player list, buttons) */}
      <div className="absolute top-5 left-5 z-10 text-white bg-black bg-opacity-50 p-2 rounded">
        <h2>Game Room: {lobbyId}</h2>
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
        <button
          onClick={handleReady}
          className="mt-2 px-4 py-2 rounded bg-green-500 text-white"
        >
          Ready
        </button>
        <button
          onClick={() => router.push("/lobby")}
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
