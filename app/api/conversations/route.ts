import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      updated_at,
      conversation_participants!inner(profile_id),
      participants:conversation_participants(
        profiles(id, name, avatar_url, headline)
      ),
      messages(
        id,
        content,
        created_at,
        sender_profile_id
      )
    `)
    .eq('conversation_participants.profile_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedConversations = conversations.map(conv => ({
    id: conv.id,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    participants: conv.participants.map((p: any) => p.profiles),
    last_message: conv.messages?.[0] || null
  }));

  return NextResponse.json(formattedConversations);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participant_id } = await request.json();

  if (!participant_id) {
    return NextResponse.json({ error: "Participant ID required" }, { status: 400 });
  }

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, profile_id: user.id },
      { conversation_id: conversation.id, profile_id: participant_id }
    ]);

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  return NextResponse.json(conversation);
}
