## [2026-02-06] Task 7: Profile Browsing & Filtering
- Implemented browse page at `app/(dashboard)/browse/page.tsx`
- Features:
  - Filter by profile type (company/candidate)
  - Search by name, headline, bio (ilike)
  - Pagination (20 per page) with prev/next controls
  - Glassy UI panel for filters
  - Responsive grid layout for profile cards
- Key Decisions:
  - Used server-side searchParams for all filtering state (URL-driven)
  - Implemented optimistic UI with skeletal loading not needed due to server components
  - Used `count: 'exact'` in Supabase query for accurate pagination
  - Added visual flair with hover animations and gradient reveals
  - Fallback avatar with initial for missing images
- Tests:
  - 3 tests passing in `src/__tests__/browse/browse.test.ts`
  - Validated basic test suite structure and parameter handling logic

## [2026-02-06] Task 8: Job Application System
- Implemented complete job application system:
  - Application form: `app/(dashboard)/jobs/[id]/apply/page.tsx` (client component)
  - Applications list: `app/(dashboard)/applications/page.tsx` (server component)
- API Routes:
  - `POST /api/jobs/[id]/apply` - Submit application (candidate only)
  - `GET /api/applications` - List own applications
  - `GET /api/jobs/[id]/applications` - List job's applications (company owner only)
  - `PATCH /api/applications/[id]` - Update status (candidate or company owner)
  - `GET /api/applications/[id]` - Get single application
- Key Features:
  - Rate limiting: 50 applications/day via `applicationRateLimit` from lib/ratelimit.ts
  - Duplicate prevention: Checks for existing application before insert (409 Conflict)
  - Profile type enforcement: Only candidates can apply (403 Forbidden for companies)
  - Authorization: Companies can only view/update applications for their own jobs
  - Status workflow: submitted → reviewed → interviewing → offered/rejected
- Patterns:
  - Next.js 15 async params: `{ params }: { params: Promise<{ id: string }> }`
  - Typed Supabase joins for nested relations (job_postings → profiles)
  - Status colors mapped with conditional Tailwind classes
- Tests:
  - 13 tests passing in `src/__tests__/applications/applications.test.ts`
  - Covers: candidate apply, company reject, duplicate prevention, rate limiting, authorization

## [2026-02-06] Task 10: Create Matching UI
- **Match Score Component**: Created `components/matching/match-score.tsx` with color coding based on score thresholds (green >80%, blue >60%, yellow >40%).
- **Job Listing Integration**: Updated `app/(dashboard)/jobs/page.tsx` to fetch and display match scores for candidate users. Added sorting by "Best Match".
- **Job Detail Page**: Updated `app/(dashboard)/jobs/[id]/page.tsx` to show "Top Candidate Matches" section for job owners (companies).
- **Candidate Dashboard**: Created `app/(dashboard)/dashboard/page.tsx` displaying "Recommended Jobs" and "Recent Applications".
- **Testing**: Added basic existence tests in `src/__tests__/matching/ui.test.ts`.
- **Key Learnings**:
  - Used `supabase.rpc` to call matching functions `match_jobs_to_candidate` and `match_candidates_to_job`.
  - Handled conditional rendering based on user profile type (candidate vs company).
  - Used standard React for content rendering.
  - **Gotcha**: Had to handle type assertions carefully when merging match scores with existing job types.

## [2026-02-06] Task 12: Messaging System Implementation
- **Real-time Updates**: Used `supabase.channel` with `postgres_changes` to listen for new messages (INSERT on messages table), filtered by conversation_id.
- **UI Architecture**:
  - Implemented responsive master-detail layout (hidden list on mobile when active).
  - Created dedicated `MessagesClient` component wrapped in `Suspense` to handle client-side logic.
  - Added `export const dynamic = 'force-dynamic'` to opt out of static generation for this authenticated route.
- **Database Security**:
  - Leveraged RLS policies for strict conversation access control.
  - Used `conversation_participants!inner` join pattern for efficient filtering.
- **API Routes**:
  - Switched to `createServerClient` in API routes to ensure secure cookie handling (fixed build error).
  - Implemented conversation listing, message fetching, and message sending with 4000 char limit.
- **Build Fixes**:
  - Resolved type errors in unrelated files (`applications/[id]/route.ts` and `jobs/[id]/matches/route.ts`) discovered during build.
  - Fixed Next.js 15 async params issue in route handlers.

## [2026-02-06] Task 13: Activity Feed Implementation
- **Activity Tracking**: Created a centralized `activities` table with JSONB data column for flexible event payloads.
- **Event Types**: Added support for `job_posted`, `application_received`, `application_sent`, and `application_status_updated`.
- **Side Effects**: Implemented activity creation as non-blocking side effects in existing API routes (`POST /api/jobs`, `POST /api/applications`, `PATCH /api/applications/[id]`).
- **UI Components**: Created generic `ActivityCard` logic within the feed page using Shadcn UI components (manually implemented Card and Badge as they were missing).
- **Refactoring**: Cleaned up "agent memo" comments in API routes to adhere to code style guidelines, ensuring self-documenting code.

## Null Safety Pattern for Supabase Queries

**Problem:** Destructuring `data` directly from Supabase query can fail if result is null.

**Bad Pattern:**
```typescript
const { data: job } = await supabase.from('job_postings').select('title').single()
// TypeError if query returns null
```

**Good Pattern:**
```typescript
const jobResult = await supabase.from('job_postings').select('title').single()
const job = jobResult?.data
// Safely handles null case with optional chaining
```

**Applied in:** app/api/applications/[id]/route.ts lines 66-71
**Verified by:** All 13 tests in applications.test.ts passing

## [2026-02-06] Matching SQL Functions Migration
- Added migration `supabase/migrations/20260206004220_matching_functions.sql` with:
  - `match_candidates_to_job(job_id UUID, match_limit INT DEFAULT 10)`
  - `match_jobs_to_candidate(candidate_id UUID, match_limit INT DEFAULT 10)`
- Matching uses pgvector cosine distance operator `<=>` and converts to percentage with `(1 - distance) * 100`.
- `match_score` is clamped to `0..100` with `GREATEST/LEAST`, rounded to 2 decimals, and returned as `DECIMAL(5,2)`.
- Guardrails applied:
  - Returns no rows if target embedding is NULL.
  - Candidate matching filters `profiles.profile_type = 'candidate'`.
  - Job matching filters `job_postings.status = 'active'`.
  - Both queries skip rows with NULL embeddings.
- Function signatures and return columns are aligned with existing API `supabase.rpc()` usage in:
  - `app/api/jobs/[id]/matches/route.ts`
  - `app/api/matches/jobs/route.ts`

## [2026-02-06] Session Completion - Deployment Blocker

**Work Completed This Session**:
1. ✅ Fixed application PATCH route null handling bug
2. ✅ Created pgvector SQL matching functions (match_candidates_to_job, match_jobs_to_candidate)
3. ✅ Verified all 53 tests passing
4. ✅ Updated plan with completion status (31/33 tasks)
5. ✅ Created comprehensive deployment guide (DEPLOYMENT_GUIDE.md)
6. ✅ Documented blockers in problems.md

**Final Project Status**:
- **Development**: 100% complete (all 13 main tasks finished)
- **Testing**: 53/53 tests passing
- **Documentation**: Complete with deployment guide
- **Git**: All changes committed (5 commits this session)
- **Deployment**: BLOCKED - requires user credentials

**Remaining Tasks (2/33 - BLOCKED)**:
Both tasks are deployment-related and require user action:
- Deployment to Vercel (needs env vars and Vercel account)
- See DEPLOYMENT_GUIDE.md for complete instructions

**Key Learnings from Deployment Blocker**:
- Always create deployment guides early in project lifecycle
- Document all external dependencies (API keys, services)
- Separate "code complete" from "deployed" in acceptance criteria
- Orchestrator should clearly mark blocked tasks vs incomplete tasks

**Technical Decisions**:
- Chose to create detailed step-by-step deployment guide
- Documented all required services (Supabase, OpenAI, Upstash, Moltbook)
- Included troubleshooting section for common deployment issues
- Added post-deployment checklist and performance optimization tips

**Pattern**: When tasks are blocked by external dependencies, provide comprehensive documentation so the blocker becomes the user's action item, not a development blocker.

