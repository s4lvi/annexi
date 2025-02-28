// BattleUI.jsx
import React, { useEffect, useState } from "react";
import CardDisplayBar from "./CardDisplayBar.jsx";
import { useGameState } from "./gameState";
import io from "socket.io-client";
import { useSearchParams } from "next/navigation";

export default function BattleUI() {
  const [battleProgress, setBattleProgress] = useState(0);
  const { state, dispatch } = useGameState();
  const { currentPlayerId } = state;
  const searchParams = useSearchParams();
  const queryLobbyId = searchParams.get("lobbyId");

  // Auto-advance battle progress and trigger next phase
  useEffect(() => {
    let socket;

    const interval = setInterval(() => {
      setBattleProgress((prev) => {
        const newProgress = prev + 4;

        // When battle is complete, auto-ready the player
        if (newProgress >= 100 && !socket) {
          clearInterval(interval);

          // Connect to socket to send ready signal
          socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);

          // Small delay to show 100% complete
          setTimeout(() => {
            // Mark player as ready to advance to next phase
            dispatch({ type: "SET_CURRENT_PLAYER_READY", payload: true });

            // Send playerReady event to server
            socket.emit("playerReady", {
              lobbyId: queryLobbyId,
              _id: currentPlayerId,
              username: state.players.find((p) => p._id === currentPlayerId)
                ?.username,
            });

            // Show message
            console.log("Battle complete, auto-advancing to next turn");
          }, 500);

          return 100;
        }

        return newProgress < 100 ? newProgress : 100;
      });
    }, 150);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [currentPlayerId, queryLobbyId, dispatch, state.players]);

  return (
    <>
      {battleProgress < 100 ? (
        <div className="absolute bottom-20 left-0 w-full bg-gray-700 rounded-full h-4 my-4">
          <div
            className="bg-red-600 h-4 rounded-full transition-all duration-150"
            style={{ width: `${battleProgress}%` }}
          ></div>
        </div>
      ) : (
        <div className="absolute bottom-20 left-3 mt-4 text-lg text-white font-bold animate-pulse">
          Battle Complete! Advancing to next turn...
        </div>
      )}
      <CardDisplayBar
        title="Battle in Progress"
        message={`Battle calculations: ${battleProgress}%`}
      ></CardDisplayBar>
    </>
  );
}
