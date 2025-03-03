// components/SocketContext.jsx
"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import io from "socket.io-client";
import { getSocket } from "./socketClient";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const socketInstance = getSocket(backendUrl);
    console.log("Socket instance created:", socketInstance);
    console.log("Mounted:", isMounted.current);
    socketInstance.on("connect", () => {
      if (isMounted.current) {
        console.log("Socket instance ID:", socketInstance.id);
        console.log("Socket instance connected:", socketInstance.connected);
        setSocket(socketInstance);
        setLoading(false);
      }
    });

    return () => {
      // Optionally, disconnect only in production or based on a condition
      if (process.env.NODE_ENV === "production") {
        console.log("Disconnecting socket instance:", socketInstance.id);
        socketInstance.disconnect();
      }
    };
  }, []);

  if (loading) return null;

  return (
    <SocketContext.Provider value={{ socket, loading }}>
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
