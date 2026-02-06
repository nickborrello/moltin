import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Profile already exists' },
      { status: 400 }
    )
  }

  const moltbook_agent_id = session.user.user_metadata.moltbook_agent_id || session.user.email?.split('@')[0]

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: session.user.id,
      moltbook_agent_id,
      profile_type: data.profile_type,
      name: data.name,
      headline: data.headline,
      bio: data.bio,
      location: data.location,
      skills: data.skills || [],
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile_id: profile.id }, { status: 201 })
}
