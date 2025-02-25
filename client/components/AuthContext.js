"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Create a context for authentication
const AuthContext = createContext();

// Generate a random hex ID for guest users
const generateHexId = () => {
  let hexString = "";
  for (let i = 0; i < 24; i++) {
    const hexDigit = Math.floor(Math.random() * 16).toString(16);
    hexString += hexDigit;
  }
  return hexString;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize user on component mount
  useEffect(() => {
    const initUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Error loading user from localStorage:", error);
      } finally {
        setLoading(false);
      }
    };

    initUser();

    // Add storage event listener to sync user across tabs
    window.addEventListener("storage", (event) => {
      if (event.key === "user") {
        try {
          setUser(event.newValue ? JSON.parse(event.newValue) : null);
        } catch (error) {
          console.error("Error syncing user across tabs:", error);
        }
      }
    });
  }, []);

  // Login function
  const login = (userData) => {
    try {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error storing user in localStorage:", error);
    }
  };

  // Logout function
  const logout = () => {
    try {
      localStorage.removeItem("user");
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Error removing user from localStorage:", error);
    }
  };

  // Create guest account
  const createGuestAccount = () => {
    const guestId = generateHexId();
    const guestUser = {
      username: `Guest_${guestId.substring(0, 4)}`,
      _id: guestId,
      isGuest: true,
    };
    login(guestUser);
    return guestUser;
  };

  // Check and recover user if needed
  const ensureUser = () => {
    if (!user) {
      // User is missing, create a guest user as fallback
      return createGuestAccount();
    }
    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        createGuestAccount,
        ensureUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
