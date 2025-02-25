// gameState.js

"use client";
import React, { createContext, useReducer, useContext } from "react";

// Each player object will have this shape:
// {
//   id: string,             // unique identifier (e.g. _id)
//   username: string,
//   production: number,     // production resource
//   gold: number,           // gold resource
//   cards: Array,           // available cards for the user
//   ready: boolean,         // ready status
// }

const initialState = {
  phase: "expand", // current phase ("expand", "conquer", etc.)
  placingCity: false, // flag for when the player is in the process of placing a city
  cityBuilt: false, // flag indicating if the current player has built a city
  mapData: null, // overall map data
  players: [], // array of player objects (see above)
  currentPlayerId: null, // the id of the user/player for local state updates
  cities: [], // all cities on the map [{x, y, type, level, playerId}]
  territories: {}, // territories by player ID: { playerId: [{x, y}] }
};

function gameReducer(state, action) {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.payload };
    case "SET_PLACING_CITY":
      return { ...state, placingCity: action.payload };
    case "SET_CITY_BUILT":
      return { ...state, cityBuilt: action.payload };
    case "SET_MAPDATA":
      return { ...state, mapData: action.payload };
    case "SET_PLAYERS":
      return { ...state, players: action.payload };
    case "SET_CURRENT_PLAYER":
      return { ...state, currentPlayerId: action.payload };
    case "UPDATE_PLAYER":
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload.id
            ? { ...player, ...action.payload }
            : player
        ),
      };
    case "UPDATE_PLAYER_RESOURCES":
      // This action updates a player's resources (production, gold, cards)
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.payload.id
            ? {
                ...player,
                production:
                  action.payload.production !== undefined
                    ? action.payload.production
                    : player.production,
                gold:
                  action.payload.gold !== undefined
                    ? action.payload.gold
                    : player.gold,
                cards:
                  action.payload.cards !== undefined
                    ? action.payload.cards
                    : player.cards,
              }
            : player
        ),
      };
    case "ADD_CITY":
      return {
        ...state,
        cities: [...state.cities, action.payload],
        // Remove automatic cityBuilt setting here
        mapData: state.mapData.map((row) =>
          row.map((tile) =>
            tile.x === action.payload.x && tile.y === action.payload.y
              ? {
                  ...tile,
                  city: {
                    type: action.payload.type,
                    level: action.payload.level,
                  },
                }
              : tile
          )
        ),
      };
    case "ADD_TERRITORY":
      const { playerId, territory } = action.payload;
      return {
        ...state,
        territories: {
          ...state.territories,
          [playerId]: [...(state.territories[playerId] || []), territory],
        },
      };
    case "RESET_STATE":
      // Reset the entire state to initial values
      return initialState;
    default:
      return state;
  }
}

const GameStateContext = createContext();

export function GameStateProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return context;
}
