// gameState.js
"use client";
import React, { createContext, useReducer, useContext } from "react";

const initialState = {
  // Remove the phase property—progress is tracked solely via turnStep.
  placingCity: false,
  cityBuilt: false,
  expansionComplete: false,
  placingStructure: false,
  selectedStructure: null,
  queueingArmy: false,
  mapData: null,
  players: [],
  currentPlayerId: null,
  cities: [],
  territories: {},
  structures: [],
  armies: [],
  availableCards: {},
  targetCity: null,
  currentHand: [],
  turnStep: 0,
  lastUpdate: Date.now(),
  currentPlayerReady: false,
  sourceCity: null,
  targetSelectionActive: null,
  targetCity: null,
  attackPath: [],
  mapClickHandler: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case "SET_CURRENT_HAND":
      return { ...state, currentHand: action.payload };
    case "SET_PLACING_CITY":
      return { ...state, placingCity: action.payload };
    case "SET_CITY_BUILT":
      return {
        ...state,
        cityBuilt: action.payload,
        placingCity: action.payload ? false : state.placingCity,
      };
    case "SET_EXPANSION_COMPLETE":
      return { ...state, expansionComplete: action.payload };
    case "SET_PLACING_STRUCTURE":
      return {
        ...state,
        placingStructure: action.payload,
        selectedStructure: action.payload ? state.selectedStructure : null,
      };
    case "SET_LAST_UPDATE":
      return { ...state, lastUpdate: action.payload };
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
      return { ...state, currentHand: action.payload.currentHand };
    case "UPDATE_CARD_PURCHASE":
      return {
        ...state,
        currentHand: action.payload.hand,
        inventory: action.payload.inventory,
      };
    case "UPDATE_PLAYER_CARDS":
      return {
        ...state,
        players: state.players.map((player) =>
          player._id === action.payload._id
            ? { ...player, inventory: action.payload.inventory }
            : player
        ),
      };
    case "ADVANCE_TURN_STEP":
      return {
        ...state,
        turnStep: state.turnStep < 6 ? state.turnStep + 1 : state.turnStep,
        currentPlayerReady: false,
      };
    case "RESET_TURN_STEP":
      return { ...state, turnStep: 0 };
    case "SET_TURN_STEP":
      return { ...state, turnStep: action.payload };
    case "RESET_READY_STATUS":
      return { ...state, currentPlayerReady: false };
    case "SET_CURRENT_PLAYER":
      return { ...state, currentPlayerId: action.payload };
    case "SET_CURRENT_PLAYER_READY":
      return { ...state, currentPlayerReady: action.payload };
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
                    playerId: action.payload.playerId,
                  },
                }
              : tile
          )
        ),
      };
    case "ADD_TERRITORY": {
      const { playerId, territory } = action.payload;
      return {
        ...state,
        territories: {
          ...state.territories,
          [playerId]: [...(state.territories[playerId] || []), territory],
        },
      };
    }
    case "BULK_ADD_TERRITORY": {
      const { claims } = action.payload;
      const newTerritories = { ...state.territories };
      if (!claims || claims.length === 0) return state;
      claims.forEach((claim) => {
        const pid = claim.playerId;
        if (!pid) return;
        if (!newTerritories[pid]) newTerritories[pid] = [];
        if (
          !newTerritories[pid].some((t) => t.x === claim.x && t.y === claim.y)
        )
          newTerritories[pid].push({ x: claim.x, y: claim.y });
      });
      return { ...state, territories: newTerritories };
    }
    case "ADD_STRUCTURE":
      return {
        ...state,
        structures: [...state.structures, action.payload],
        mapData: state.mapData.map((row) =>
          row.map((tile) =>
            tile.x === action.payload.x && tile.y === action.payload.y
              ? {
                  ...tile,
                  structures: {
                    type: action.payload.type,
                    playerId: action.payload.playerId,
                  },
                }
              : tile
          )
        ),
      };
    case "ADD_ARMY":
      return { ...state, armies: [...state.armies, action.payload] };
    case "RESET_STATE":
      return initialState;

    case "SET_SOURCE_CITY":
      return { ...state, sourceCity: action.payload };

    case "SET_TARGET_CITY":
      return { ...state, targetCity: action.payload };

    case "SET_ATTACK_PATH":
      return { ...state, attackPath: action.payload };

    case "SET_TARGET_SELECTION_ACTIVE":
      return { ...state, targetSelectionActive: action.payload };
    case "SET_MAP_CLICK_HANDLER":
      return { ...state, mapClickHandler: action.payload };
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
