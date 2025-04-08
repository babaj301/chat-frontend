"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";

interface Room {
  id: string;
  name: string;
  adminId: string | null;
  admin?: User;
}

interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface Message {
  id: string;
  text: string;
  userId: string | null;
  isSystem?: boolean;
  isAdmin?: boolean;
  user?: User;
  createdAt: string;
}

export default function RoomsPage() {
  const { socket, isConnected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomJoin, setPendingRoomJoin] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isAdminMessage, setIsAdminMessage] = useState(false);
  const [loginAsAdmin, setLoginAsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminFields, setShowAdminFields] = useState(false);
  // Track rooms that user has already joined
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addDebugLog = (message: string) => {
    setDebugLog((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        addDebugLog("Fetching rooms...");
        const response = await fetch("http://localhost:4000/rooms");
        if (!response.ok) {
          throw new Error(`Failed to fetch rooms: ${response.status}`);
        }
        const data = await response.json();
        setRooms(data);
        addDebugLog(`Received ${data.length} rooms`);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        addDebugLog(
          `Error fetching rooms: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    fetchRooms();
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      addDebugLog("Socket not initialized");
      return;
    }

    addDebugLog(`Socket connected: ${isConnected}`);

    socket.on("roomJoined", (data) => {
      addDebugLog(`Joined room: ${data.room.name}`);
      addDebugLog(`Received ${data.messages.length} messages`);
      setMessages(data?.messages);

      const isFirstJoin = !joinedRooms.has(data?.rooms?.id);

      // If this is the first time joining
      if (isFirstJoin) {
        const joinMessage: Message = {
          id: `system-join-${Date.now()}`,
          text: `${username} has joined the room`,
          userId: null,
          isSystem: true,
          createdAt: new Date().toISOString(),
        };

        // Add the join message to the messages
        setMessages([...data?.messages, joinMessage]);
      } else {
        // Just set the messages as before
        setMessages(data?.messages);
      }

      // Add to joined rooms when successfully joined
      setJoinedRooms((prev) => {
        const newSet = new Set(prev);
        newSet.add(data.room.id);
        return newSet;
      });
    });

    socket.on("newMessage", (message) => {
      addDebugLog(`New message received: ${message.text.substring(0, 20)}...`);
      setMessages((prev) => [...prev, message]);
    });

    socket.on("roomCreated", (room) => {
      addDebugLog(`New room created: ${room.name}`);
      setRooms((prev) => [room, ...prev]);
    });

    socket.on("roomCreationSuccess", (room) => {
      addDebugLog(`You created room: ${room.name}`);
      setShowCreateRoomModal(false);
      setNewRoomName("");

      // Auto-add rooms you create to joined rooms
      setJoinedRooms((prev) => {
        const newSet = new Set(prev);
        newSet.add(room.id);
        return newSet;
      });
    });

    socket.on("error", (error) => {
      addDebugLog(`Socket error: ${error}`);
      alert(`Error: ${error}`);
    });

    return () => {
      socket.off("roomJoined");
      socket.off("newMessage");
      socket.off("roomCreated");
      socket.off("roomCreationSuccess");
      socket.off("error");
    };
  }, [socket, isConnected]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Login handler
  const handleLogin = async () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    // For admin login, check if password is provided
    if (loginAsAdmin && !adminPassword.trim()) {
      alert("Please enter admin password");
      return;
    }

    try {
      // addDebugLog(
      //   `Attempting login for ${username}${loginAsAdmin ? " as admin" : ""}...`
      // );
      const response = await fetch("http://localhost:4000/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: username,
          isAdmin: loginAsAdmin,
          adminPassword: loginAsAdmin ? adminPassword : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to login: ${response.status}`);
      }
      // Get user data from backend
      const userData = await response.json();

      addDebugLog(
        `Login successful. User ID: ${userData.id}${
          userData.isAdmin ? " (Admin)" : ""
        }`
      );
      setUserId(userData.id);
      setIsAdmin(userData.isAdmin || false);
      // If user is admin, default to sending admin messages
      setIsAdminMessage(userData.isAdmin || false);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login error:", error);
      addDebugLog(
        `Login error: ${error instanceof Error ? error.message : String(error)}`
      );
      alert("Failed to login. Please try again.");
    }
  };

  // Room handlers
  const initiateJoinRoom = (roomId: string) => {
    setPendingRoomJoin(roomId);
    setShowJoinModal(true);
  };

  const joinRoom = (roomId: string) => {
    if (!socket) return;

    addDebugLog(`Joining room ${roomId}...`);
    setSelectedRoom(roomId);
    setMessages([]); // Clear previous messages
    socket.emit("joinRoom", {
      roomId: roomId,
      userId,
      username,
    });
  };

  const confirmJoinRoom = () => {
    if (!pendingRoomJoin) return;

    joinRoom(pendingRoomJoin);
    setShowJoinModal(false);
    setPendingRoomJoin(null);
  };

  const cancelJoinRoom = () => {
    setShowJoinModal(false);
    setPendingRoomJoin(null);
  };

  const handleCreateRoom = () => {
    if (!socket || !newRoomName.trim()) {
      addDebugLog("Cannot create room: Missing room name");
      return;
    }

    addDebugLog(`Creating room ${newRoomName}...`);
    socket.emit("createRoom", {
      name: newRoomName,
      adminId: isAdmin ? userId : null,
    });
  };

  // Handle room click with join memory
  const handleRoomClick = (roomId: string) => {
    // Admins can always join directly
    if (isAdmin) {
      joinRoom(roomId);
      return;
    }

    // If user has already joined this room before, join directly
    if (joinedRooms.has(roomId)) {
      addDebugLog(`Rejoining previously joined room ${roomId}`);
      joinRoom(roomId);
      return;
    }

    // Otherwise, show the join modal for confirmation
    initiateJoinRoom(roomId);
  };

  // Message handler
  const sendMessage = () => {
    if (!socket || !selectedRoom || messageText.trim() === "" || !userId) {
      addDebugLog("Cannot send message: Missing required data");
      return;
    }

    // If user is admin, always send as admin
    const sendAsAdmin = isAdmin ? true : isAdminMessage;

    addDebugLog(
      `Sending message to room ${selectedRoom}${
        sendAsAdmin ? " as admin" : ""
      }...`
    );
    socket.emit("sendMessage", {
      roomId: selectedRoom,
      userId,
      text: messageText,
      isAdmin: sendAsAdmin,
    });

    setMessageText("");
    // Don't reset isAdminMessage if user is admin
    if (!isAdmin) {
      setIsAdminMessage(false);
    }
  };

  // Toggle admin login fields
  const toggleAdminFields = () => {
    setShowAdminFields(!showAdminFields);
    if (!showAdminFields) {
      setLoginAsAdmin(true);
    } else {
      setLoginAsAdmin(false);
      setAdminPassword("");
    }
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-6'>
        <h1 className='text-2xl font-bold mb-6'>Chat Login</h1>
        <div className='w-full max-w-md'>
          <div className='mb-4'>
            <label className='block text-sm font-medium mb-1'>Username</label>
            <input
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className='w-full border p-2 rounded'
              placeholder='Enter username'
            />
          </div>

          <div className='mb-4'>
            <button
              type='button'
              onClick={toggleAdminFields}
              className='text-blue-500 text-sm underline'
            >
              {showAdminFields ? "Login as regular user" : "Login as admin"}
            </button>
          </div>

          {showAdminFields && (
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-1'>
                Admin Password
              </label>
              <input
                type='password'
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className='w-full border p-2 rounded'
                placeholder='Enter admin password'
              />
            </div>
          )}

          <button
            onClick={handleLogin}
            className={`w-full ${
              showAdminFields ? "bg-red-500" : "bg-blue-500"
            } text-white p-2 rounded`}
          >
            {showAdminFields ? "Enter as Admin" : "Enter Chat"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-4 flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Chat Rooms</h1>
        <div className='text-sm'>
          <span
            className={`inline-block h-2 w-2 rounded-full mr-1 ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          {isConnected ? "Connected" : "Disconnected"} | Logged in as:{" "}
          <span className='font-semibold'>{username}</span>
          {isAdmin && <span className='ml-1 text-yellow-500'>(Admin)</span>}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {/* Rooms List */}
        <div className='md:col-span-1 gap-4'>
          <h2 className='text-lg font-semibold mb-2'>Available Rooms</h2>
          <ul className='border rounded overflow-hidden'>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <li
                  key={room.id}
                  className={`p-3 border-b cursor-pointer hover:bg-white hover:text-black ${
                    selectedRoom === room.id ? "bg-gray-600 text-white" : ""
                  }`}
                  onClick={() => handleRoomClick(room.id)}
                >
                  {room.name}
                  {room.adminId === userId && (
                    <span className='ml-2 text-xs'>(Owner)</span>
                  )}
                  {!isAdmin &&
                    joinedRooms.has(room.id) &&
                    room.adminId !== userId && (
                      <span className='ml-2 text-xs text-green-500'>
                        (Joined)
                      </span>
                    )}
                </li>
              ))
            ) : (
              <li className='p-3 text-gray-500'>No rooms available</li>
            )}
          </ul>

          <button
            className='px-4 py-2 bg-blue-500 text-white mt-4 w-full rounded'
            onClick={() => setShowCreateRoomModal(true)}
          >
            Create Room
          </button>
        </div>

        {/* Chat Area */}
        <div className='md:col-span-2'>
          {selectedRoom ? (
            <>
              <h2 className='text-lg font-semibold mb-2'>
                {rooms.find((r) => r.id === selectedRoom)?.name || "Chat"}
              </h2>

              {/* Messages */}
              <div className='border rounded p-4 h-[60vh] overflow-y-auto mb-4'>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 mb-2 rounded ${
                        msg.isSystem
                          ? "bg-black text-center italic"
                          : msg.isAdmin
                          ? "bg-blue-500 border ml-auto max-w-[50%] border-blue-300"
                          : msg.userId === userId
                          ? "bg-black border border-white max-w-[80%]"
                          : "bg-black border border-white max-w-[80%]"
                      }`}
                    >
                      {!msg.isSystem && (
                        <div className='text-xs font-semibold flex items-center'>
                          {msg.user?.name}
                          {msg.isAdmin && (
                            <span className='ml-1 text-red-500 text-xs'>
                              [ADMIN]
                            </span>
                          )}
                        </div>
                      )}

                      <div>{msg.text}</div>
                    </div>
                  ))
                ) : (
                  <p className='text-gray-500 text-center mt-10'>
                    No messages yet.
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className='flex flex-col gap-2'>
                {/* Only show Send as Admin checkbox for room owners who are not admin users */}
                {!isAdmin &&
                  rooms.find((r) => r.id === selectedRoom)?.adminId ===
                    userId && (
                    <div className='flex items-center mb-2'>
                      <input
                        type='checkbox'
                        id='adminMessage'
                        checked={isAdminMessage}
                        onChange={() => setIsAdminMessage(!isAdminMessage)}
                        className='mr-2'
                      />
                      <label htmlFor='adminMessage' className='text-sm'>
                        Send as Admin
                      </label>
                    </div>
                  )}
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className={`border p-2 rounded flex-1 ${
                      isAdmin || isAdminMessage ? "border-red-400" : ""
                    }`}
                    placeholder={`Type a message${
                      isAdmin ? " as Admin" : ""
                    }...`}
                  />
                  <button
                    onClick={sendMessage}
                    className={`px-4 py-2 rounded ${
                      isAdmin || isAdminMessage
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    Send{isAdmin ? " as Admin" : ""}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className='border rounded p-10 h-[60vh] text-center text-gray-500'>
              Select a room to start chatting
            </div>
          )}
        </div>

        {/* Debug Log */}
        <div className='md:col-span-1'>
          <h2 className='text-lg font-semibold mb-2'>Debug Log</h2>
          <div className='border rounded h-80 overflow-y-auto p-2 text-xs font-mono'>
            {debugLog.map((log, idx) => (
              <div key={idx} className='mb-1'>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Join Room Modal - Only shown for non-admin users joining a room for the first time */}
      {showJoinModal && !isAdmin && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 text-blacks rounded-lg shadow-lg max-w-md w-full'>
            <h3 className='text-lg font-semibold text-black mb-4'>Join Room</h3>
            <p className='mb-4 text-black'>
              Do you want to join "
              {rooms.find((r) => r.id === pendingRoomJoin)?.name}"?
            </p>
            <div className='flex justify-end gap-2'>
              <button
                className='px-4 py-2 bg-red-400 text-white rounded'
                onClick={cancelJoinRoom}
              >
                Cancel
              </button>
              <button
                className='px-4 py-2 bg-blue-500 text-white rounded'
                onClick={confirmJoinRoom}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full'>
            <h3 className='text-lg font-semibold mb-4'>Create New Room</h3>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-1'>
                Room Name
              </label>
              <input
                type='text'
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className='w-full border p-2 rounded'
                placeholder='Enter room name'
              />
            </div>
            <div className='flex justify-end gap-2'>
              <button
                className='px-4 py-2 bg-red-400 text-white rounded'
                onClick={() => setShowCreateRoomModal(false)}
              >
                Cancel
              </button>
              <button
                className='px-4 py-2 bg-blue-500 text-white rounded'
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
