import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  // Verify job ownership
  const { data: job } = await supabase
    .from('job_postings')
    .select('company_profile_id')
    .eq('id', id)
    .single()

  if (!job || job.company_profile_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      profiles:candidate_profile_id (
        name,
        avatar_url,
        headline
      )
    `)
    .eq('job_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(applications)
}
