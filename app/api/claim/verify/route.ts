import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const code = formData.get('code') as string

  if (!code) {
    return NextResponse.json({ error: 'Missing claim code' }, { status: 400 })
  }

  const isTestMode = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'test'

  if (isTestMode) {
    const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/api/claim/callback`)
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('test_mode', 'true')
    
    return NextResponse.redirect(callbackUrl)
  }

  const supabase = await createAdminClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/claim/callback?code=${code}`,
    },
  })

  if (error || !data.url) {
    console.error('OAuth initiation failed:', error)
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 })
  }

  return NextResponse.redirect(data.url)
}
