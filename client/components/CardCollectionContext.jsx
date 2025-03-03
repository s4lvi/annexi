"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from "react";
import { useSocket } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import {
  hasFetchedData,
  setFetchedData,
  getCachedData,
  setCachedData,
} from "./cardDataCache";

const CardCollectionContext = createContext();

// Memoize the Provider to prevent unnecessary re-renders
export const CardCollectionProvider = memo(function CardCollectionProviderImpl({
  children,
}) {
  const { user } = useAuth();
  const { socket, loading: socketLoading } = useSocket();

  // Load cached data if available
  const cached = getCachedData();

  const [cards, setCards] = useState(cached.cards || []);
  const [decks, setDecks] = useState(cached.decks || []);
  const [defaultDeck, setDefaultDeck] = useState(cached.defaultDeck || null);
  const [loading, setLoading] = useState(!cached.fetched);
  const [error, setError] = useState(cached.error || null);
  const [userCurrency, setUserCurrency] = useState(
    cached.userCurrency || user?.currency || 0
  );

  // To track which responses have arrived
  const responsesReceived = useRef({
    cards: false,
    decks: false,
    defaultDeck: false,
  });
  const fallbackTimer = useRef(null);

  // Instance identifier to debug remounts
  const instanceId = useRef(
    `card-provider-${Math.random().toString(36).substring(2, 9)}`
  );

  useEffect(() => {
    console.log(`${instanceId.current} mounted:`, window.location.pathname);
    return () => {
      console.log(`${instanceId.current} unmounted:`, window.location.pathname);
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        console.log("Fallback timer cleared on unmount");
      }
    };
  }, []);

  // When all responses arrive, update loading and cache
  const checkAllResponses = useCallback(() => {
    const { cards, decks, defaultDeck } = responsesReceived.current;
    if (cards && decks && defaultDeck) {
      setLoading(false);
      setCachedData({
        fetched: true,
        // Don't reference state here to avoid stale closures
      });
    }
  }, []);

  // Remove isMounted check from handlers to ensure data persists even during remounts
  const handleCardsResponse = useCallback(
    (data) => {
      console.log(
        `${instanceId.current} received cards response:`,
        data.success
      );
      responsesReceived.current.cards = true;

      if (data.success) {
        setCards(data.cards);
        setCachedData({ cards: data.cards });
      } else {
        setError(data.message || "Failed to load cards");
        setCachedData({ error: data.message || "Failed to load cards" });
      }

      checkAllResponses();
    },
    [checkAllResponses]
  );

  const handleDecksResponse = useCallback(
    (data) => {
      console.log(
        `${instanceId.current} received decks response:`,
        data.success
      );
      responsesReceived.current.decks = true;

      if (data.success) {
        setDecks(data.decks);
        setCachedData({ decks: data.decks });
      } else {
        setError(data.message || "Failed to load decks");
        setCachedData({ error: data.message || "Failed to load decks" });
      }

      checkAllResponses();
    },
    [checkAllResponses]
  );

  const handleDefaultDeckResponse = useCallback(
    (data) => {
      console.log(
        `${instanceId.current} received default deck response:`,
        data.success
      );
      responsesReceived.current.defaultDeck = true;

      if (data.success) {
        setDefaultDeck(data.deck);
        setCachedData({ defaultDeck: data.deck });
      } else {
        setError(data.message || "Failed to load default deck");
        setCachedData({ error: data.message || "Failed to load default deck" });
      }

      checkAllResponses();
    },
    [checkAllResponses]
  );

  const handleError = useCallback((data) => {
    console.log(`${instanceId.current} received error:`, data.message);
    setError(data.message || "Error in card collection");
    setCachedData({ error: data.message || "Error in card collection" });
  }, []);

  // Reset default deck flag on user change if needed
  useEffect(() => {
    responsesReceived.current.defaultDeck = false;
  }, [user]);

  // Request data only if not already fetched or if we need to refetch
  useEffect(() => {
    if (!user || socketLoading || !socket) {
      console.log(`${instanceId.current} data request effect skipped:`, {
        hasUser: !!user,
        socketLoading,
        hasSocket: !!socket,
      });
      return;
    }

    // Check if we have complete cached data for this user
    const hasCompleteData =
      cached.fetched &&
      cards.length > 0 &&
      decks.length > 0 &&
      cached.userCurrency !== undefined;

    if (hasCompleteData) {
      console.log(`${instanceId.current} using cached data, skipping fetch`);
      return;
    }

    console.log(`${instanceId.current} requesting data:`, {
      userId: user._id,
      cached: cached.fetched,
    });

    setLoading(true);
    setError(null);
    setFetchedData(true);

    socket.emit("getUserCards", { userId: user._id });
    socket.emit("getUserDecks", { userId: user._id });
    socket.emit("getDefaultDeck", { userId: user._id });

    fallbackTimer.current = setTimeout(() => {
      console.log(`${instanceId.current} fallback timer triggered`);
      setLoading(false);
    }, 5000);

    return () => {
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        console.log(`${instanceId.current} cleaned up fallback timer`);
      }
    };
  }, [user, socket, socketLoading, cached.fetched, cards.length, decks.length]);

  // Set up socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log(
        `${instanceId.current} socket not available, skipping event registration`
      );
      return;
    }

    console.log(`${instanceId.current} setting up socket event handlers`);

    socket.on("userCardsResponse", handleCardsResponse);
    socket.on("userDecksResponse", handleDecksResponse);
    socket.on("defaultDeckResponse", handleDefaultDeckResponse);
    socket.on("cardCollectionError", handleError);
    socket.on("deckCollectionError", handleError);

    return () => {
      console.log(`${instanceId.current} removing socket event handlers`);
      socket.off("userCardsResponse", handleCardsResponse);
      socket.off("userDecksResponse", handleDecksResponse);
      socket.off("defaultDeckResponse", handleDefaultDeckResponse);
      socket.off("cardCollectionError", handleError);
      socket.off("deckCollectionError", handleError);
    };
  }, [
    socket,
    handleCardsResponse,
    handleDecksResponse,
    handleDefaultDeckResponse,
    handleError,
  ]);

  // Reload functions
  const reloadCards = useCallback(() => {
    if (!user || !socket) return;
    console.log(`${instanceId.current} reloading cards`);
    socket.emit("getUserCards", { userId: user._id });
  }, [user, socket]);

  const reloadDecks = useCallback(() => {
    if (!user || !socket) return;
    console.log(`${instanceId.current} reloading decks`);
    socket.emit("getUserDecks", { userId: user._id });
    socket.emit("getDefaultDeck", { userId: user._id });
  }, [user, socket]);

  // API methods remain largely the same; they also update the cache when needed.
  const api = {
    async createDeck(deckData) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/decks/user/${user._id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deckData),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to create deck");
        reloadDecks();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async updateDeck(deckId, deckData) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/decks/user/${user._id}/${deckId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deckData),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to update deck");
        reloadDecks();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async deleteDeck(deckId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/decks/user/${user._id}/${deckId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to delete deck");
        reloadDecks();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async setDefaultDeck(deckId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/decks/user/${user._id}/${deckId}/default`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to set default deck");
        reloadDecks();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async validateDeck(cardIds) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/decks/user/${user._id}/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cards: cardIds }),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to validate deck");
        return data.validation;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async purchaseCard(cardId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/shop/purchase/${user._id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId }),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to purchase card");

        setUserCurrency(data.remainingCurrency);
        setCachedData({ userCurrency: data.remainingCurrency });
        reloadCards();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async purchaseCardPack(packType) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/shop/purchase-pack/${user._id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packType }),
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to purchase card pack");

        setUserCurrency(data.remainingCurrency);
        setCachedData({ userCurrency: data.remainingCurrency });
        reloadCards();
        return data;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async getShopCards() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/shop/cards`
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to get shop cards");
        return data.cards;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
    async getFeaturedCards() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}api/shop/featured`
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to get featured cards");
        return data.featuredCards;
      } catch (error) {
        setError(error.message);
        setCachedData({ error: error.message });
        throw error;
      }
    },
  };

  const syncWithGameState = useCallback(
    (gameDispatch) => {
      if (gameDispatch) {
        gameDispatch({
          type: "SET_CURRENCY",
          payload: userCurrency,
        });
        if (defaultDeck) {
          gameDispatch({
            type: "SET_CARDS",
            payload: { deckName: defaultDeck.name },
          });
        }
      }
    },
    [userCurrency, defaultDeck]
  );

  const contextValue = {
    cards,
    decks,
    defaultDeck,
    loading,
    error,
    userCurrency,
    reloadCards,
    reloadDecks,
    syncWithGameState,
    api,
  };

  return (
    <CardCollectionContext.Provider value={contextValue}>
      {children}
    </CardCollectionContext.Provider>
  );
});

export function useCardCollection() {
  const context = useContext(CardCollectionContext);
  if (!context) {
    throw new Error(
      "useCardCollection must be used within a CardCollectionProvider"
    );
  }
  return context;
}
