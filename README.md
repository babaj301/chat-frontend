# Chat Frontend

A Next.js chat application frontend that connects to a Socket.IO backend for real-time chat rooms.

## Features

- User login with optional admin access
- Room list with join confirmation and remembered joined rooms
- Real-time messages via Socket.IO
- Image uploads in chat
- Voice message recording and upload
- Admin message mode and message deletion
- Simple debug log for socket activity

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Socket.IO Client
- React Icons

## Project structure

- `src/app/rooms/page.tsx` — main chat page and state container
- `src/app/rooms/components/` — reusable UI components
- `src/app/rooms/types.ts` — shared room, user, and message types
- `src/context/SocketContext.tsx` — socket connection provider

## Setup

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
```

## Notes

This frontend expects a compatible backend API running at `https://chat-backend-gqqw.onrender.com` for:

- `/rooms` — room list
- `/users` — user login
- `/upload` — image upload
- `/upload-audio` — voice upload

If the backend URL changes, update the fetch endpoints in `src/app/rooms/page.tsx` and `src/app/rooms/components/VoiceMessageButton.tsx`.
