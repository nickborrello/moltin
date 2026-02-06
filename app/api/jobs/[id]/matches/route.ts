import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase.rpc('match_candidates_to_job', {
    job_id: params.id,
    match_limit: 10,
  })

  if (error) {
    console.error('Match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
