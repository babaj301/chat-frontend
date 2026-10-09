'use client';

import Image from 'next/image';
import { MdDeleteOutline } from 'react-icons/md';
import type { Message } from '../types';

interface MessageItemProps {
  msg: Message;
  currentUserId: string;
  roomAdminId: string | null;
  isAdmin: boolean;
  onDelete: (messageId: string) => void;
}

export default function MessageItem({
  msg,
  currentUserId,
  roomAdminId,
  isAdmin,
  onDelete,
}: MessageItemProps) {
  const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;
  const timeLabel = createdAt
    ? createdAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const isCurrentUser = msg.userId === currentUserId;
  const alignmentClass = msg.isSystem
    ? 'justify-center'
    : isCurrentUser
      ? 'justify-end'
      : 'justify-start';
  const bubbleClass = msg.isSystem
    ? 'bg-slate-100 text-slate-500 italic border border-slate-200'
    : msg.isAdmin
      ? 'bg-yellow-50 border border-yellow-300 text-slate-900'
      : isCurrentUser
        ? 'bg-sky-600 text-white'
        : 'bg-white border border-slate-200 text-slate-900';
  const audioRegex = /^\[Audio\]\((.*)\)$/;
  const imageRegex = /^\[Image\]\((.*)\)$/;

  const renderMessage = () => {
    const audioMatch = audioRegex.exec(msg.text);
    if (audioMatch) {
      return (
        <audio controls className="max-w-full">
          <source src={audioMatch[1]} type="audio/mpeg" />
        </audio>
      );
    }

    const imageMatch = imageRegex.exec(msg.text);
    if (imageMatch) {
      return (
        <Image
          src={imageMatch[1]}
          alt="Shared in chat"
          width={320}
          height={240}
          className="max-w-xs max-h-60 rounded object-contain"
        />
      );
    }

    return msg.text;
  };

  const canDelete =
    msg.userId === currentUserId || isAdmin || roomAdminId === currentUserId;

  return (
    <div className={`flex ${alignmentClass} mb-3 px-2`}>
      <div
        className={`rounded-3xl flex flex-col p-4 shadow-sm max-w-[85%] ${bubbleClass}`}
      >
        {!msg.isSystem ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span
              className={`rounded-full px-2 py-1 ${
                isCurrentUser
                  ? 'bg-sky-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {msg.user?.name || 'Unknown'}
            </span>
            {msg.isAdmin && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                ADMIN
              </span>
            )}
            {timeLabel && (
              <span className="ml-auto text-[11px] text-white">
                {timeLabel}
              </span>
            )}
          </div>
        ) : null}

        <div className="space-y-3 break-words text-sm">{renderMessage()}</div>

        {canDelete && !msg.isSystem && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => onDelete(msg.id)}
              className="rounded-full p-1 text-slate-400 transition hover:text-red-600"
              aria-label="Delete message"
            >
              <MdDeleteOutline />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
