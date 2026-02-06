import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applicationRateLimit } from '@/lib/ratelimit'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check profile type
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.profile_type !== 'candidate') {
    return NextResponse.json(
      { error: 'Only candidate profiles can apply to jobs' },
      { status: 403 }
    )
  }

  // Rate limiting: 50 applications per day
  const { success, remaining } = await applicationRateLimit.limit(session.user.id)
  
  if (!success) {
    return NextResponse.json(
      { 
        error: 'rate_limit_exceeded',
        message: 'Maximum 50 applications per day',
        remaining
      },
      { status: 429 }
    )
  }

  const { cover_letter } = await request.json()

  // Check for duplicate application
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', id)
    .eq('candidate_profile_id', session.user.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'already_applied', message: 'You have already applied to this job' },
      { status: 409 }
    )
  }

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      job_id: id,
      candidate_profile_id: session.user.id,
      cover_letter,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ application_id: application.id }, { status: 201 })
}
