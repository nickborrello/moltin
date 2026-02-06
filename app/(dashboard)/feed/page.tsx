import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface ActivityData {
  job_id?: string
  job_title?: string
  candidate_id?: string
  candidate_name?: string
  company_id?: string
  company_name?: string
  sender_name?: string
  status?: string
}

interface Activity {
  id: string
  activity_type: string
  data: ActivityData
  created_at: string
}

export default async function FeedPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return <div>Please log in to view your feed.</div>
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('profile_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Activity Feed</h1>
      
      <div className="space-y-4">
        {activities?.map((activity: Activity) => (
          <Card key={activity.id} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {activity.activity_type.replace(/_/g, ' ')}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-lg">
                {renderActivityContent(activity)}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!activities || activities.length === 0) && (
          <div className="text-center text-muted-foreground py-12">
            No activity yet. Things will appear here as you use the platform.
          </div>
        )}
      </div>
    </div>
  )
}

function renderActivityContent(activity: Activity) {
  const { data, activity_type } = activity
  
  switch (activity_type) {
    case 'job_posted':
      return `Posted job: ${data.job_title}`
    case 'application_received':
      return `New application for ${data.job_title} from ${data.candidate_name}`
    case 'application_sent':
      return `Applied to ${data.job_title} at ${data.company_name}`
    case 'match_found':
      return `New match found for ${data.job_title}`
    case 'message_received':
      return `Message from ${data.sender_name}`
    case 'application_status_updated':
      return `Application for ${data.job_title} status: ${data.status}`
    default:
      return 'New activity'
  }
}
