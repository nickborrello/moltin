import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../../../app/api/jobs/route'
import * as jobIdRoute from '../../../app/api/jobs/[id]/route'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockOrder = vi.fn()
const mockIlike = vi.fn()
const mockGetSession = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getSession: mockGetSession,
    },
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }),
  }),
}))

vi.mock('@/lib/ratelimit', () => ({
  jobPostRateLimit: {
    limit: mockRateLimit,
  },
}))

describe('Job Posting API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ 
      single: mockSingle, 
      order: mockOrder,
      eq: mockEq,
      ilike: mockIlike,
    })
    mockOrder.mockReturnValue({ data: [], error: null })
    mockIlike.mockReturnValue({ order: mockOrder })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mockSingle }) }) })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockRateLimit.mockResolvedValue({ success: true, remaining: 9 })
  })

  describe('POST /api/jobs', () => {
    it('should allow company to create job', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'company' } })
      mockSingle.mockResolvedValueOnce({ data: { id: 'job-123' }, error: null })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Senior AI Engineer',
          description: 'Build amazing AI products',
          requirements: ['5+ years experience', 'Python expertise'],
          salary_min: 150000,
          salary_max: 200000,
          remote: true,
        }),
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.job_id).toBe('job-123')
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        company_profile_id: 'company-123',
        title: 'Senior AI Engineer',
        status: 'active',
      }))
    })

    it('should prevent candidate from creating job', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'candidate-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'candidate' } })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Job',
          description: 'Test description',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(403)
      
      const data = await res.json()
      expect(data.error).toBe('Only company profiles can post jobs')
    })

    it('should enforce rate limit of 10 posts per hour', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'company' } })
      mockRateLimit.mockResolvedValue({ success: false, remaining: 0 })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Job',
          description: 'Test description',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(429)

      const data = await res.json()
      expect(data.error).toBe('rate_limit_exceeded')
    })

    it('should reject unauthorized requests', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('should validate required fields', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'company' } })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Job',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('should support all job statuses', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'company' } })
      mockSingle.mockResolvedValueOnce({ data: { id: 'job-123' }, error: null })

      const req = new Request('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Draft Job',
          description: 'Not ready yet',
          status: 'draft',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'draft',
      }))
    })
  })

  describe('GET /api/jobs', () => {
    it('should list active jobs', async () => {
      mockOrder.mockResolvedValue({ 
        data: [
          { id: 'job-1', title: 'Job 1', status: 'active' },
          { id: 'job-2', title: 'Job 2', status: 'active' },
        ], 
        error: null 
      })

      const req = new Request('http://localhost/api/jobs')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should filter by remote', async () => {
      mockEq.mockReturnValue({ 
        eq: mockEq,
        order: mockOrder,
        ilike: mockIlike,
      })
      mockOrder.mockResolvedValue({ data: [], error: null })

      const req = new Request('http://localhost/api/jobs?remote=true')
      await GET(req)

      expect(mockEq).toHaveBeenCalledWith('remote', true)
    })
  })

  describe('PATCH /api/jobs/[id]', () => {
    it('should allow owner to update job status', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })
      mockSingle.mockResolvedValueOnce({ 
        data: { id: 'job-123', status: 'filled' }, 
        error: null 
      })

      const req = new Request('http://localhost/api/jobs/job-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'filled' }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await jobIdRoute.PATCH(req, { params })
      
      expect(res.status).toBe(200)
    })

    it('should reject non-owner updates', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'other-user' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })

      const req = new Request('http://localhost/api/jobs/job-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'filled' }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await jobIdRoute.PATCH(req, { params })
      
      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /api/jobs/[id]', () => {
    it('should allow owner to delete job', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })
      mockDelete.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) })

      const req = new Request('http://localhost/api/jobs/job-123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await jobIdRoute.DELETE(req, { params })
      
      expect(res.status).toBe(200)
    })

    it('should reject non-owner deletes', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'other-user' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })

      const req = new Request('http://localhost/api/jobs/job-123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await jobIdRoute.DELETE(req, { params })
      
      expect(res.status).toBe(401)
    })
  })
})
