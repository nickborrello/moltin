import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/jobs/[id]/apply/route'
import { GET as getApplications } from '@/app/api/applications/route'
import { GET as getJobApplications } from '@/app/api/jobs/[id]/applications/route'
import * as applicationIdRoute from '@/app/api/applications/[id]/route'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockOrder = vi.fn()
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
    }),
  }),
}))

vi.mock('@/lib/ratelimit', () => ({
  applicationRateLimit: {
    limit: mockRateLimit,
  },
}))

describe('Application API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
      eq: mockEq,
    })
    mockOrder.mockReturnValue({ data: [], error: null })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mockSingle }) }) })
    mockRateLimit.mockResolvedValue({ success: true, remaining: 49 })
  })

  describe('POST /api/jobs/[id]/apply', () => {
    it('should allow candidate to apply', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'candidate-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'candidate' } })
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      mockSingle.mockResolvedValueOnce({ data: { id: 'app-123' }, error: null })

      const req = new Request('http://localhost/api/jobs/job-123/apply', {
        method: 'POST',
        body: JSON.stringify({
          cover_letter: 'I am excited to apply for this position...',
        }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await POST(req, { params })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.application_id).toBe('app-123')
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        job_id: 'job-123',
        candidate_profile_id: 'candidate-123',
        status: 'submitted',
      }))
    })

    it('should prevent company from applying', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'company' } })

      const req = new Request('http://localhost/api/jobs/job-123/apply', {
        method: 'POST',
        body: JSON.stringify({
          cover_letter: 'Test',
        }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await POST(req, { params })

      expect(res.status).toBe(403)

      const data = await res.json()
      expect(data.error).toBe('Only candidate profiles can apply to jobs')
    })

    it('should prevent duplicate applications', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'candidate-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'candidate' } })
      mockSingle.mockResolvedValueOnce({ data: { id: 'existing-app' } })

      const req = new Request('http://localhost/api/jobs/job-123/apply', {
        method: 'POST',
        body: JSON.stringify({
          cover_letter: 'Test',
        }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await POST(req, { params })

      expect(res.status).toBe(409)

      const data = await res.json()
      expect(data.error).toBe('already_applied')
    })

    it('should enforce rate limit of 50 applications per day', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'candidate-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { profile_type: 'candidate' } })
      mockRateLimit.mockResolvedValue({ success: false, remaining: 0 })

      const req = new Request('http://localhost/api/jobs/job-123/apply', {
        method: 'POST',
        body: JSON.stringify({
          cover_letter: 'Test',
        }),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await POST(req, { params })

      expect(res.status).toBe(429)

      const data = await res.json()
      expect(data.error).toBe('rate_limit_exceeded')
    })

    it('should reject unauthorized requests', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const req = new Request('http://localhost/api/jobs/job-123/apply', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const params = Promise.resolve({ id: 'job-123' })
      const res = await POST(req, { params })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/applications', () => {
    it('should return candidate applications', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'candidate-123' },
          },
        },
      })

      mockOrder.mockResolvedValue({
        data: [
          { id: 'app-1', status: 'submitted' },
          { id: 'app-2', status: 'reviewed' },
        ],
        error: null,
      })

      const req = new Request('http://localhost/api/applications')
      const res = await getApplications()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should reject unauthorized requests', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const res = await getApplications()
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/jobs/[id]/applications', () => {
    it('should return job applications for company owner', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })
      mockOrder.mockResolvedValue({
        data: [
          { id: 'app-1', status: 'submitted', profiles: { name: 'Candidate A' } },
        ],
        error: null,
      })

      const req = new Request('http://localhost/api/jobs/job-123/applications')
      const params = Promise.resolve({ id: 'job-123' })
      const res = await getJobApplications(req, { params })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should reject non-owner access', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'other-company' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({ data: { company_profile_id: 'company-123' } })

      const req = new Request('http://localhost/api/jobs/job-123/applications')
      const params = Promise.resolve({ id: 'job-123' })
      const res = await getJobApplications(req, { params })

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/applications/[id]', () => {
    it('should allow company to update application status', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({
        data: {
          candidate_profile_id: 'candidate-123',
          job_postings: { company_profile_id: 'company-123' },
        },
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'app-123', status: 'reviewed' },
        error: null,
      })

      const req = new Request('http://localhost/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reviewed' }),
      })

      const params = Promise.resolve({ id: 'app-123' })
      const res = await applicationIdRoute.PATCH(req, { params })

      expect(res.status).toBe(200)
    })

    it('should reject invalid status values', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'company-123' },
          },
        },
      })

      const req = new Request('http://localhost/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid_status' }),
      })

      const params = Promise.resolve({ id: 'app-123' })
      const res = await applicationIdRoute.PATCH(req, { params })

      expect(res.status).toBe(400)
    })

    it('should reject unauthorized updates', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'other-user' },
          },
        },
      })

      mockSingle.mockResolvedValueOnce({
        data: {
          candidate_profile_id: 'candidate-123',
          job_postings: { company_profile_id: 'company-123' },
        },
      })

      const req = new Request('http://localhost/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reviewed' }),
      })

      const params = Promise.resolve({ id: 'app-123' })
      const res = await applicationIdRoute.PATCH(req, { params })

      expect(res.status).toBe(401)
    })

    it('should support all application statuses', async () => {
      const statuses = ['submitted', 'reviewed', 'interviewing', 'offered', 'rejected']
      
      for (const status of statuses) {
        mockGetSession.mockResolvedValue({
          data: {
            session: {
              user: { id: 'company-123' },
            },
          },
        })

        mockSingle.mockResolvedValueOnce({
          data: {
            candidate_profile_id: 'candidate-123',
            job_postings: { company_profile_id: 'company-123' },
          },
        })
        mockSingle.mockResolvedValueOnce({
          data: { id: 'app-123', status },
          error: null,
        })

        const req = new Request('http://localhost/api/applications/app-123', {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })

        const params = Promise.resolve({ id: 'app-123' })
        const res = await applicationIdRoute.PATCH(req, { params })

        expect(res.status).toBe(200)
      }
    })
  })
})
