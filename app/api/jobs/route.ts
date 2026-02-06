import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jobPostRateLimit } from '@/lib/ratelimit'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(request.url)
  
  const remote = searchParams.get('remote')
  const location = searchParams.get('location')
  const status = searchParams.get('status')

  let query = supabase
    .from('job_postings')
    .select(`
      *,
      profiles:company_profile_id (
        name,
        avatar_url
      )
    `)

  if (!status) {
    query = query.eq('status', 'active')
  } else {
    query = query.eq('status', status)
  }

  if (remote === 'true') {
    query = query.eq('remote', true)
  }

  if (location) {
    query = query.ilike('location', `%${location}%`)
  }

  const { data: jobs, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.profile_type !== 'company') {
    return NextResponse.json(
      { error: 'Only company profiles can post jobs' },
      { status: 403 }
    )
  }

  const { success, remaining } = await jobPostRateLimit.limit(session.user.id)
  
  if (!success) {
    return NextResponse.json(
      { 
        error: 'rate_limit_exceeded',
        message: 'Maximum 10 job posts per hour',
        remaining
      },
      { status: 429 }
    )
  }

  const data = await request.json()

  if (!data.title || !data.description) {
    return NextResponse.json(
      { error: 'Title and description are required' },
      { status: 400 }
    )
  }

  const validStatuses = ['draft', 'active', 'paused', 'filled', 'closed']
  if (data.status && !validStatuses.includes(data.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const { data: job, error } = await supabase
    .from('job_postings')
    .insert({
      company_profile_id: session.user.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements || [],
      salary_min: data.salary_min || null,
      salary_max: data.salary_max || null,
      currency: data.currency || 'USD',
      location: data.location || null,
      remote: data.remote || false,
      status: data.status || 'active',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ job_id: job.id }, { status: 201 })
}
