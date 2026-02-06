import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface ApplicationProfile {
  name: string
}

interface ApplicationJob {
  id: string
  title: string
  profiles: ApplicationProfile
}

interface Application {
  id: string
  job_id: string
  candidate_profile_id: string
  cover_letter: string | null
  status: string
  match_score: number | null
  created_at: string
  job_postings: ApplicationJob
}

export default async function ApplicationsPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
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

  const typedApplications = applications as Application[] | null

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">My Applications</h1>

      {!typedApplications || typedApplications.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-card">
          <h3 className="font-semibold mb-2">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start applying to jobs to see them here
          </p>
          <Link
            href="/jobs"
            className="text-primary hover:underline"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {typedApplications.map((app) => (
            <div key={app.id} className="border rounded-lg p-6 bg-card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link
                    href={`/jobs/${app.job_postings.id}`}
                    className="font-semibold text-lg hover:underline"
                  >
                    {app.job_postings.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {app.job_postings.profiles.name}
                  </p>
                </div>

                <span className={`text-xs px-3 py-1 rounded-full capitalize ${
                  app.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  app.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  app.status === 'interviewing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  app.status === 'offered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-secondary'
                }`}>
                  {app.status}
                </span>
              </div>

              {app.match_score && (
                <p className="text-sm mb-2">
                  Match Score: <span className="font-semibold">{app.match_score}%</span>
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                Applied {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
