import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedPage from '@/app/(dashboard)/feed/page'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn()
}))

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago'
}))

vi.mock('@/components/ui/card', () => ({
  Card: (props: any) => <div {...props} />,
  CardHeader: (props: any) => <div {...props} />,
  CardTitle: (props: any) => <h3 {...props} />,
  CardContent: (props: any) => <div {...props} />
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: (props: any) => <span {...props} />
}))

describe('FeedPage', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServerClient as any).mockReturnValue(mockSupabase)
  })

  it('renders "Please log in" when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    const result = await FeedPage()
    
    expect(result.props.children).toContain('Please log in')
  })

  it('fetches activities for authenticated user', async () => {
    const mockSession = { user: { id: 'user-123' } }
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } })
    
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue({ 
      data: [
        {
          id: '1',
          activity_type: 'job_posted',
          created_at: '2026-01-01',
          data: { job_title: 'Software Engineer' }
        }
      ] 
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit
    })

    await FeedPage()

    expect(mockSupabase.from).toHaveBeenCalledWith('activities')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('profile_id', 'user-123')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(20)
  })
})
