// components/SocketContext.jsx
"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { getSocket } from "./socketClient";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketInitialized = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    // Ensure we only initialize the socket once
    if (socketInitialized.current) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const socketInstance = getSocket(backendUrl);
    console.log("Socket instance created:", socketInstance);
    console.log("Mounted:", isMounted.current);

    // Handle connection event
    const handleConnect = () => {
      if (isMounted.current) {
        console.log("Socket instance ID:", socketInstance.id);
        console.log("Socket instance connected:", socketInstance.connected);
        setSocket(socketInstance);
        setLoading(false);
      }
    };

    // If already connected, update state immediately
    if (socketInstance.connected) {
      handleConnect();
    } else {
      socketInstance.on("connect", handleConnect);
    }

    socketInitialized.current = true;

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (socketInstance) {
        socketInstance.off("connect", handleConnect);

        // Only disconnect in production or when component is unmounting
        if (process.env.NODE_ENV === "production") {
          console.log("Disconnecting socket instance:", socketInstance.id);
          socketInstance.disconnect();
        }
      }
    };
  }, []);

  const contextValue = {
    socket,
    loading,
    reconnect: () => {
      if (socket && !socket.connected) {
        socket.connect();
      }
    },
  };

  // Don't render children until socket is ready
  if (loading) return null;

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
