// gameState.js

"use client";
import React, { createContext, useReducer, useContext } from "react";
// In gameState.js - Update the initial state and reducer

// Add more fields to the initial state
const initialState = {
  phase: "expand", // current phase ("expand", "conquer", "resolution")
  placingCity: false, // flag for when the player is in the process of placing a city
  cityBuilt: false, // flag indicating if the current player has built a city
  expansionComplete: false, // flag for when territory expansion is complete
  placingStructure: false, // flag for when placing defensive structures
  selectedStructure: null, // currently selected structure to place
  queueingArmy: false, // flag for when queueing armies
  mapData: null, // overall map data
  players: [], // array of player objects
  currentPlayerId: null, // the id of the user/player for local state updates
  cities: [], // all cities on the map [{x, y, type, level, playerId}]
  territories: {}, // territories by player ID: { playerId: [{x, y}] }
  structures: [], // defensive structures on the map
  armies: [], // armies queued for attack
  availableCards: {}, // cards available for purchase
  targetCity: null, // selected enemy city target
};

// Update the reducer with new action types
function gameReducer(state, action) {
  switch (action.type) {
    case "SET_PHASE":
      return {
        ...state,
        phase: action.payload,
        // Reset phase-specific flags when changing phases
        placingCity: false,
        placingStructure: false,
        queueingArmy: false,
        // Don't reset cityBuilt here as it's handled specifically
      };

    case "SET_PLACING_CITY":
      return { ...state, placingCity: action.payload };

    case "SET_CITY_BUILT":
      return { ...state, cityBuilt: action.payload };

    case "SET_EXPANSION_COMPLETE":
      return { ...state, expansionComplete: action.payload };

    case "SET_PLACING_STRUCTURE":
      return {
        ...state,
        placingStructure: action.payload,
        selectedStructure: action.payload ? state.selectedStructure : null,
      };

    case "SET_SELECTED_STRUCTURE":
      return { ...state, selectedStructure: action.payload };

    case "SET_QUEUING_ARMY":
      return { ...state, queueingArmy: action.payload };

    case "SET_TARGET_CITY":
      return { ...state, targetCity: action.payload };

    case "SET_MAPDATA":
      return { ...state, mapData: action.payload };

    case "SET_PLAYERS":
      return { ...state, players: action.payload };

    case "SET_CARDS":
      console.log("Setting available cards:", action.payload);
      return {
        ...state,
        availableCards: action.payload,
      };

    case "SET_CURRENT_PLAYER":
      return { ...state, currentPlayerId: action.payload };

    case "UPDATE_PLAYER":
      return {
        ...state,
        players: state.players.map((player) =>
          player._id === action.payload._id
            ? { ...player, ...action.payload }
            : player
        ),
      };

    case "UPDATE_PLAYER_RESOURCES":
      console.log("Updating player resources:", action.payload);
      return {
        ...state,
        players: state.players.map((player) =>
          player._id === action.payload._id
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

    case "BULK_ADD_TERRITORY":
      const { claims } = action.payload;
      const newTerritories = { ...state.territories };

      // Skip if claims is undefined or empty
      if (!claims || claims.length === 0) {
        return state;
      }

      claims.forEach((claim) => {
        const pid = claim.playerId;
        if (!pid) return; // Skip invalid claims

        if (!newTerritories[pid]) {
          newTerritories[pid] = [];
        }

        // Only add if not already present (avoid duplicates)
        if (
          !newTerritories[pid].some((t) => t.x === claim.x && t.y === claim.y)
        ) {
          newTerritories[pid].push({ x: claim.x, y: claim.y });
        }
      });

      return {
        ...state,
        territories: newTerritories,
      };

    case "ADD_STRUCTURE":
      return {
        ...state,
        structures: [...state.structures, action.payload],
      };

    case "ADD_ARMY":
      return {
        ...state,
        armies: [...state.armies, action.payload],
      };

    case "RESET_STATE":
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
