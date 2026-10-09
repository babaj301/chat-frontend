'use client';

import type { Room } from '../types';

interface RoomListProps {
  rooms: Room[];
  selectedRoom: string | null;
  onRoomClick: (roomId: string) => void;
  setShowCreateRoomModal: (value: boolean) => void;
  joinedRooms: Set<string>;
  isAdmin: boolean;
  userId: string;
}

export default function RoomList({
  rooms,
  selectedRoom,
  onRoomClick,
  setShowCreateRoomModal,
  joinedRooms,
  isAdmin,
  userId,
}: RoomListProps) {
  return (
    <div className="md:col-span-1 flex flex-col gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Rooms</h2>
          <button
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={() => setShowCreateRoomModal(true)}
          >
            +
          </button>
        </div>
        <div className="overflow-y-auto max-h-[65vh] space-y-2">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <button
                key={room.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedRoom === room.id
                    ? 'border-sky-500 bg-sky-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => onRoomClick(room.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{room.name}</span>
                  {!isAdmin &&
                  joinedRooms.has(room.id) &&
                  room.adminId !== userId ? (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  ) : null}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500">
              No rooms available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
