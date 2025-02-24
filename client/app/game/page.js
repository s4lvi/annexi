// app/game/page.js
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import io from "socket.io-client";

// Dynamically import the PhaserGame component
const PhaserGame = dynamic(() => import("../../components/PhaserGame"), {
  ssr: false,
});

let socket;

export default function GameContainer() {
  const searchParams = useSearchParams();
  const queryLobbyId = searchParams.get("lobbyId");
  const [mapData, setMapData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [lobbyId, setLobbyId] = useState(queryLobbyId);

  useEffect(() => {
    // Try to load data from localStorage
    const storedMapData = localStorage.getItem("mapData");
    const storedPlayers = localStorage.getItem("lobbyPlayers");

    if (storedMapData && storedPlayers && queryLobbyId) {
      setMapData(JSON.parse(storedMapData));
      setPlayers(JSON.parse(storedPlayers));
      setLobbyId(queryLobbyId);
    } else if (queryLobbyId) {
      // Optionally, fetch data from your backend
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
    socket.emit("joinMatch", {
      matchId: lobbyId || queryLobbyId,
      username: user?.username,
    });

    socket.on("matchUpdate", (data) => {
      setPlayers(data.players);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [queryLobbyId, lobbyId]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* The Phaser canvas is rendered full-window behind the UI */}
      <PhaserGame mapData={mapData} matchId={lobbyId} />
      {/* UI on top of the game */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1,
          color: "#fff",
          background: "rgba(0, 0, 0, 0.5)",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        <h2>Game Room: {lobbyId}</h2>
        <h3>Players:</h3>
        <ul>
          {players.map((p, index) => (
            <li key={index}>{p.username}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
