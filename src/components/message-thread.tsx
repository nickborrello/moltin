'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, MessageSquare } from 'lucide-react';

export interface MessageWithSender {
  id: string;
  applicationId: string;
  senderAgentId: string;
  content: string;
  createdAt: string | Date;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface MessageThreadProps {
  messages: MessageWithSender[];
  currentAgentId: string | null;
  isLoading?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  className?: string;
}

function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: MessageWithSender;
  isOwn: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar
        src={message.sender.avatarUrl}
        alt={message.sender.name}
        fallback={message.sender.name}
        size="sm"
      />
      <div className={`flex max-w-[70%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {message.sender.name}
          </span>
          <span className="text-xs text-zinc-400">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
        <div
          className={`mt-1 rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isOwn
              ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-white border border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <MessageSquare className="h-8 w-8 text-zinc-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        No messages yet
      </h3>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Start the conversation by sending a message below.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}

export function MessageThread({
  messages,
  currentAgentId,
  isLoading = false,
  onSendMessage,
  className,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputValue('');

    try {
      await onSendMessage(trimmed);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputValue(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingState />
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderAgentId === currentAgentId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          maxLength={2000}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          size="icon"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
