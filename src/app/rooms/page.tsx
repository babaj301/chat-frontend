"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import { Socket } from "socket.io-client";
import Logo from "../chatty-logo.png";
import Image from "next/image";
import { MdDeleteOutline, MdImage } from "react-icons/md";

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
  audioUrl?: string;
}

// Add VoiceMessage component
const VoiceMessage = ({
  socket,
  selectedRoom,
  userId,
  isAdmin,
  isAdminMessage,
}: {
  socket: Socket;
  selectedRoom: string | null;
  userId: string;
  isAdmin: boolean;
  isAdminMessage: boolean;
}) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Error accessing microphone. Please check your permissions.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorder.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/mp3" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        try {
          const response = await fetch(
            "https://chat-backend-gqqw.onrender.com/upload-audio",
            {
              method: "POST",
              body: formData,
            }
          );

          if (response.ok) {
            const { audioUrl } = await response.json();
            socket?.emit("sendMessage", {
              roomId: selectedRoom,
              userId,
              text: `[Audio](${audioUrl})`,
              isAdmin: isAdmin ? true : isAdminMessage,
            });
          }
        } catch (error) {
          console.error("Voice message upload error:", error);
          alert("Failed to upload voice message. Please try again.");
        }

        setRecording(false);
        resolve();
      };

      mediaRecorder.current!.stop();
      mediaRecorder
        .current!.stream.getTracks()
        .forEach((track) => track.stop());
    });
  };

  const handleToggleRecording = async () => {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // const getButtonStyle = () => {
  //   if (recording) return "bg-red-500";
  //   return "bg-blue-500";
  // };

  return (
    <button
      type='button'
      className={`p-2 rounded-full ${
        recording ? "bg-red-500" : "bg-blue-500"
      } transition-colors duration-200 hover:opacity-90`}
      onClick={handleToggleRecording}
      aria-label={recording ? "Stop recording" : "Start recording"}
    >
      {recording ? (
        // Stop recording icon (square)
        <svg
          className='w-6 h-6 text-white'
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <rect x='6' y='6' width='12' height='12' />
        </svg>
      ) : (
        // Microphone icon
        <svg
          className='w-6 h-6 text-white'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
          />
        </svg>
      )}
    </button>
  );
};

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
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>(
    {}
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Track rooms that user has already joined
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const savedRooms = localStorage.getItem("joinedRooms");
      return savedRooms ? new Set(JSON.parse(savedRooms)) : new Set();
    }
    return new Set();
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addDebugLog = (message: string) => {
    setDebugLog((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  // Update localStorage when joinedRooms changes
  useEffect(() => {
    if (userId && joinedRooms.size > 0) {
      localStorage.setItem(
        `joinedRooms_${userId}`,
        JSON.stringify([...joinedRooms])
      );
    }
  }, [joinedRooms, userId]);

  // Load user's joined rooms from localStorage after login
  useEffect(() => {
    if (userId && typeof window !== "undefined") {
      const savedRooms = localStorage.getItem(`joinedRooms_${userId}`);
      if (savedRooms) {
        setJoinedRooms(new Set(JSON.parse(savedRooms)));
        addDebugLog(
          `Loaded ${
            JSON.parse(savedRooms).length
          } previously joined rooms from storage`
        );
      }
    }
  }, [userId]);
  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        addDebugLog("Fetching rooms...");
        const response = await fetch(
          `https://chat-backend-gqqw.onrender.com/rooms`
        );
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

      // Simply set the messages without adding a new join message
      setMessages(data.messages);

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

    // For deleted message emitting
    socket.on("messageDeleted", ({ messageId }) => {
      addDebugLog(`Message deleted: ${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
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

    socket.on("userTyping", ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        const newTypingUsers = { ...prev };
        if (isTyping) {
          newTypingUsers[username] = true;
        } else {
          delete newTypingUsers[username];
        }
        return newTypingUsers;
      });
    });

    return () => {
      if (socket) {
        socket.off("roomJoined");
        socket.off("newMessage");
        socket.off("roomCreated");
        socket.off("messageDeleted");
        socket.off("roomCreationSuccess");
        socket.off("error");
        socket.off("userTyping");
      }
    };
  }, [socket, isConnected, username, joinedRooms]);

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
      const response = await fetch(
        "https://chat-backend-gqqw.onrender.com/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: username,
            isAdmin: loginAsAdmin,
            adminPassword: loginAsAdmin ? adminPassword : undefined,
          }),
        }
      );

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

  // Delete Message handler
  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !userId) {
      addDebugLog("Cannot delete message: Missing required data");
      return;
    }

    addDebugLog(`Deleting message ${messageId}...`);
    socket.emit("deleteMessage", {
      messageId: messageId,
      userId: userId,
    });
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

  // renderMessage function to handle audio messages
  const renderMessage = (msg: Message) => {
    const audioRegex = /^\[Audio\]\((.*)\)$/;
    const imageRegex = /^\[Image\]\((.*)\)$/;

    const audioMatch = audioRegex.exec(msg.text);
    if (audioMatch) {
      return (
        <audio controls className='max-w-full'>
          <source src={audioMatch[1]} type='audio/mpeg' />
          {/* Remove the track element or provide a valid src */}
        </audio>
      );
    }

    const imageMatch = imageRegex.exec(msg.text);
    if (imageMatch) {
      return (
        <Image
          src={imageMatch[1]}
          alt='Shared in chat'
          width={320}
          height={240}
          className='max-w-xs max-h-60 rounded object-contain'
        />
      );
    }

    return msg.text;
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className='flex bg-white flex-col items-center justify-center text-black min-h-screen p-6'>
        <Image className='w-30' src={Logo} alt='' />

        <div className='w-full max-w-md'>
          <div className='mb-4'>
            <label className='block text-base font-medium mb-1'>Username</label>
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
    <div className='p-6 bg-white text-black h-full'>
      {/* Header */}
      <div className='mb-4 flex justify-between items-center'>
        <Image className='w-30' src={Logo} alt='' />
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
        <div className='hidden md:block md:col-span-1 gap-4'>
          <h2 className='text-2xl font-semibold mb-2'> Rooms</h2>
          <div className='flex flex-col h-full pb-10 justify-between'>
            <ul className='overflow-hidden'>
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <li
                    key={room.id}
                    className={`p-2 rounded-md w-full font-medium cursor-pointer hover:bg-gray-400 hover:text-black ${
                      selectedRoom === room.id ? "bg-gray-100 text-black" : ""
                    }`}
                    onClick={() => handleRoomClick(room.id)}
                  >
                    {room.name}{" "}
                    {!isAdmin &&
                      joinedRooms.has(room.id) &&
                      room.adminId !== userId && (
                        <span className='inline-block h-2 w-2 rounded-full mr-1 bg-green-500'></span>
                      )}
                  </li>
                ))
              ) : (
                <li className='p-3 text-gray-500'>No rooms available</li>
              )}
            </ul>

            <button
              className='px-4 flex items-center text-white w-full rounded mt-4'
              onClick={() => setShowCreateRoomModal(true)}
            >
              <span className='text-3xl text-black'>+</span>
              <span className=' text-black ml-2'>Create Room</span>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className='md:col-span-3'>
          {selectedRoom ? (
            <>
              <h2 className='text-2xl font-medium mb-2'>
                {rooms.find((r) => r.id === selectedRoom)?.name || "Chat"}
              </h2>

              {/* Messages */}
              <div className=' p-4 h-[60vh] overflow-y-auto mb-4'>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`px-3 py-1 mb-2 rounded ${
                        msg.isSystem
                          ? " text-center italic text-gray-500"
                          : msg.isAdmin
                          ? " border w-fit min-w-[35%] border-blue-300"
                          : msg.userId === userId
                          ? "text-black bg-gray-200 w-fit min-w-[35%]"
                          : "text-black bg-gray-200 w-fit min-w-[35%]"
                      }`}
                    >
                      {!msg.isSystem && (
                        <div className='text-xs font-semibold flex items-center'>
                          <span className='text-sm'> {msg.user?.name}</span>
                          {msg.isAdmin && (
                            <span className='ml-1 text-red-500 text-xs'>
                              [ADMIN]
                            </span>
                          )}
                        </div>
                      )}

                      <div className='flex pb-2 justify-between'>
                        {renderMessage(msg)}{" "}
                        {(msg.userId === userId ||
                          isAdmin ||
                          rooms.find((r) => r.id === selectedRoom)?.adminId ===
                            userId) &&
                          !msg.isSystem && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className=''
                            >
                              <MdDeleteOutline />
                            </button>
                          )}
                      </div>
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
                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className='text-sm text-gray-500 italic ml-2'>
                    {Object.keys(typingUsers).join(", ")}{" "}
                    {Object.keys(typingUsers).length === 1 ? "is" : "are"}{" "}
                    typing...
                  </div>
                )}

                {/* Admin checkbox section */}
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
                  <div className='flex-1 flex gap-2 items-center justify-center'>
                    <input
                      type='text'
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);

                        if (!socket || !selectedRoom) return;

                        // Clear previous timeout
                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current);
                        }

                        // Emit typing start
                        socket.emit("typing", {
                          roomId: selectedRoom,
                          username,
                          isTyping: true,
                        });

                        // Set timeout to stop typing
                        typingTimeoutRef.current = setTimeout(() => {
                          socket?.emit("typing", {
                            roomId: selectedRoom,
                            username,
                            isTyping: false,
                          });
                        }, 2000);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      className={`flex-1 border px-2 py-1 rounded ${
                        isAdmin || isAdminMessage ? "border-gray-600" : ""
                      }`}
                      placeholder={`Type a message${
                        isAdmin ? " as Admin" : ""
                      }...`}
                    />

                    {/* Image Upload Button */}
                    <label className='cursor-pointer'>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const formData = new FormData();
                          formData.append("image", file);

                          try {
                            const response = await fetch(
                              "https://chat-backend-gqqw.onrender.com/upload",
                              {
                                method: "POST",
                                body: formData,
                              }
                            );

                            if (response.ok) {
                              const { imageUrl } = await response.json();
                              socket?.emit("sendMessage", {
                                roomId: selectedRoom,
                                userId,
                                text: `[Image](${imageUrl})`,
                                isAdmin: isAdmin ? true : isAdminMessage,
                              });
                            }
                          } catch (error) {
                            console.error("Image upload error:", error);
                            alert("Failed to upload image. Please try again.");
                          }
                        }}
                      />
                      <span className='bg-blue-500 text-white w-6 h-6 rounded'>
                        <MdImage className='w-6 h-6 bg-blue-500 text-white' />
                      </span>
                    </label>

                    {/* Voice Message Button */}
                    {socket && (
                      <VoiceMessage
                        socket={socket}
                        selectedRoom={selectedRoom}
                        userId={userId}
                        isAdmin={isAdmin}
                        isAdminMessage={isAdminMessage}
                      />
                    )}
                  </div>
                  <button
                    onClick={sendMessage}
                    className={`px-2 py-2 rounded ${
                      isAdmin || isAdminMessage
                        ? "bg-blue-500 text-white"
                        : "bg-blue-500 text-white"
                    } ${messageText ? "block" : "hidden"}`}
                  >
                    Send
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
        <div className='md:col-span-1 h-[80vh] hidden '>
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
        <div className='fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 text-blacks rounded-lg shadow-lg max-w-md w-full'>
            <h3 className='text-lg font-semibold text-black mb-2'>Join Room</h3>
            <p className='mb-2 text-black'>
              Do you want to join{" "}
              {rooms.find((r) => r.id === pendingRoomJoin)?.name}?
            </p>
            <div className='flex justify-end gap-2'>
              <button
                className='px-4 py-2 border-red-700 text-black rounded'
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
        <div className='fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center shadow-2xl justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full'>
            <h3 className='text-lg font-semibold mb-4'>Create New Room</h3>
            <div className='mb-4'>
              <label className='block text-base font-medium mb-1'>
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
                className='px-4 py-2 border text-black rounded'
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
