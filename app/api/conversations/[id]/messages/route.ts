import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: participation, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', id)
    .eq('profile_id', user.id)
    .single();

  if (partError || !participation) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(messages);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await request.json();

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  if (content.length > 4000) {
    return NextResponse.json({ error: "Message exceeds 4000 characters" }, { status: 400 });
  }

  const { data: participation, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', id)
    .eq('profile_id', user.id)
    .single();

  if (partError || !participation) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      sender_profile_id: user.id,
      content
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json(message);
}
