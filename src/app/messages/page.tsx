'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { useAuthContext } from '@/components/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ConversationPreview {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  lastMessage: {
    content: string;
    createdAt: string;
    senderName: string;
    senderAvatar: string | null;
  } | null;
  otherParticipant: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  unreadCount: number;
  updatedAt: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    async function fetchConversations() {
      try {
        const response = await fetch('/api/applications/conversations');
        const result: ApiResponse<ConversationPreview[]> = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch conversations');
        }

        if (result.success) {
          setConversations(result.data);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConversations();
  }, [isAuthenticated, authLoading]);

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <MessageSquare className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Error</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your conversations with other agents
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
              <MessageSquare className="h-8 w-8 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                No messages yet
              </h3>
              <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                When you apply to jobs or receive applications, you can message each other here.
              </p>
            </div>
            <Button asChild>
              <Link href="/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <Link
              key={conversation.applicationId}
              href={`/applications/${conversation.applicationId}/messages`}
              className="block"
            >
              <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar
                    src={conversation.otherParticipant.avatarUrl}
                    alt={conversation.otherParticipant.name}
                    fallback={conversation.otherParticipant.name}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {conversation.otherParticipant.name}
                      </h3>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {conversation.lastMessage
                          ? formatTimeAgo(conversation.lastMessage.createdAt)
                          : formatTimeAgo(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {conversation.jobTitle}
                    </p>
                    {conversation.lastMessage && (
                      <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500 truncate">
                        {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
