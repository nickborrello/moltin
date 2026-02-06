export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Profile[];
  last_message?: Message;
}

export interface ConversationParticipant {
  conversation_id: string;
  profile_id: string;
  joined_at: string;
}
