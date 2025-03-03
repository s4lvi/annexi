// BattleUI.jsx
import React, { useEffect } from "react";
import CardDisplayBar from "./CardDisplayBar.jsx";
import { useGameState } from "./gameState";
import io from "socket.io-client";
import { useSearchParams } from "next/navigation";

export default function BattleUI() {
  const { state, dispatch } = useGameState();
  const { battleState, players, currentPlayerId } = state;
  const searchParams = useSearchParams();
  const queryLobbyId = searchParams.get("lobbyId");

  useEffect(() => {
    const socketClient = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    socketClient.on("battleUpdate", (data) => {
      // Update global battle units.
      dispatch({ type: "UPDATE_BATTLE_UNITS", payload: data.battleUnits });
    });
    socketClient.on("towerFired", (data) => {
      console.log("Tower fired:", data);
      // Optionally handle visual effects.
    });
    socketClient.on("battleResult", (data) => {
      console.log("Battle result received:", data);
      // Handle battle results (e.g., apply city damage, notify players).
    });
    return () => {
      socketClient.disconnect();
    };
  }, [queryLobbyId, dispatch]);

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gray-700 rounded p-2">
      {battleState.battleUnits && battleState.battleUnits.length > 0 ? (
        battleState.battleUnits.map((unit) => (
          <div key={unit.unitId} className="text-white text-sm">
            Unit {unit.unitId} (Player {unit.playerId}): {unit.health} HP at (
            {unit.position.x}, {unit.position.y})
          </div>
        ))
      ) : (
        <div className="text-white text-sm">No active battle units</div>
      )}
      <CardDisplayBar
        title="Battle in Progress"
        message={`Active units: ${
          battleState.battleUnits ? battleState.battleUnits.length : 0
        }`}
      />
    </div>
  );
}
