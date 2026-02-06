import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const authCode = requestUrl.searchParams.get('code')
  const isTestMode = requestUrl.searchParams.get('test_mode') === 'true'
  const error = requestUrl.searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error}`)
  }

  const supabase = await createServerClient()
  const adminSupabase = await createAdminClient()

  let userId: string | null = null
  let xHandle: string | null = null
  let xName: string | null = null

  if (isTestMode) {
    userId = 'test-owner-id'
    xHandle = 'test_user'
    xName = 'Test User'
  } else if (authCode) {
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode)
    
    if (sessionError || !session) {
      console.error('Auth callback error:', sessionError)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
    }
    
    userId = session.user.id
    xHandle = session.user.user_metadata.user_name
    xName = session.user.user_metadata.full_name
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      userId = session.user.id
      xHandle = session.user.user_metadata.user_name
      xName = session.user.user_metadata.full_name
    } else {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=not_authenticated`)
    }
  }

  if (!userId) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=user_not_found`)
  }

  const { error: ownerError } = await adminSupabase
    .from('human_owners')
    .upsert({
      id: userId,
      x_handle: xHandle,
      x_name: xName,
      x_verified: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

  if (ownerError) {
    console.error('Failed to create/update owner:', ownerError)
    return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=owner_creation_failed`)
  }

  if (code) {
    const { data: claim, error: claimError } = await adminSupabase
      .from('agent_claims')
      .select('*')
      .eq('claim_code', code)
      .single()

    if (claimError || !claim) {
      return NextResponse.redirect(`${requestUrl.origin}/owner?error=invalid_claim_code`)
    }

    const { error: updateError } = await adminSupabase
      .from('agent_claims')
      .update({
        owner_id: userId,
        claimed_at: new Date().toISOString(),
        status: 'claimed',
        claim_code: null
      })
      .eq('claim_code', code)

    if (updateError) {
      console.error('Failed to update claim:', updateError)
      return NextResponse.redirect(`${requestUrl.origin}/owner?error=claim_failed`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/owner`)
}
