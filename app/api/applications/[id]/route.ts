import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const validStatuses = ['submitted', 'reviewed', 'interviewing', 'offered', 'rejected']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json()

  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  // Verify authorization (company owns the job OR candidate owns application)
  const { data: application } = await supabase
    .from('applications')
    .select('candidate_profile_id, job_postings(company_profile_id)')
    .eq('id', id)
    .single()

  if (!application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  type ApplicationWithJob = {
    candidate_profile_id: string
    job_postings: { company_profile_id: string }
  }

  const typedApp = application as ApplicationWithJob
  const isCandidate = typedApp.candidate_profile_id === session.user.id
  const isCompany = typedApp.job_postings.company_profile_id === session.user.id

  if (!isCandidate && !isCompany) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: updated, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: application, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error || !application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify authorization
  type ApplicationWithJob = {
    candidate_profile_id: string
    job_postings: { profiles: { company_profile_id?: string } }
  }

  const typedApp = application as ApplicationWithJob
  const isCandidate = typedApp.candidate_profile_id === session.user.id
  
  if (!isCandidate) {
    // Check if company owns the job
    const { data: job } = await supabase
      .from('job_postings')
      .select('company_profile_id')
      .eq('id', application.job_id)
      .single()

    if (!job || job.company_profile_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.json(application)
}
