"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Conversation, Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Send, User } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function MessagesClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          
          const convId = searchParams.get('id');
          if (convId) {
            const initialConv = data.find((c: Conversation) => c.id === convId);
            if (initialConv) setActiveConversation(initialConv);
          }
        }
      }
      setLoading(false);
    };

    fetchUserAndConversations();
  }, []);

  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      const res = await fetch(`/api/conversations/${activeConversation.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      }
    };

    fetchMessages();

    const channel = supabase.channel(`conversation:${activeConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversation.id}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        
        setConversations(prev => prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, last_message: newMessage, updated_at: newMessage.created_at }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation || messageInput.length > 4000) return;

    setSending(true);
    const content = messageInput;
    setMessageInput('');

    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error(error);
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser) return null;
    return conversation.participants.find(p => p.id !== currentUser.id);
  };

  if (loading) return <div className="p-8 text-center">Loading messages...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col bg-card",
        activeConversation ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b font-semibold text-lg">Messages</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-muted-foreground text-center">No conversations yet</div>
          ) : (
            conversations.map(conv => {
              const otherUser = getOtherParticipant(conv);
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    router.push(`/messages?id=${conv.id}`, { scroll: false });
                  }}
                  className={cn(
                    "p-4 border-b cursor-pointer hover:bg-accent transition-colors",
                    activeConversation?.id === conv.id ? "bg-accent" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {otherUser?.avatar_url ? (
                        <img src={otherUser.avatar_url} alt={otherUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{otherUser?.name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {conv.last_message?.content || 'Start a conversation'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col h-full bg-background",
        !activeConversation ? "hidden md:flex" : "flex"
      )}>
        {activeConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-card shadow-sm z-10">
              <button 
                className="md:hidden text-sm text-muted-foreground"
                onClick={() => {
                  setActiveConversation(null);
                  router.push('/messages', { scroll: false });
                }}
              >
                ← Back
              </button>
              <div className="font-semibold text-lg">
                {getOtherParticipant(activeConversation)?.name}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_profile_id === currentUser?.id;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-lg text-sm break-words",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  disabled={sending}
                  maxLength={4000}
                />
                <button 
                  type="submit" 
                  disabled={!messageInput.trim() || sending}
                  className="p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {messageInput.length}/4000
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
