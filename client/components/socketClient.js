// socketClient.js
import io from "socket.io-client";

let socket;

export function getSocket(backendUrl) {
  if (!socket) {
    socket = io(backendUrl);
  }
  return socket;
}
