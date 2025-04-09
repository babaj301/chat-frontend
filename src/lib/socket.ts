import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://chat-backend-f6vg.onrender.com";

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
