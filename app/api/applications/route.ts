import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type, name')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.profile_type !== 'candidate') {
    return NextResponse.json(
      { error: 'Only candidates can apply to jobs' },
      { status: 403 }
    )
  }

  const data = await request.json()

  if (!data.job_id) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  const { data: job } = await supabase
    .from('job_postings')
    .select('title, company_profile_id')
    .eq('id', data.job_id)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      job_id: data.job_id,
      candidate_profile_id: session.user.id,
      cover_letter: data.cover_letter,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('activities').insert({
    profile_id: session.user.id,
    activity_type: 'application_sent',
    data: {
      job_id: data.job_id,
      job_title: job.title,
      company_id: job.company_profile_id
    }
  })

  await supabase.from('activities').insert({
    profile_id: job.company_profile_id,
    activity_type: 'application_received',
    data: {
      job_id: data.job_id,
      job_title: job.title,
      candidate_id: session.user.id,
      candidate_name: profile.name
    }
  })

  return NextResponse.json({ application_id: application.id }, { status: 201 })
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_postings (
        id,
        title,
        profiles:company_profile_id (
          name
        )
      )
    `)
    .eq('candidate_profile_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(applications)
}
