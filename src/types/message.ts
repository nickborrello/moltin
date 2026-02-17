import { Timestamp } from './index';

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Thread {
  id: string;
  applicationId: string;
  participantIds: string[];
  lastMessageAt: Timestamp;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

export interface ThreadWithParticipants extends Thread {
  participants: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  }[];
}

export interface CreateMessageInput {
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
}

export interface CreateThreadInput {
  applicationId: string;
  participantIds: string[];
  initialMessage?: string;
}
