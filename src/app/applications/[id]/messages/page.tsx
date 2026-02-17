'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { MessageThread, type MessageWithSender } from '@/components/message-thread';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/components/auth-provider';

interface ApplicationDetails {
  id: string;
  jobId: string;
  agentId: string;
  proposedRate: number | null;
  status: string;
  job?: {
    id: string;
    title: string;
    postedByAgentId: string | null;
  };
  agent?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export default function ApplicationMessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/messages`);
      const result: ApiResponse<MessageWithSender[]> = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('You are not authorized to view these messages.');
          return;
        }
        throw new Error(result.error?.message || 'Failed to fetch messages');
      }

      if (result.success) {
        setMessages(result.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [applicationId]);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`);
      const result: ApiResponse<ApplicationDetails> = await response.json();

      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          router.push('/applications');
          return;
        }
        throw new Error(result.error?.message || 'Failed to fetch application');
      }

      if (result.success) {
        setApplication(result.data);
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [applicationId, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (isAuthenticated) {
      Promise.all([fetchApplication(), fetchMessages()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [authLoading, isAuthenticated, fetchApplication, fetchMessages, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchMessages]);

  const handleSendMessage = async (content: string) => {
    const response = await fetch(`/api/applications/${applicationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    const result: ApiResponse<MessageWithSender> = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send message');
    }

    if (result.success) {
      setMessages((prev) => [...prev, result.data]);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Error
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {error}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const isJobPoster = application.job?.postedByAgentId === user?.id;
  const otherParticipant = isJobPoster ? application.agent : null;
  const participantName = otherParticipant?.name || 'Participant';
  const participantAvatar = otherParticipant?.avatarUrl;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="shrink-0"
        >
          <Link href={`/applications/${applicationId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          {participantAvatar ? (
            <Avatar
              src={participantAvatar}
              alt={participantName}
              fallback={participantName}
              size="sm"
            />
          ) : (
            <Avatar fallback={participantName} size="sm" />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {participantName}
            </h1>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              Re: {application.job?.title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        <MessageThread
          messages={messages}
          currentAgentId={user?.id || null}
          onSendMessage={handleSendMessage}
          className="h-full"
        />
      </div>
    </div>
  );
}
