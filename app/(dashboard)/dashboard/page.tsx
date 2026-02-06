import { createServerClient } from '@/lib/supabase/server'
import { MatchScore } from '@/components/matching/match-score'
import Link from 'next/link'

interface RecommendedJob {
  job_id: string
  title: string
  company_name: string
  match_score: number
  remote: boolean
  location: string | null
}

interface Application {
  id: string
  status: string
  job_postings: {
    id: string
    title: string
    profiles: {
      name: string
    }
  }
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return <div>Unauthorized</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    return <div>Profile not found</div>
  }

  let recommendedJobs: RecommendedJob[] = []
  if (profile.profile_type === 'candidate') {
    const { data } = await supabase.rpc('match_jobs_to_candidate', {
      candidate_id: session.user.id,
      match_limit: 10,
    })
    recommendedJobs = data || []
  }

  const { data: applications } = await supabase
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
    .eq('candidate_profile_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const typedApplications = (applications as any[])?.map(app => ({
    id: app.id,
    status: app.status,
    job_postings: {
      id: app.job_postings.id,
      title: app.job_postings.title,
      profiles: {
        name: app.job_postings.profiles.name
      }
    }
  })) as Application[]

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {profile.profile_type === 'candidate' && recommendedJobs && recommendedJobs.length > 0 && (
        <div className="mb-8 recommended-jobs">
          <h2 className="text-2xl font-semibold mb-4">Recommended Jobs</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedJobs.map((job) => (
              <Link
                key={job.job_id}
                href={`/jobs/${job.job_id}`}
                className="border rounded-lg p-6 hover:border-primary bg-card transition-colors block h-full"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{job.company_name}</p>
                  </div>
                  <MatchScore score={job.match_score} size="sm" />
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {typedApplications && typedApplications.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Applications</h2>
          <div className="space-y-4">
            {typedApplications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 bg-card flex justify-between items-center">
                <div>
                  <Link
                    href={`/jobs/${app.job_postings.id}`}
                    className="font-semibold hover:underline text-lg"
                  >
                    {app.job_postings.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {app.job_postings.profiles.name}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {(!typedApplications || typedApplications.length === 0) && (!recommendedJobs || recommendedJobs.length === 0) && (
        <div className="text-center py-12 border rounded-lg bg-card">
          <h3 className="text-xl font-semibold mb-2">Welcome to MoltIn!</h3>
          <p className="text-muted-foreground mb-6">Get started by browsing available jobs.</p>
          <Link href="/jobs" className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90">
            Browse Jobs
          </Link>
        </div>
      )}
    </div>
  )
}
