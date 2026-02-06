import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MatchScore } from '@/components/matching/match-score'

interface JobWithProfile {
  id: string
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
  profiles: {
    name: string
    avatar_url: string | null
  }
}

interface JobWithMatch extends JobWithProfile {
  match_score?: number | null
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const supabase = await createServerClient()
  const params = await searchParams
  const sortBy = params.sort || 'recent'
  
  const { data: jobs } = await supabase
    .from('job_postings')
    .select(`
      *,
      profiles:company_profile_id (
        name,
        avatar_url
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: { session } } = await supabase.auth.getSession()

  let jobsWithMatches: JobWithMatch[] = (jobs as JobWithProfile[]) || []

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.profile_type === 'candidate') {
      const { data: matches } = await supabase.rpc('match_jobs_to_candidate', {
        candidate_id: session.user.id,
        match_limit: 100,
      })

      jobsWithMatches = jobsWithMatches.map((job) => {
        const match = matches?.find((m: any) => m.job_id === job.id)
        return {
          ...job,
          match_score: match?.match_score || null,
        }
      })
    }
  }

  if (sortBy === 'match') {
    jobsWithMatches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Job Postings</h1>
        <Link
          href="/jobs/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          Post a Job
        </Link>
      </div>

      <div className="mb-8 flex gap-4 items-center">
        <label className="text-sm font-medium">Sort by:</label>
        <form className="flex gap-2">
          <Link 
            href="/jobs?sort=recent" 
            className={`px-3 py-1 rounded-md text-sm border ${sortBy === 'recent' ? 'bg-secondary' : 'hover:bg-muted'}`}
          >
            Most Recent
          </Link>
          <Link 
            href="/jobs?sort=match" 
            className={`px-3 py-1 rounded-md text-sm border ${sortBy === 'match' ? 'bg-secondary' : 'hover:bg-muted'}`}
          >
            Best Match
          </Link>
        </form>
      </div>

      {!jobsWithMatches || jobsWithMatches.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-card">
          <h3 className="font-semibold mb-2">No jobs posted yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to post a job!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobsWithMatches.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="border rounded-lg p-6 hover:border-primary bg-card transition-colors job-card"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    {typeof job.match_score === 'number' && (
                      <MatchScore score={job.match_score} size="sm" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.profiles?.name}
                  </p>
                  <p className="text-sm mt-2 line-clamp-2">{job.description}</p>
                  
                  <div className="flex gap-2 mt-4">
                    {job.remote && (
                      <span className="text-xs px-2 py-1 rounded bg-secondary">
                        Remote
                      </span>
                    )}
                    {job.location && (
                      <span className="text-xs px-2 py-1 rounded bg-secondary">
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>

                {job.salary_min && job.salary_max && (
                  <div className="text-right">
                    <p className="font-semibold">
                      ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.currency}</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
