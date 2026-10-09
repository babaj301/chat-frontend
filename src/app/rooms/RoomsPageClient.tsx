'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import RoomList from './components/RoomList';
import ChatPanel from './components/ChatPanel';
import RoomModals from './components/RoomModals';
import type { Message, Room } from './types';

export default function RoomsPageClient() {
  const { socket, isConnected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomJoin, setPendingRoomJoin] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isAdminMessage, setIsAdminMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const savedRooms = localStorage.getItem('joinedRooms');
      return savedRooms ? new Set(JSON.parse(savedRooms)) : new Set();
    }
    return new Set();
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('chat-user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUserId(parsedUser.id);
    setUsername(parsedUser.username || '');
    setIsAdmin(Boolean(parsedUser.isAdmin));
    setIsAdminMessage(Boolean(parsedUser.isAdmin));
  }, []);

  const addDebugLog = (message: string) => {
    setDebugLog((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    if (userId && joinedRooms.size > 0) {
      localStorage.setItem(
        `joinedRooms_${userId}`,
        JSON.stringify([...joinedRooms]),
      );
    }
  }, [joinedRooms, userId]);

  useEffect(() => {
    if (userId && typeof window !== 'undefined') {
      const savedRooms = localStorage.getItem(`joinedRooms_${userId}`);
      if (savedRooms) {
        setJoinedRooms(new Set(JSON.parse(savedRooms)));
        addDebugLog(
          `Loaded ${JSON.parse(savedRooms).length} previously joined rooms from storage`,
        );
      }
    }
  }, [userId]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        addDebugLog('Fetching rooms...');
        const response = await fetch(
          'https://chat-backend-gqqw.onrender.com/rooms',
        );
        if (!response.ok)
          throw new Error(`Failed to fetch rooms: ${response.status}`);

        const data = await response.json();
        setRooms(data);
        addDebugLog(`Received ${data.length} rooms`);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        addDebugLog(
          `Error fetching rooms: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    if (!socket) {
      addDebugLog('Socket not initialized');
      return;
    }

    addDebugLog(`Socket connected: ${isConnected}`);

    socket.on('roomJoined', (data) => {
      addDebugLog(`Joined room: ${data.room.name}`);
      addDebugLog(`Received ${data.messages.length} messages`);
      setMessages(data.messages);
      setJoinedRooms((prev) => {
        const next = new Set(prev);
        next.add(data.room.id);
        return next;
      });
    });

    socket.on('newMessage', (message) => {
      addDebugLog(`New message received: ${message.text.substring(0, 20)}...`);
      setMessages((prev) => [...prev, message]);
    });

    socket.on('messageDeleted', ({ messageId }) => {
      addDebugLog(`Message deleted: ${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    socket.on('roomCreated', (room) => {
      addDebugLog(`New room created: ${room.name}`);
      setRooms((prev) => [room, ...prev]);
    });

    socket.on('roomCreationSuccess', (room) => {
      addDebugLog(`You created room: ${room.name}`);
      setShowCreateRoomModal(false);
      setNewRoomName('');
      setJoinedRooms((prev) => {
        const next = new Set(prev);
        next.add(room.id);
        return next;
      });
    });

    socket.on('error', (error) => {
      addDebugLog(`Socket error: ${error}`);
      alert(`Error: ${error}`);
    });

    socket.on('userTyping', ({ username: typingUser, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[typingUser] = true;
        } else {
          delete next[typingUser];
        }
        return next;
      });
    });

    return () => {
      socket.off('roomJoined');
      socket.off('newMessage');
      socket.off('roomCreated');
      socket.off('messageDeleted');
      socket.off('roomCreationSuccess');
      socket.off('error');
      socket.off('userTyping');
    };
  }, [socket, isConnected, username, joinedRooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !userId) {
      addDebugLog('Cannot delete message: Missing required data');
      return;
    }

    addDebugLog(`Deleting message ${messageId}...`);
    socket.emit('deleteMessage', { messageId, userId });
  };

  const initiateJoinRoom = (roomId: string) => {
    setPendingRoomJoin(roomId);
    setShowJoinModal(true);
  };

  const joinRoom = (roomId: string) => {
    if (!socket) return;

    addDebugLog(`Joining room ${roomId}...`);
    setSelectedRoom(roomId);
    setMessages([]);
    socket.emit('joinRoom', { roomId, userId, username });
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
      addDebugLog('Cannot create room: Missing room name');
      return;
    }

    addDebugLog(`Creating room ${newRoomName}...`);
    socket.emit('createRoom', {
      name: newRoomName,
      adminId: isAdmin ? userId : null,
    });
  };

  const handleRoomClick = (roomId: string) => {
    if (isAdmin) {
      joinRoom(roomId);
      return;
    }

    if (joinedRooms.has(roomId)) {
      addDebugLog(`Rejoining previously joined room ${roomId}`);
      joinRoom(roomId);
      return;
    }

    initiateJoinRoom(roomId);
  };

  const sendMessage = () => {
    if (!socket || !selectedRoom || messageText.trim() === '' || !userId) {
      addDebugLog('Cannot send message: Missing required data');
      return;
    }

    const sendAsAdmin = isAdmin ? true : isAdminMessage;
    addDebugLog(
      `Sending message to room ${selectedRoom}${sendAsAdmin ? ' as admin' : ''}...`,
    );

    socket.emit('sendMessage', {
      roomId: selectedRoom,
      userId,
      text: messageText,
      isAdmin: sendAsAdmin,
    });

    setMessageText('');
  };

  const handleImageUpload = async (file: File) => {
    if (!socket || !selectedRoom || !userId) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(
        'https://chat-backend-gqqw.onrender.com/upload',
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status}`);
      }

      const { imageUrl } = await response.json();
      socket.emit('sendMessage', {
        roomId: selectedRoom,
        userId,
        text: `[Image](${imageUrl})`,
        isAdmin: isAdmin ? true : isAdminMessage,
      });
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                Chatty Rooms
              </h1>
              <p className="text-sm text-slate-500">
                A clean real-time chat interface for rooms, images, and audio.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {isConnected ? 'Connected' : 'Disconnected'} · Logged in as{' '}
              <span className="font-semibold text-slate-900">{username}</span>
              {isAdmin && (
                <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <RoomList
            rooms={rooms}
            selectedRoom={selectedRoom}
            onRoomClick={handleRoomClick}
            setShowCreateRoomModal={setShowCreateRoomModal}
            joinedRooms={joinedRooms}
            isAdmin={isAdmin}
            userId={userId}
          />

          <ChatPanel
            selectedRoom={selectedRoom}
            rooms={rooms}
            messages={messages}
            messageText={messageText}
            setMessageText={setMessageText}
            sendMessage={sendMessage}
            handleDeleteMessage={handleDeleteMessage}
            isAdmin={isAdmin}
            isAdminMessage={isAdminMessage}
            setIsAdminMessage={setIsAdminMessage}
            userId={userId}
            username={username}
            socket={socket}
            typingUsers={typingUsers}
            onImageUpload={handleImageUpload}
            messagesEndRef={messagesEndRef}
          />

          <div className="md:col-span-1 h-[80vh] hidden">
            <h2 className="text-lg font-semibold mb-2">Debug Log</h2>
            <div className="border rounded h-80 overflow-y-auto p-2 text-xs font-mono">
              {debugLog.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        <RoomModals
          showJoinModal={showJoinModal && !isAdmin}
          pendingRoomJoin={pendingRoomJoin}
          rooms={rooms}
          confirmJoinRoom={confirmJoinRoom}
          cancelJoinRoom={cancelJoinRoom}
          showCreateRoomModal={showCreateRoomModal}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          handleCreateRoom={handleCreateRoom}
          setShowCreateRoomModal={setShowCreateRoomModal}
        />
      </div>
    </div>
  );
}
