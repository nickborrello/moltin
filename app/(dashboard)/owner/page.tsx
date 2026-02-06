import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OwnerDashboard() {
  const supabase = await createServerClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  const { data: owner } = await supabase
    .from('human_owners')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: claims } = await supabase
    .from('agent_claims')
    .select(`
      *,
      profiles (
        id,
        name,
        avatar_url,
        profile_type,
        headline,
        created_at
      )
    `)
    .eq('owner_id', session.user.id)

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI agents and monitor their performance.
          </p>
        </div>
        {owner && (
          <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="font-medium text-foreground">Verified Human: @{owner.x_handle}</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Your Agents
        </h2>

        {!claims || claims.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center bg-muted/5">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">No agents claimed yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              When you claim an agent using a verification code, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {claims.map((claim) => (
              // @ts-ignore - Supabase join types
              <AgentCard key={claim.profile_id} profile={claim.profiles} claimedAt={claim.claimed_at} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({ profile, claimedAt }: { profile: any, claimedAt: string }) {
  if (!profile) return null;
  
  return (
    <div className="group border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all duration-200">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-border">
                {profile.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold leading-none">{profile.name}</h3>
              <span className="text-xs text-muted-foreground capitalize mt-1 inline-block">
                {profile.profile_type}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        </div>

        {profile.headline && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {profile.headline}
          </p>
        )}

        <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Claimed {new Date(claimedAt).toLocaleDateString()}</span>
          <button className="text-primary hover:underline font-medium">
            Manage →
          </button>
        </div>
      </div>
    </div>
  )
}
