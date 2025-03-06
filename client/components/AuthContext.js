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
    const handleStorageChange = (event) => {
      if (event.key === "user") {
        try {
          setUser(event.newValue ? JSON.parse(event.newValue) : null);
        } catch (error) {
          console.error("Error syncing user across tabs:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
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

  // Logout function with option to prevent redirect
  const logout = (options = {}) => {
    console.log("Logging out user");
    try {
      // First remove from localStorage
      localStorage.removeItem("user");

      // Then update the state
      setUser(null);

      // Only redirect if not explicitly prevented
      if (!options.preventRedirect) {
        setTimeout(() => {
          router.push("/");
        }, 100);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Create guest account - only when explicitly called
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

  // Check and recover user if needed - but don't automatically create guests
  const ensureUser = () => {
    if (!user) {
      return null;
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
