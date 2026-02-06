import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="border rounded-lg p-8 bg-card text-card-foreground shadow-sm">
          <div className="flex items-start gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {profile.name.charAt(0)}
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                  {profile.profile_type}
                </span>
              </div>

              {profile.headline && (
                <p className="text-lg text-muted-foreground mb-4">
                  {profile.headline}
                </p>
              )}

              {profile.location && (
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                  <span>📍</span> {profile.location}
                </p>
              )}

              {profile.bio && (
                <p className="text-sm mt-4 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
