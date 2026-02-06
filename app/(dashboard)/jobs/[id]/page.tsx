import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MatchScore } from '@/components/matching/match-score'

interface JobProfile {
  id: string
  name: string
  avatar_url: string | null
  headline: string | null
}

interface Job {
  id: string
  company_profile_id: string
  title: string
  description: string
  requirements: string[] | null
  salary_min: number | null
  salary_max: number | null
  currency: string
  location: string | null
  remote: boolean
  status: string
  created_at: string
  profiles: JobProfile
}

interface MatchCandidate {
  profile_id: string
  name: string
  avatar_url: string | null
  headline: string | null
  match_score: number
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  
  const { data: job } = await supabase
    .from('job_postings')
    .select(`
      *,
      profiles:company_profile_id (
        id,
        name,
        avatar_url,
        headline
      )
    `)
    .eq('id', id)
    .single()

  if (!job) {
    notFound()
  }

  const typedJob = job as Job

  const { data: { session } } = await supabase.auth.getSession()
  const isOwner = session?.user.id === typedJob.company_profile_id

  let topMatches: MatchCandidate[] = []
  if (isOwner) {
    const { data } = await supabase.rpc('match_candidates_to_job', {
      job_id: id,
      match_limit: 5,
    })
    topMatches = data || []
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/jobs"
          className="text-sm text-muted-foreground hover:underline mb-4 inline-block"
        >
          &larr; Back to Jobs
        </Link>
        
        <div className="border rounded-lg p-8 bg-card">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              {typedJob.profiles.avatar_url ? (
                <Image
                  src={typedJob.profiles.avatar_url}
                  alt={typedJob.profiles.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {typedJob.profiles.name.charAt(0)}
                </div>
              )}
              <div>
                <Link
                  href={`/profile/${typedJob.profiles.id}`}
                  className="font-semibold hover:underline"
                >
                  {typedJob.profiles.name}
                </Link>
                {typedJob.profiles.headline && (
                  <p className="text-sm text-muted-foreground">
                    {typedJob.profiles.headline}
                  </p>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-bold">{typedJob.title}</h1>
            
            <div className="flex gap-2 mt-4 flex-wrap">
              {typedJob.remote && (
                <span className="text-xs px-2 py-1 rounded bg-secondary">
                  Remote
                </span>
              )}
              {typedJob.location && (
                <span className="text-xs px-2 py-1 rounded bg-secondary">
                  {typedJob.location}
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded capitalize ${
                typedJob.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                typedJob.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                typedJob.status === 'filled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-secondary'
              }`}>
                {typedJob.status}
              </span>
            </div>
          </div>

          {typedJob.salary_min && typedJob.salary_max && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Salary</h3>
              <p>
                ${typedJob.salary_min.toLocaleString()} - ${typedJob.salary_max.toLocaleString()} {typedJob.currency}
              </p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{typedJob.description}</p>
          </div>

          {typedJob.requirements && typedJob.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Requirements</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                {typedJob.requirements.map((req: string, i: number) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {isOwner ? (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Link
                  href={`/jobs/${typedJob.id}/edit`}
                  className="bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
                >
                  Edit Job
                </Link>
              </div>

              {topMatches && topMatches.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="font-semibold text-lg mb-4">Top Candidate Matches</h3>
                  <div className="space-y-4">
                    {topMatches.map((match) => (
                      <Link
                        key={match.profile_id}
                        href={`/profile/${match.profile_id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {match.avatar_url ? (
                            <img
                              src={match.avatar_url}
                              alt={match.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                              {match.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold">{match.name}</h4>
                            {match.headline && (
                              <p className="text-sm text-muted-foreground">{match.headline}</p>
                            )}
                          </div>
                        </div>
                        <MatchScore score={match.match_score} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : typedJob.status === 'active' && (
            <Link
              href={`/jobs/${typedJob.id}/apply`}
              className="w-full block text-center bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
            >
              Apply Now
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
