'use client';

import { useRef, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { Room, Message, TypingUsers } from '../types';
import MessageItem from './MessageItem';
import VoiceMessageButton from './VoiceMessageButton';

interface ChatPanelProps {
  selectedRoom: string | null;
  rooms: Room[];
  messages: Message[];
  messageText: string;
  setMessageText: (value: string) => void;
  sendMessage: () => void;
  handleDeleteMessage: (messageId: string) => void;
  isAdmin: boolean;
  isAdminMessage: boolean;
  setIsAdminMessage: (value: boolean) => void;
  userId: string;
  username: string;
  socket: Socket | null;
  typingUsers: TypingUsers;
  onImageUpload: (file: File) => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatPanel({
  selectedRoom,
  rooms,
  messages,
  messageText,
  setMessageText,
  sendMessage,
  handleDeleteMessage,
  isAdmin,
  isAdminMessage,
  setIsAdminMessage,
  userId,
  username,
  socket,
  typingUsers,
  onImageUpload,
  messagesEndRef,
}: ChatPanelProps) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRoomData = rooms.find((room) => room.id === selectedRoom);

  const handleChange = (value: string) => {
    setMessageText(value);

    if (!socket || !selectedRoom) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('typing', {
      roomId: selectedRoom,
      username,
      isTyping: true,
    });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        roomId: selectedRoom,
        username,
        isTyping: false,
      });
    }, 2000);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await onImageUpload(file);
    event.target.value = '';
  };

  if (!selectedRoom) {
    return (
      <div className="md:col-span-3 flex flex-col h-screen rounded-3xl border border-slate-300 bg-white/80 shadow-sm">
        <div className="flex-1 rounded-3xl p-10 flex items-center justify-center text-slate-500">
          Select a room to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-3 flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {selectedRoomData?.name || 'Chat'}
          </h2>
          <p className="text-sm text-slate-500">Room conversation</p>
        </div>
        <div className="text-sm text-slate-500">
          {selectedRoomData?.adminId === userId ? 'Room Host' : 'Participant'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5 space-y-2 min-h-[70vh]">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              currentUserId={userId}
              roomAdminId={selectedRoomData?.adminId ?? null}
              isAdmin={isAdmin}
              onDelete={handleDeleteMessage}
            />
          ))
        ) : (
          <div className="flex h-full min-h-[50vh] items-center justify-center text-slate-500">
            <p>No messages yet. Start the conversation.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-slate-200 px-6 py-4">
        {Object.keys(typingUsers).length > 0 && (
          <div className="text-sm text-gray-500 italic ml-2">
            {Object.keys(typingUsers).join(', ')}{' '}
            {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {!isAdmin && selectedRoomData?.adminId === userId && (
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="adminMessage"
              checked={isAdminMessage}
              onChange={() => setIsAdminMessage(!isAdminMessage)}
              className="mr-2"
            />
            <label htmlFor="adminMessage" className="text-sm">
              Send as Admin
            </label>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner">
            <input
              type="text"
              value={messageText}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
              placeholder={`Type a message${isAdmin ? ' as Admin' : ''}...`}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm2 2v10h12V7H6zm3 2h2v2H9V9zm4 0h2v2h-2V9z" />
              </svg>
            </label>

            {socket && (
              <VoiceMessageButton
                socket={socket}
                selectedRoom={selectedRoom}
                userId={userId}
                isAdmin={isAdmin}
                isAdminMessage={isAdminMessage}
              />
            )}

            <button
              onClick={sendMessage}
              disabled={!messageText.trim()}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
