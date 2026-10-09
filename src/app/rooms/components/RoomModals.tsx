'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Room } from '../types';

interface RoomModalsProps {
  showJoinModal: boolean;
  pendingRoomJoin: string | null;
  rooms: Room[];
  confirmJoinRoom: () => void;
  cancelJoinRoom: () => void;
  showCreateRoomModal: boolean;
  newRoomName: string;
  setNewRoomName: Dispatch<SetStateAction<string>>;
  handleCreateRoom: () => void;
  setShowCreateRoomModal: (value: boolean) => void;
}

export default function RoomModals({
  showJoinModal,
  pendingRoomJoin,
  rooms,
  confirmJoinRoom,
  cancelJoinRoom,
  showCreateRoomModal,
  newRoomName,
  setNewRoomName,
  handleCreateRoom,
  setShowCreateRoomModal,
}: RoomModalsProps) {
  return (
    <>
      {showJoinModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 text-blacks rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-black mb-2">Join Room</h3>
            <p className="mb-2 text-black">
              Do you want to join{' '}
              {rooms.find((r) => r.id === pendingRoomJoin)?.name}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border-red-700 text-black rounded"
                onClick={cancelJoinRoom}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={confirmJoinRoom}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateRoomModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center shadow-2xl justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg text-black font-semibold mb-4">
              Create New Room
            </h3>
            <div className="mb-4">
              <label className="block text-base text-black font-medium mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full border text-black border-black p-2 rounded"
                placeholder="Enter room name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border border-black text-black rounded"
                onClick={() => setShowCreateRoomModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
