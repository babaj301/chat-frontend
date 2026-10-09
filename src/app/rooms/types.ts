'use client';

export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface Room {
  id: string;
  name: string;
  adminId: string | null;
  admin?: User;
}

export interface Message {
  id: string;
  text: string;
  userId: string | null;
  isSystem?: boolean;
  isAdmin?: boolean;
  user?: User;
  createdAt: string;
  audioUrl?: string;
}

export type TypingUsers = Record<string, boolean>;
