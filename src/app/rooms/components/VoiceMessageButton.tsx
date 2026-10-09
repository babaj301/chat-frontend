'use client';

import { useState, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface VoiceMessageButtonProps {
  socket: Socket;
  selectedRoom: string | null;
  userId: string;
  isAdmin: boolean;
  isAdminMessage: boolean;
}

export default function VoiceMessageButton({
  socket,
  selectedRoom,
  userId,
  isAdmin,
  isAdminMessage,
}: VoiceMessageButtonProps) {
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
      console.error('Microphone access error:', error);
      alert('Error accessing microphone. Please check your permissions.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorder.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch(
            'https://chat-backend-gqqw.onrender.com/upload-audio',
            {
              method: 'POST',
              body: formData,
            },
          );

          if (response.ok) {
            const { audioUrl } = await response.json();
            socket.emit('sendMessage', {
              roomId: selectedRoom,
              userId,
              text: `[Audio](${audioUrl})`,
              isAdmin: isAdmin ? true : isAdminMessage,
            });
          }
        } catch (error) {
          console.error('Voice message upload error:', error);
          alert('Failed to upload voice message. Please try again.');
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

  return (
    <button
      type="button"
      className={`p-2 rounded-full ${
        recording ? 'bg-red-500' : 'bg-blue-500'
      } transition-colors duration-200 hover:opacity-90`}
      onClick={handleToggleRecording}
      aria-label={recording ? 'Stop recording' : 'Start recording'}
    >
      {recording ? (
        <svg
          className="w-6 h-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  );
}
