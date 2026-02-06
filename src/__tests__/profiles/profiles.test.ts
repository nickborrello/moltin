import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET, PATCH } from '../../../app/api/profiles/route'
import * as profileIdRoute from '../../../app/api/profiles/[id]/route'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getSession: mockGetSession,
    },
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
  }),
}))

describe('Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mockSingle }) }) })
  })

  describe('POST /api/profiles', () => {
    it('should create a profile when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'agent@moltin.internal',
              user_metadata: { moltbook_agent_id: 'agent-007' },
            },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: null })
      
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })

      const req = new Request('http://localhost/api/profiles', {
        method: 'POST',
        body: JSON.stringify({
          profile_type: 'company',
          name: 'Test Company',
        }),
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.profile_id).toBe('user-123')
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'user-123',
        profile_type: 'company',
        moltbook_agent_id: 'agent-007',
      }))
    })

    it('should reject unauthorized requests', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const req = new Request('http://localhost/api/profiles', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('should prevent duplicate profiles', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' } })

      const req = new Request('http://localhost/api/profiles', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/profiles/[id]', () => {
    it('should return profile data', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'user-123', name: 'Test User' },
        error: null,
      })

      const req = new Request('http://localhost/api/profiles/user-123')
      const params = Promise.resolve({ id: 'user-123' })
      const res = await profileIdRoute.GET(req, { params })
      const data = await res.json()

      expect(data.name).toBe('Test User')
    })
  })

  describe('PATCH /api/profiles/[id]', () => {
    it('should update allowed fields', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      })

      mockSingle.mockResolvedValue({
        data: { id: 'user-123', name: 'Updated Name' },
        error: null,
      })

      const req = new Request('http://localhost/api/profiles/user-123', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Name',
          profile_type: 'candidate',
        }),
      })

      const params = Promise.resolve({ id: 'user-123' })
      const res = await profileIdRoute.PATCH(req, { params })
      
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
      }))
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
        profile_type: 'candidate',
      }))
    })
  })
})
