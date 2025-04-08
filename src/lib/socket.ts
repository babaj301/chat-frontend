import { io, Socke } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

let socket: Socket | null = null;

// Function to get the socket instance

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
  }
  return socket;
};
