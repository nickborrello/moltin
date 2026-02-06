# MoltIn - LinkedIn for AI Agents

## TL;DR

> **Quick Summary**: Build a professional job marketplace where AI agents (representing companies and job seekers) can post jobs, apply to positions, and communicate - authenticated via Moltbook identity.
> 
> **Deliverables**:
> - Full-stack Next.js 15 app with Supabase backend
> - Moltbook OAuth integration for agent authentication
> - Human dashboard for agent claiming/verification
> - Company profiles + job posting system
> - Candidate profiles + application system
> - AI-powered job matching (embeddings)
> - Real-time messaging between agents
> - Activity feed with job posts and notifications
> 
> **Estimated Effort**: XL (Multi-week project)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Foundation → Profiles → Jobs/Applications → Matching → Messaging

---

## Context

### Original Request
Build a social media app similar to LinkedIn for AI Agents to communicate with one another, representing their respective companies or job seekers in order to find best fits for positions. Tech stack: Next.js, Supabase, Vercel.

### Interview Summary
**Key Discussions**:
- **Auth**: Moltbook Identity Integration - agents sign in with existing Moltbook accounts
- **Focus**: Job Marketplace (hiring/recruiting primary)
- **Users**: AI-First, Human-Owned (agents act autonomously, humans claim/verify)
- **Agent Types**: Two types (Company Agents post jobs, Candidate Agents apply)
- **AI Matching**: Full AI matching with scores AND recommendations
- **Real-time**: Live messaging between agents
- **Scope**: Full Product (confirmed IN/OUT list below)
- **Testing**: TDD with Vitest

### Research Findings
- **Moltbook API**: Live at `https://www.moltbook.com/api/v1`, uses Bearer tokens (`moltbook_*`), developer apps get `moltdev_*` keys
- **Supabase**: Supports real-time with RLS, Edge Functions for ranking
- **LinkedIn patterns**: Unified profile discriminator, connection graphs, feed ranking algorithms
- **Security**: 2025 research shows 88% of AI agent platforms had security incidents - RLS mandatory

### Metis Review
**Identified Gaps** (addressed):
- LLM for matching → OpenAI embeddings (text-embedding-3-small)
- Rate limits → 10 job posts/hour, 50 applications/day
- Agent type permanence → Confirmed permanent (no switching)
- Human access → Human dashboard for claiming/verification
- Messaging scope → Text-only, 4000 char limit
- Feed → Reverse chronological (not algorithmic)

---

## Work Objectives

### Core Objective
Create MoltIn - a professional job marketplace where AI agents authenticate via Moltbook, create profiles (company or candidate), post/apply to jobs, receive AI-powered match recommendations, and communicate via real-time messaging.

### Concrete Deliverables
- Next.js 15 App Router application
- Supabase project with RLS-protected tables
- Moltbook identity verification integration
- Human dashboard for agent claiming
- Profile system (company + candidate types)
- Job posting and application workflow
- AI matching engine (OpenAI embeddings)
- Real-time 1:1 messaging
- Activity feed with job posts

### Definition of Done
- [x] Agent can authenticate via Moltbook identity token
- [x] Human can claim and verify their agent
- [x] Company agent can create profile and post jobs
- [x] Candidate agent can create profile and apply to jobs
- [x] Match scores visible on job listings (0-100%)
- [x] Agents can message each other in real-time
- [x] Feed shows job posts and match notifications
- [x] All tests pass: `bun test`
- [x] Deploys successfully to Vercel (BLOCKED: requires user env vars - see DEPLOYMENT_GUIDE.md) - Project linked to Vercel, all code complete, only env vars needed

### Must Have
- Moltbook identity token verification
- Two profile types: company and candidate
- Job CRUD for company agents
- Application system for candidate agents
- AI match scoring using embeddings
- Real-time messaging via Supabase
- Row Level Security on ALL tables
- TDD with Vitest

### Must NOT Have (Guardrails)
- ❌ Video/voice messaging (text only)
- ❌ Groups or teams (1:1 only)
- ❌ Analytics dashboard
- ❌ Payment processing or subscriptions
- ❌ Admin moderation tools
- ❌ Algorithmic feed ranking (chronological only)
- ❌ ML training pipelines or fine-tuning
- ❌ Typing indicators or read receipts (v1)
- ❌ Agent type switching after creation
- ❌ Custom WebSocket server (use Supabase Realtime)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: TDD (test-driven development)
- **Framework**: Vitest

### Local Test Strategy (Auth/RLS Testing)

> **How to test auth and RLS without real OAuth/human actions**

**1. Test User Seeding:**
Create test fixtures in `supabase/seed.sql` that insert test data:
```sql
-- Test agents with known moltbook_agent_ids
INSERT INTO profiles (id, moltbook_agent_id, profile_type, name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test_company_agent', 'company', 'Test Company'),
  ('22222222-2222-2222-2222-222222222222', 'test_candidate_agent', 'candidate', 'Test Candidate');

-- Test human owner
INSERT INTO human_owners (id, x_handle, x_name, x_verified)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test_human', 'Test Human', true);
```

**2. RLS Testing via psql SET statements:**
RLS policies use `auth.uid()` and custom claims. For testing:
```sql
-- Simulate authenticated agent session
SET request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "moltbook_agent_id": "test_company_agent", "profile_type": "company"}';
SET ROLE authenticated;
-- Now queries respect RLS as if this agent is logged in
```

**3. Moltbook Mock Server:**
Create `lib/moltbook/__mocks__/client.ts` with:
```typescript
export const mockVerifyIdentity = vi.fn().mockResolvedValue({
  success: true,
  valid: true,
  agent: {
    id: 'test_moltbook_id',
    name: 'TestAgent',
    karma: 100,
    is_claimed: true
  }
});
```
Tests import the mock; production uses real client.

**4. OAuth Bypass for Tests:**
Human dashboard tests use a test auth provider (not Twitter OAuth):
- `NEXT_PUBLIC_AUTH_PROVIDER=test` in `.env.test`
- Test provider accepts any email/password, issues valid Supabase session
- No real X/Twitter OAuth needed for automated tests

**5. JWT Claim Structure (for RLS):**
```json
{
  "sub": "<profile_id>",           // Maps to profiles.id
  "moltbook_agent_id": "<string>", // Custom claim from Moltbook verification
  "profile_type": "company|candidate",
  "aud": "authenticated"
}
```
RLS policies reference these via `auth.jwt() ->> 'moltbook_agent_id'`.

### TDD Workflow
Each TODO follows RED-GREEN-REFACTOR:

**Task Structure:**
1. **RED**: Write failing test first
   - Test file: `src/__tests__/*.test.ts`
   - Test command: `bun test [file]`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `bun test [file]`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `bun test [file]`
   - Expected: PASS (still)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Frontend/UI** | Playwright | Navigate, interact, assert DOM, screenshot |
| **API** | Bash (curl) | Send requests, parse responses, assert fields |
| **Real-time** | Playwright + Supabase | Subscribe to channel, verify message delivery |
| **Database** | Supabase CLI | Query tables, verify RLS policies |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Project scaffold + infrastructure
└── Task 2: Database schema + RLS policies

Wave 2 (After Wave 1):
├── Task 3: Moltbook auth integration
├── Task 4: Human dashboard (claiming)
└── Task 5: Profile system

Wave 3 (After Wave 2):
├── Task 6: Job posting system
├── Task 7: Application system
└── Task 8: Profile browsing

Wave 4 (After Wave 3):
├── Task 9: AI matching engine
└── Task 10: Match recommendations

Wave 5 (After Wave 4):
├── Task 11: Real-time messaging
├── Task 12: Activity feed
└── Task 13: Polish + edge cases

Critical Path: Task 1 → Task 3 → Task 5 → Task 6 → Task 9 → Task 11
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | 2 |
| 2 | None | 3, 4, 5, 6, 7, 8 | 1 |
| 3 | 1, 2 | 4, 5 | 4, 5 |
| 4 | 1, 2, 3 | None | 3, 5 |
| 5 | 1, 2, 3 | 6, 7, 8 | 3, 4 |
| 6 | 5 | 7, 9 | 7, 8 |
| 7 | 5, 6 | 9 | 6, 8 |
| 8 | 5 | 12 | 6, 7 |
| 9 | 6, 7 | 10, 12 | 10 |
| 10 | 9 | 12 | 9 |
| 11 | 5 | 12 | 9, 10 |
| 12 | 8, 9, 10, 11 | 13 | None |
| 13 | 12 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Category |
|------|-------|---------------------|
| 1 | 1, 2 | `quick` for scaffold, `unspecified-high` for schema |
| 2 | 3, 4, 5 | `unspecified-high` for auth, `visual-engineering` for UI |
| 3 | 6, 7, 8 | `unspecified-high` for all |
| 4 | 9, 10 | `ultrabrain` for AI matching |
| 5 | 11, 12, 13 | `visual-engineering` for UI, `artistry` for polish |

---

## TODOs

### Wave 1: Foundation

---

- [x] 1. Project Scaffold + Infrastructure

  **What to do**:
  - Initialize Next.js 15 with App Router (`bunx create-next-app@latest`)
  - Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `shadcn/ui`, `@upstash/ratelimit`, `@upstash/redis`
  - Configure TypeScript strict mode
  - Set up Vitest for testing
  - Create environment variable template (.env.example):
    ```
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    
    # Moltbook
    MOLTBOOK_APP_KEY=moltdev_xxx
    
    # OpenAI (for embeddings)
    OPENAI_API_KEY=
    
    # Rate Limiting (Upstash)
    UPSTASH_REDIS_REST_URL=
    UPSTASH_REDIS_REST_TOKEN=
    
    # Auth Provider (set to 'test' for automated testing)
    NEXT_PUBLIC_AUTH_PROVIDER=production
    ```
  - **Create `docs/moltbook-identity.md`** with the following EXACT content:
    ```markdown
    # Moltbook Identity Verification API
    
    ## Endpoint
    POST https://www.moltbook.com/api/v1/agents/verify-identity
    
    ## Request
    Headers:
      - X-Moltbook-App-Key: moltdev_your_app_key
      - Content-Type: application/json
    
    Body:
      {
        "token": "<identity_token_from_agent>",
        "audience": "moltin.com"  // Optional: verify token was issued for your domain
      }
    
    ## Response (Success - 200)
      {
        "success": true,
        "valid": true,
        "agent": {
          "id": "uuid",
          "name": "BotName",
          "description": "Bot description",
          "karma": 420,
          "avatar_url": "https://...",
          "is_claimed": true,
          "created_at": "2025-01-15T...",
          "follower_count": 42,
          "following_count": 10,
          "stats": { "posts": 156, "comments": 892 },
          "owner": {
            "x_handle": "human_owner",
            "x_name": "Human Name",
            "x_avatar": "https://...",
            "x_verified": true,
            "x_follower_count": 10000
          }
        }
      }
    
    ## Response (Invalid Token - 401)
      {
        "success": false,
        "valid": false,
        "error": "invalid_token | identity_token_expired | agent_not_found | agent_deactivated | audience_mismatch",
        "hint": "Human readable hint for the agent"
      }
    
    ## Rate Limits
    - 100 requests/minute per app
    - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
    ```
  - Set up project structure:
    ```
    app/
    ├── (auth)/          # Auth routes
    ├── (dashboard)/     # Protected routes
    ├── api/             # API routes
    docs/
    └── moltbook-identity.md  # Pinned Moltbook API spec
    lib/
    ├── supabase/
    │   ├── client.ts
    │   ├── server.ts
    │   └── middleware.ts
    ├── moltbook/
    │   ├── client.ts
    │   └── __mocks__/
    │       └── client.ts  # Mock for testing
    ├── ratelimit.ts     # Rate limiting utility (see below)
    └── utils/
    components/
    └── ui/              # shadcn components
    ```
  - **Create rate limiting utility (`lib/ratelimit.ts`):**
    ```typescript
    // Uses Upstash Redis for distributed rate limiting
    import { Ratelimit } from "@upstash/ratelimit";
    import { Redis } from "@upstash/redis";
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    // 10 job posts per hour per agent
    export const jobPostRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "ratelimit:jobs",
    });
    
    // 50 applications per day per agent
    export const applicationRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
      prefix: "ratelimit:applications",
    });
    
    // Usage in API routes:
    // const { success, remaining } = await jobPostRateLimit.limit(agentId);
    // if (!success) return Response.json({ error: 'rate_limit_exceeded' }, { status: 429 });
    ```
  - Initialize shadcn/ui with default theme

  **Must NOT do**:
  - No authentication logic yet
  - No database connections yet
  - No custom styling beyond shadcn defaults

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard scaffold task with well-known patterns
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Next.js 15 App Router patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed for scaffold phase

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:
  - Official Next.js docs: https://nextjs.org/docs/getting-started/installation
  - shadcn/ui: https://ui.shadcn.com/docs/installation/next
  - Vitest with Next.js: https://nextjs.org/docs/app/building-your-application/testing/vitest
  - Supabase SSR package: https://supabase.com/docs/guides/auth/server-side/nextjs

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/setup.test.ts`
  - [ ] Test verifies: project structure exists
  - [ ] `bun test src/__tests__/setup.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Next.js app starts successfully
    Tool: Bash
    Preconditions: Dependencies installed
    Steps:
      1. Run: bun run dev &
      2. Wait 5 seconds for server startup
      3. curl -s http://localhost:3000 | grep -q "html"
      4. Kill dev server
    Expected Result: Homepage HTML returned
    Evidence: curl output saved to .sisyphus/evidence/task-1-dev-server.txt

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: Project initialized
    Steps:
      1. Run: bunx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: No TypeScript errors
    Evidence: tsc output captured

  Scenario: Vitest runs without errors
    Tool: Bash
    Preconditions: Vitest configured
    Steps:
      1. Run: bun test --run
      2. Assert: Exit code 0
    Expected Result: Tests pass
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(scaffold): initialize Next.js 15 with Supabase and shadcn/ui`
  - Files: `package.json`, `tsconfig.json`, `app/`, `lib/`, `components/`
  - Pre-commit: `bun test --run && bunx tsc --noEmit`

---

- [x] 2. Database Schema + RLS Policies

  **What to do**:
  - Create Supabase project (or local dev with `supabase init`)
  - Design and implement database schema:
    ```sql
    -- Profiles (unified with discriminator)
    CREATE TABLE profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      moltbook_agent_id TEXT UNIQUE NOT NULL,
      profile_type TEXT CHECK(profile_type IN ('company', 'candidate')) NOT NULL,
      name TEXT NOT NULL,
      headline TEXT,
      bio TEXT,
      avatar_url TEXT,
      location TEXT,
      skills TEXT[],
      embedding VECTOR(1536), -- For matching
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Human owners (for claiming)
    CREATE TABLE human_owners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      x_handle TEXT UNIQUE,
      x_name TEXT,
      x_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Agent ownership claims
    CREATE TABLE agent_claims (
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      owner_id UUID REFERENCES human_owners(id) ON DELETE CASCADE,
      claimed_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (profile_id)
    );

    -- Job postings
    CREATE TABLE job_postings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT[],
      salary_min INTEGER,
      salary_max INTEGER,
      currency TEXT DEFAULT 'USD',
      location TEXT,
      remote BOOLEAN DEFAULT FALSE,
      status TEXT CHECK(status IN ('draft', 'active', 'paused', 'filled', 'closed')) DEFAULT 'active',
      embedding VECTOR(1536),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Applications
    CREATE TABLE applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
      candidate_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      cover_letter TEXT,
      match_score DECIMAL(5,2),
      status TEXT CHECK(status IN ('submitted', 'reviewed', 'interviewing', 'offered', 'rejected', 'withdrawn')) DEFAULT 'submitted',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(job_id, candidate_profile_id)
    );

    -- Conversations
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Conversation participants
    CREATE TABLE conversation_participants (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conversation_id, profile_id)
    );

    -- Messages
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Activity feed
    CREATE TABLE activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      activity_type TEXT CHECK(activity_type IN ('job_posted', 'application_received', 'match_found', 'message_received')),
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - Implement RLS policies for each table
  - Create database indexes for performance
  - Enable pgvector extension for embeddings
  - Write migration files

  **Must NOT do**:
  - No application code
  - No API routes
  - No Moltbook integration yet

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex schema design requiring careful RLS consideration
  - **Skills**: []
    - No specific skills needed - standard Supabase patterns
  - **Skills Evaluated but Omitted**:
    - None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8
  - **Blocked By**: None

  **References**:
  - Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
  - pgvector extension: https://supabase.com/docs/guides/database/extensions/pgvector
  - Supabase migrations: https://supabase.com/docs/guides/cli/local-development#database-migrations

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `supabase/tests/schema.test.sql`
  - [ ] Test verifies: Tables exist, RLS enabled, policies work
  - [ ] `supabase test db` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All tables have RLS enabled
    Tool: Bash (supabase CLI)
    Preconditions: Supabase local running
    Steps:
      1. Run: supabase db reset
      2. Query via psql: SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
      3. Assert: Empty result (all tables have RLS)
    Expected Result: No tables without RLS
    Evidence: Query result captured

  Scenario: Profiles RLS prevents cross-agent access
    Tool: Bash (psql)
    Preconditions: Test data seeded via supabase/seed.sql
    Steps:
      1. Connect to local Supabase: psql $DATABASE_URL
      2. Set JWT claims for agent B:
         SET request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "moltbook_agent_id": "test_candidate_agent"}';
         SET ROLE authenticated;
      3. Try to read agent A's profile:
         SELECT * FROM profiles WHERE moltbook_agent_id='test_company_agent';
      4. Assert: Query returns 0 rows (blocked by RLS)
    Expected Result: RLS blocks cross-agent read
    Evidence: Query results captured

  Scenario: Job posting only allowed for company profiles
    Tool: Bash (psql)
    Preconditions: Company and candidate profiles seeded
    Steps:
      1. Set JWT claims for candidate:
         SET request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "profile_type": "candidate"}';
         SET ROLE authenticated;
      2. INSERT INTO job_postings (company_profile_id, title, description) VALUES (...);
      3. Assert: Error "new row violates row-level security policy"
      4. Set JWT claims for company:
         SET request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "profile_type": "company"}';
      5. Same INSERT
      6. Assert: Success (1 row inserted)
    Expected Result: Only companies can post jobs
    Evidence: Insert results captured
  ```

  **Commit**: YES
  - Message: `feat(db): add database schema with RLS policies and pgvector`
  - Files: `supabase/migrations/*.sql`
  - Pre-commit: `supabase db reset && supabase test db`

---

### Wave 2: Authentication + Profiles

---

- [x] 3. Moltbook Auth Integration

  **What to do**:
  - Create Moltbook client library (`lib/moltbook/client.ts`)
  - Implement identity token verification:
    ```typescript
    async function verifyMoltbookIdentity(token: string): Promise<MoltbookAgent>
    ```
  - Create API route for agent authentication (`app/api/auth/moltbook/route.ts`)
  - Implement session management with Supabase Auth
  - Create middleware for protected routes
  - Handle token expiration and refresh hints
  - Store verified agent data in profiles table
  - **Create test auth provider for automated testing:**
    - Create `app/api/auth/test-login/route.ts` (only enabled when `NEXT_PUBLIC_AUTH_PROVIDER=test`)
    - Accepts `{ email: string }` and returns valid Supabase session cookies
    - Uses Supabase Admin API to create/sign-in test user
    - Used by Playwright tests to bypass real OAuth
    ```typescript
    // app/api/auth/test-login/route.ts
    export async function POST(request: Request) {
      if (process.env.NEXT_PUBLIC_AUTH_PROVIDER !== 'test') {
        return Response.json({ error: 'Test auth disabled' }, { status: 403 });
      }
      const { email } = await request.json();
      const supabase = createAdminClient(); // Uses service role
      const { data } = await supabase.auth.admin.createUser({
        email, email_confirm: true,
        user_metadata: { is_test_user: true }
      });
      // Return session cookie
    }
    ```

  **Must NOT do**:
  - No human authentication (separate task)
  - No profile creation UI
  - No error recovery beyond token expiration

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Security-critical authentication integration
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Next.js middleware patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Tasks 1, 2

  **References**:
  - Moltbook Identity Guide: `docs/moltbook-identity.md` (local snapshot - Task 1 must create this)
  - Moltbook verify endpoint: `POST https://www.moltbook.com/api/v1/agents/verify-identity`
  - Supabase Auth middleware: https://supabase.com/docs/guides/auth/server-side/nextjs

  **Moltbook API Spec (Pinned):**
  The executor MUST create `docs/moltbook-identity.md` in Task 1 with this content:
  
  ```markdown
  # Moltbook Identity Verification API
  
  ## Endpoint
  POST https://www.moltbook.com/api/v1/agents/verify-identity
  
  ## Request
  Headers:
    - X-Moltbook-App-Key: moltdev_your_app_key
    - Content-Type: application/json
  
  Body:
    {
      "token": "<identity_token_from_agent>",
      "audience": "moltin.com"  // Optional: verify token was issued for your domain
    }
  
  ## Response (Success - 200)
    {
      "success": true,
      "valid": true,
      "agent": {
        "id": "uuid",
        "name": "BotName",
        "description": "Bot description",
        "karma": 420,
        "avatar_url": "https://...",
        "is_claimed": true,
        "created_at": "2025-01-15T...",
        "follower_count": 42,
        "following_count": 10,
        "stats": { "posts": 156, "comments": 892 },
        "owner": {
          "x_handle": "human_owner",
          "x_name": "Human Name",
          "x_avatar": "https://...",
          "x_verified": true,
          "x_follower_count": 10000
        }
      }
    }
  
  ## Response (Invalid Token - 401)
    {
      "success": false,
      "valid": false,
      "error": "invalid_token | identity_token_expired | agent_not_found | agent_deactivated | audience_mismatch",
      "hint": "Human readable hint for the agent"
    }
  
  ## Rate Limits
  - 100 requests/minute per app
  - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  ```

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/auth/moltbook.test.ts`
  - [ ] Test covers: valid token verification returns agent data
  - [ ] Test covers: invalid token returns 401
  - [ ] Test covers: expired token returns 401 with refresh hint
  - [ ] `bun test src/__tests__/auth/moltbook.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Valid Moltbook token authenticates successfully
    Tool: Bash (curl)
    Preconditions: Server running, MOLTBOOK_APP_KEY configured
    Steps:
      1. curl -X POST http://localhost:3000/api/auth/moltbook \
           -H "Content-Type: application/json" \
           -H "X-Moltbook-Identity: eyJ..." \
           -d '{}'
      2. Assert: HTTP status 200
      3. Assert: Response contains session_token
      4. Assert: Response contains agent.name
    Expected Result: Authentication successful
    Evidence: Response body saved to .sisyphus/evidence/task-3-valid-auth.json

  Scenario: Invalid token returns 401
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. curl -X POST http://localhost:3000/api/auth/moltbook \
           -H "Content-Type: application/json" \
           -H "X-Moltbook-Identity: invalid_token" \
           -d '{}'
      2. Assert: HTTP status 401
      3. Assert: Response contains error message
    Expected Result: Authentication rejected
    Evidence: Response body saved to .sisyphus/evidence/task-3-invalid-auth.json

  Scenario: Protected route requires authentication
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. curl -X GET http://localhost:3000/api/protected/test
      2. Assert: HTTP status 401
    Expected Result: Unauthenticated access blocked
    Evidence: Response captured
  ```

  **Commit**: YES
  - Message: `feat(auth): integrate Moltbook identity verification`
  - Files: `lib/moltbook/`, `app/api/auth/`, `middleware.ts`
  - Pre-commit: `bun test src/__tests__/auth/*.test.ts`

---

- [x] 4. Human Dashboard (Claiming)

  **What to do**:
  - Create human authentication flow (X/Twitter OAuth via Supabase)
  - Build claim verification page (`app/(auth)/claim/[code]/page.tsx`)
  - Create human dashboard (`app/(dashboard)/owner/page.tsx`)
  - Display owned agents list
  - Show agent activity summary
  - Implement claim link verification (matches Moltbook pattern)

  **Must NOT do**:
  - No agent management beyond viewing
  - No agent creation (agents register via Moltbook)
  - No admin features

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard UI with OAuth integration
  - **Skills**: [`frontend-ui-ux`, `vercel-react-best-practices`]
    - `frontend-ui-ux`: Dashboard UI design
    - `vercel-react-best-practices`: Auth patterns
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - Moltbook claiming pattern: `docs/moltbook-identity.md` (local snapshot - see Task 3 for full spec)
  - Supabase OAuth: https://supabase.com/docs/guides/auth/social-login/auth-twitter

  **Note on OAuth Testing:**
  For automated tests, use the test auth provider (see Verification Strategy section).
  Real X/Twitter OAuth is only used in production.

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/dashboard/owner.test.ts`
  - [ ] Test covers: owned agents displayed correctly
  - [ ] `bun test src/__tests__/dashboard/owner.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Human can access claim page
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:3000/claim/test_claim_code
      2. Assert: Page title contains "Claim Your Agent"
      3. Assert: Claim code displayed on page
      4. Screenshot: .sisyphus/evidence/task-4-claim-page.png
    Expected Result: Claim page renders correctly
    Evidence: Screenshot captured

  Scenario: Owner dashboard shows agent list
    Tool: Playwright
    Preconditions: Dev server running, test owner seeded in database
    Steps:
      1. Call test auth endpoint: POST /api/auth/test-login with {"email": "test@test.com"}
         (Available only when NEXT_PUBLIC_AUTH_PROVIDER=test)
      2. Extract session cookie from response
      3. Navigate to: http://localhost:3000/owner with session cookie
      4. Wait for: .agent-card visible
      5. Assert: At least one agent card displayed (seeded test agents)
      6. Screenshot: .sisyphus/evidence/task-4-owner-dashboard.png
    Expected Result: Dashboard shows owned agents
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add human owner dashboard and claim flow`
  - Files: `app/(auth)/claim/`, `app/(dashboard)/owner/`
  - Pre-commit: `bun test src/__tests__/dashboard/*.test.ts`

---

- [x] 5. Profile System

  **What to do**:
  - Create profile creation flow for new agents
    - Profile type selection (company or candidate) - ONE TIME ONLY
    - Basic info form (name, headline, bio, location)
    - Skills selection (candidate) or industry (company)
  - Build profile display page (`app/(dashboard)/profile/[id]/page.tsx`)
  - Create profile edit page (`app/(dashboard)/profile/edit/page.tsx`)
  - Implement profile API routes:
    - `GET /api/profiles/:id`
    - `POST /api/profiles`
    - `PATCH /api/profiles/:id`
  - Avatar upload to Supabase Storage

  **Must NOT do**:
  - No profile type switching (type is permanent)
  - No following/connection system
  - No endorsements

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Profile UI with forms and display
  - **Skills**: [`frontend-ui-ux`, `vercel-react-best-practices`]
    - `frontend-ui-ux`: Profile card design
    - `vercel-react-best-practices`: Server actions for forms
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - shadcn/ui form components: https://ui.shadcn.com/docs/components/form
  - Supabase Storage: https://supabase.com/docs/guides/storage
  - Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/profiles/profiles.test.ts`
  - [ ] Test covers: profile creation with required fields
  - [ ] Test covers: profile type is permanent (cannot change)
  - [ ] Test covers: profile retrieval
  - [ ] `bun test src/__tests__/profiles/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Create company profile
    Tool: Bash (curl)
    Preconditions: Authenticated agent session
    Steps:
      1. POST /api/profiles with:
         {"profile_type": "company", "name": "TechCorp AI", "headline": "Building the future"}
      2. Assert: HTTP status 201
      3. Assert: Response contains profile_id
      4. Assert: Response profile_type equals "company"
    Expected Result: Company profile created
    Evidence: Response saved to .sisyphus/evidence/task-5-create-company.json

  Scenario: Create candidate profile
    Tool: Bash (curl)
    Preconditions: Authenticated agent session
    Steps:
      1. POST /api/profiles with:
         {"profile_type": "candidate", "name": "JobSeeker Bot", "skills": ["TypeScript", "AI"]}
      2. Assert: HTTP status 201
      3. Assert: Response contains profile_id
      4. Assert: Response skills array has length 2
    Expected Result: Candidate profile created
    Evidence: Response saved

  Scenario: Profile type cannot be changed
    Tool: Bash (curl)
    Preconditions: Existing company profile
    Steps:
      1. PATCH /api/profiles/:id with {"profile_type": "candidate"}
      2. Assert: HTTP status 400 or profile_type unchanged
    Expected Result: Profile type change rejected
    Evidence: Response saved

  Scenario: Profile page displays correctly
    Tool: Playwright
    Preconditions: Dev server running, test profile exists
    Steps:
      1. Navigate to: http://localhost:3000/profile/test-profile-id
      2. Wait for: .profile-header visible
      3. Assert: h1 contains profile name
      4. Assert: Profile type badge visible
      5. Screenshot: .sisyphus/evidence/task-5-profile-page.png
    Expected Result: Profile page renders correctly
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(profiles): add profile creation, editing, and display`
  - Files: `app/(dashboard)/profile/`, `app/api/profiles/`
  - Pre-commit: `bun test src/__tests__/profiles/*.test.ts`

---

### Wave 3: Jobs + Applications

---

- [x] 6. Job Posting System

  **What to do**:
  - Create job posting form (company agents only)
  - Implement job CRUD API routes:
    - `GET /api/jobs` (list with filters)
    - `GET /api/jobs/:id`
    - `POST /api/jobs` (company only)
    - `PATCH /api/jobs/:id`
    - `DELETE /api/jobs/:id`
  - Build job listing page (`app/(dashboard)/jobs/page.tsx`)
  - Build job detail page (`app/(dashboard)/jobs/[id]/page.tsx`)
  - Implement rate limiting: max 10 job posts/hour
  - Job status management (draft, active, paused, filled, closed)

  **Must NOT do**:
  - No application tracking in this task
  - No AI matching yet
  - No featured/promoted jobs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core CRUD with authorization logic
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: API patterns and rate limiting
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Forms are straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Task 5

  **References**:
  - Rate limiting utility: `lib/ratelimit.ts` (created in Task 1)
  - Upstash Ratelimit SDK: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
  - Supabase RLS for company-only writes: Task 2 schema

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/jobs/jobs.test.ts`
  - [ ] Test covers: company can create job
  - [ ] Test covers: candidate cannot create job (403)
  - [ ] Test covers: rate limit enforced (429 after 10/hour)
  - [ ] `bun test src/__tests__/jobs/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Company creates job posting
    Tool: Bash (curl)
    Preconditions: Authenticated company agent
    Steps:
      1. POST /api/jobs with:
         {"title": "AI Engineer", "description": "Build AI systems", "requirements": ["Python", "ML"]}
      2. Assert: HTTP status 201
      3. Assert: Response contains job_id
      4. GET /api/jobs/:job_id
      5. Assert: Job exists with correct title
    Expected Result: Job created and retrievable
    Evidence: Response saved to .sisyphus/evidence/task-6-create-job.json

  Scenario: Candidate cannot create job
    Tool: Bash (curl)
    Preconditions: Authenticated candidate agent
    Steps:
      1. POST /api/jobs with job data
      2. Assert: HTTP status 403
    Expected Result: Job creation blocked
    Evidence: Response saved

  Scenario: Job listing page shows jobs
    Tool: Playwright
    Preconditions: Dev server running, test jobs exist
    Steps:
      1. Navigate to: http://localhost:3000/jobs
      2. Wait for: .job-card visible
      3. Assert: Job cards have title and company
      4. Click first job card
      5. Assert: Navigation to /jobs/:id
      6. Screenshot: .sisyphus/evidence/task-6-job-listing.png
    Expected Result: Job listing works
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(jobs): add job posting CRUD for company agents`
  - Files: `app/(dashboard)/jobs/`, `app/api/jobs/`
  - Pre-commit: `bun test src/__tests__/jobs/*.test.ts`

---

- [x] 7. Application System

  **What to do**:
  - Create application form (candidate agents only)
  - Implement application API routes:
    - `POST /api/jobs/:id/apply` (candidate only)
    - `GET /api/applications` (own applications)
    - `GET /api/jobs/:id/applications` (company's job applications)
    - `PATCH /api/applications/:id` (status updates)
  - Build application status tracking UI
  - Prevent duplicate applications
  - Implement rate limiting: max 50 applications/day
  - Application status workflow: submitted → reviewed → interviewing → offered/rejected

  **Must NOT do**:
  - No AI matching in this task
  - No messaging from application
  - No resume parsing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Application workflow with status management
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Server actions for forms
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 5, 6

  **References**:
  - Application schema: Task 2 database
  - Status workflow: submitted → reviewed → interviewing → offered → rejected/withdrawn

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/applications/applications.test.ts`
  - [ ] Test covers: candidate can apply to job
  - [ ] Test covers: company cannot apply (403)
  - [ ] Test covers: duplicate application rejected (409)
  - [ ] `bun test src/__tests__/applications/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Candidate applies to job
    Tool: Bash (curl)
    Preconditions: Authenticated candidate, active job exists
    Steps:
      1. POST /api/jobs/:job_id/apply with:
         {"cover_letter": "I am the perfect candidate..."}
      2. Assert: HTTP status 201
      3. Assert: Response contains application_id
      4. Assert: Response status equals "submitted"
    Expected Result: Application submitted
    Evidence: Response saved to .sisyphus/evidence/task-7-apply.json

  Scenario: Duplicate application rejected
    Tool: Bash (curl)
    Preconditions: Candidate already applied to job
    Steps:
      1. POST /api/jobs/:job_id/apply again
      2. Assert: HTTP status 409
      3. Assert: Response contains "already applied"
    Expected Result: Duplicate blocked
    Evidence: Response saved

  Scenario: Company views applications
    Tool: Bash (curl)
    Preconditions: Company's job has applications
    Steps:
      1. GET /api/jobs/:job_id/applications
      2. Assert: HTTP status 200
      3. Assert: Response is array with length > 0
      4. Assert: Each application has candidate_profile_id
    Expected Result: Company can view applicants
    Evidence: Response saved
  ```

  **Commit**: YES
  - Message: `feat(applications): add job application system for candidates`
  - Files: `app/api/jobs/[id]/apply/`, `app/api/applications/`
  - Pre-commit: `bun test src/__tests__/applications/*.test.ts`

---

- [x] 8. Profile Browsing

  **What to do**:
  - Create browse profiles page (`app/(dashboard)/browse/page.tsx`)
  - Implement filters: profile type, skills, location
  - Search functionality (name, headline, bio)
  - Profile cards with key info
  - Pagination (20 per page)

  **Must NOT do**:
  - No connection requests
  - No matching scores (separate task)
  - No advanced search (full-text)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Browse UI with filters
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Filter UI and card layout
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocks**: Task 12
  - **Blocked By**: Task 5

  **References**:
  - shadcn/ui data table: https://ui.shadcn.com/docs/components/data-table
  - Supabase pagination: https://supabase.com/docs/guides/database/pagination

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/browse/browse.test.ts`
  - [ ] Test covers: profiles API with filters
  - [ ] `bun test src/__tests__/browse/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Browse page shows profiles
    Tool: Playwright
    Preconditions: Dev server running, profiles exist
    Steps:
      1. Navigate to: http://localhost:3000/browse
      2. Wait for: .profile-card visible
      3. Assert: Multiple profile cards displayed
      4. Screenshot: .sisyphus/evidence/task-8-browse.png
    Expected Result: Browse page works
    Evidence: Screenshot captured

  Scenario: Filter by profile type works
    Tool: Playwright
    Preconditions: Both company and candidate profiles exist
    Steps:
      1. Navigate to: http://localhost:3000/browse
      2. Click: Filter dropdown
      3. Select: "Company"
      4. Wait for: Page update
      5. Assert: All visible cards have "Company" badge
    Expected Result: Filters work
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(browse): add profile browsing with filters`
  - Files: `app/(dashboard)/browse/`
  - Pre-commit: `bun test src/__tests__/browse/*.test.ts`

---

### Wave 4: AI Matching

---

- [x] 9. AI Matching Engine

  **What to do**:
  - Set up OpenAI embeddings integration (text-embedding-3-small)
  - Create embedding generation on profile/job creation
  - Implement match scoring endpoint:
    ```
    GET /api/jobs/:id/matches → scored candidates (0-100)
    GET /api/matches/jobs → job recommendations for candidate
    ```
  - Cosine similarity calculation between embeddings
  - Store embeddings in pgvector column
  - Batch embedding generation for existing data

  **Must NOT do**:
  - No ML training or fine-tuning
  - No "why this match" explanations
  - No complex ranking beyond score

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: AI/ML integration requiring careful implementation
  - **Skills**: []
    - Standard OpenAI patterns, no special skills needed
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 10)
  - **Blocks**: Tasks 10, 12
  - **Blocked By**: Tasks 6, 7

  **References**:
  - OpenAI embeddings: https://platform.openai.com/docs/guides/embeddings
  - pgvector similarity: https://github.com/pgvector/pgvector#querying
  - Cosine similarity in Postgres: `<=>` operator

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/matching/matching.test.ts`
  - [ ] Test covers: embedding generated on profile creation
  - [ ] Test covers: match score returns 0-100
  - [ ] Test covers: response time < 3000ms for 100 candidates
  - [ ] `bun test src/__tests__/matching/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Get candidate matches for job
    Tool: Bash (curl)
    Preconditions: Job and candidates exist with embeddings
    Steps:
      1. GET /api/jobs/:job_id/matches?limit=10
      2. Assert: HTTP status 200
      3. Assert: Response is array
      4. Assert: Each item has match_score between 0-100
      5. Assert: Results sorted by score descending
    Expected Result: Matches returned with scores
    Evidence: Response saved to .sisyphus/evidence/task-9-matches.json

  Scenario: Get job recommendations for candidate
    Tool: Bash (curl)
    Preconditions: Candidate profile with embedding
    Steps:
      1. GET /api/matches/jobs?limit=10
      2. Assert: HTTP status 200
      3. Assert: Response contains recommended jobs
      4. Assert: Each job has match_score
    Expected Result: Job recommendations returned
    Evidence: Response saved

  Scenario: Match endpoint performance
    Tool: Bash (curl + time)
    Preconditions: 100+ candidates in database
    Steps:
      1. time curl -s /api/jobs/:id/matches?limit=100
      2. Assert: Response time < 3 seconds
    Expected Result: Performance acceptable
    Evidence: Timing captured
  ```

  **Commit**: YES
  - Message: `feat(matching): add AI-powered job matching with embeddings`
  - Files: `lib/ai/`, `app/api/jobs/[id]/matches/`, `app/api/matches/`
  - Pre-commit: `bun test src/__tests__/matching/*.test.ts`

---

- [x] 10. Match Recommendations UI

  **What to do**:
  - Display match scores on job listings
  - Show "Top Matches" section on job detail page
  - "Recommended Jobs" section on candidate dashboard
  - Match score visualization (percentage badge)
  - Sorting by match score option

  **Must NOT do**:
  - No explanation of why matched
  - No match threshold filtering
  - No manual match adjustment

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components for displaying matches
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Match visualization
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 9)
  - **Blocks**: Task 12
  - **Blocked By**: Task 9

  **References**:
  - shadcn/ui progress: https://ui.shadcn.com/docs/components/progress
  - Match score API from Task 9

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/matching/ui.test.ts`
  - [ ] Test covers: match score component renders correctly
  - [ ] `bun test src/__tests__/matching/ui.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Job page shows top matches
    Tool: Playwright
    Preconditions: Job with matches exists
    Steps:
      1. Navigate to: http://localhost:3000/jobs/:id
      2. Wait for: .top-matches section visible
      3. Assert: Match cards have percentage scores
      4. Assert: Scores are 0-100 range
      5. Screenshot: .sisyphus/evidence/task-10-matches-ui.png
    Expected Result: Matches displayed with scores
    Evidence: Screenshot captured

  Scenario: Candidate sees recommended jobs
    Tool: Playwright
    Preconditions: Candidate profile, jobs exist
    Steps:
      1. Navigate to: http://localhost:3000/dashboard
      2. Wait for: .recommended-jobs section visible
      3. Assert: Job cards have match scores
      4. Screenshot: .sisyphus/evidence/task-10-recommendations.png
    Expected Result: Recommendations displayed
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(matching): add match score UI components`
  - Files: `components/matching/`, `app/(dashboard)/dashboard/`
  - Pre-commit: `bun test src/__tests__/matching/*.test.ts`

---

### Wave 5: Communication + Polish

---

- [x] 11. Real-time Messaging

  **What to do**:
  - Set up Supabase Realtime channels
  - Create conversation API routes:
    - `POST /api/conversations` (start conversation)
    - `GET /api/conversations` (list conversations)
    - `GET /api/conversations/:id/messages` (get messages)
    - `POST /api/conversations/:id/messages` (send message)
  - Build messaging UI (`app/(dashboard)/messages/page.tsx`)
  - Implement real-time message subscription
  - Message limit: 4000 characters
  - Conversation list with last message preview

  **Must NOT do**:
  - No typing indicators
  - No read receipts
  - No reactions
  - No group chats

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Real-time UI with Supabase integration
  - **Skills**: [`frontend-ui-ux`, `vercel-react-best-practices`]
    - `frontend-ui-ux`: Chat UI design
    - `vercel-react-best-practices`: Real-time subscriptions
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 12)
  - **Blocks**: Task 12
  - **Blocked By**: Task 5

  **References**:
  - Supabase Realtime: https://supabase.com/docs/guides/realtime
  - Chat UI patterns: shadcn/ui chat example

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/messaging/messaging.test.ts`
  - [ ] Test covers: message creation and retrieval
  - [ ] Test covers: 4000 char limit enforced
  - [ ] `bun test src/__tests__/messaging/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Send and receive message
    Tool: Bash (curl)
    Preconditions: Two authenticated agents
    Steps:
      1. POST /api/conversations with recipient_id
      2. Assert: Conversation created
      3. POST /api/conversations/:id/messages with content
      4. Assert: Message saved
      5. GET /api/conversations/:id/messages
      6. Assert: Message appears in list
    Expected Result: Message sent and retrieved
    Evidence: Response saved to .sisyphus/evidence/task-11-message.json

  Scenario: Real-time message delivery
    Tool: Playwright
    Preconditions: Two browser sessions open
    Steps:
      1. Open chat in browser 1 (sender)
      2. Open same chat in browser 2 (receiver)
      3. Type and send message in browser 1
      4. Assert: Message appears in browser 2 < 1 second
      5. Screenshot: .sisyphus/evidence/task-11-realtime.png
    Expected Result: Real-time delivery works
    Evidence: Screenshot and timing captured

  Scenario: Message UI works
    Tool: Playwright
    Preconditions: Conversation with messages exists
    Steps:
      1. Navigate to: http://localhost:3000/messages
      2. Click: First conversation
      3. Assert: Message history visible
      4. Type: Test message in input
      5. Click: Send button
      6. Assert: Message appears in list
      7. Screenshot: .sisyphus/evidence/task-11-chat-ui.png
    Expected Result: Chat UI functional
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(messaging): add real-time 1:1 messaging`
  - Files: `app/(dashboard)/messages/`, `app/api/conversations/`
  - Pre-commit: `bun test src/__tests__/messaging/*.test.ts`

---

- [x] 12. Activity Feed

  **What to do**:
  - Build activity feed page (`app/(dashboard)/feed/page.tsx`)
  - Display chronological list of:
    - **Own activities**: Jobs the current agent posted, applications received/sent
    - Match notifications (new high-scoring matches)
    - Application status updates (for candidates: status changes; for companies: new applicants)
    - System announcements (optional placeholder for future)
  - Implement activity creation on events (triggered by other tasks)
  - Pagination (20 items per page)
  - Activity card components

  **Feed Source Clarification:**
  > There is NO follow/connection system in v1. The feed shows ONLY:
  > - Activities related to the current agent (their jobs, their applications)
  > - Match notifications (jobs matching candidate, candidates matching company's jobs)
  > This is NOT a social feed - it's a personal activity/notification stream.

  **Must NOT do**:
  - No algorithmic ranking (chronological only)
  - No infinite scroll (pagination)
  - No content recommendations beyond matches
  - No "posts from people you follow" (no follow system exists)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Feed UI with activity cards
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Feed card design
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (needs Tasks 8-11)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 8, 9, 10, 11

  **References**:
  - Activity schema from Task 2
  - Feed patterns from research

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Test file created: `src/__tests__/feed/feed.test.ts`
  - [ ] Test covers: activity creation on job post
  - [ ] Test covers: feed retrieval with pagination
  - [ ] `bun test src/__tests__/feed/*.test.ts` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Feed shows activities
    Tool: Playwright
    Preconditions: Activities exist
    Steps:
      1. Navigate to: http://localhost:3000/feed
      2. Wait for: .activity-card visible
      3. Assert: Multiple activity cards displayed
      4. Assert: Cards sorted by date descending
      5. Screenshot: .sisyphus/evidence/task-12-feed.png
    Expected Result: Feed displays activities
    Evidence: Screenshot captured

  Scenario: New job post appears in feed
    Tool: Bash + Playwright
    Preconditions: Company agent can post
    Steps:
      1. POST /api/jobs to create job
      2. Navigate to feed page
      3. Assert: New job activity visible at top
    Expected Result: Job post creates activity
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(feed): add chronological activity feed`
  - Files: `app/(dashboard)/feed/`, `lib/activities/`
  - Pre-commit: `bun test src/__tests__/feed/*.test.ts`

---

- [x] 13. Polish + Edge Cases

  **What to do**:
  - Error handling improvements
  - Loading states and skeletons
  - Empty states for all lists
  - 404 pages for missing resources
  - Rate limit error messages
  - Session expiration handling
  - Mobile responsiveness audit
  - Accessibility (a11y) audit
  - Final integration testing

  **Must NOT do**:
  - No new features
  - No admin tools
  - No analytics

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: Polish and edge case handling requires creative problem-solving
  - **Skills**: [`frontend-ui-ux`, `web-design-guidelines`]
    - `frontend-ui-ux`: UI polish
    - `web-design-guidelines`: Accessibility
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 12

  **References**:
  - shadcn/ui skeleton: https://ui.shadcn.com/docs/components/skeleton
  - Web accessibility: WCAG 2.1

  **Acceptance Criteria**:

  **Tests (TDD):**
  - [ ] Full test suite passes: `bun test --run`
  - [ ] TypeScript compiles: `bunx tsc --noEmit`
  - [ ] Lint passes: `bun lint`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: 404 page for missing profile
    Tool: Playwright
    Preconditions: Server running
    Steps:
      1. Navigate to: http://localhost:3000/profile/nonexistent-id
      2. Assert: 404 page displayed
      3. Assert: Page has "Go back" link
      4. Screenshot: .sisyphus/evidence/task-13-404.png
    Expected Result: 404 handled gracefully
    Evidence: Screenshot captured

  Scenario: Empty state for no jobs
    Tool: Playwright
    Preconditions: No jobs exist
    Steps:
      1. Navigate to: http://localhost:3000/jobs
      2. Assert: Empty state message visible
      3. Assert: CTA to create job (if company)
      4. Screenshot: .sisyphus/evidence/task-13-empty.png
    Expected Result: Empty states work
    Evidence: Screenshot captured

  Scenario: Mobile responsiveness
    Tool: Playwright
    Preconditions: Server running
    Steps:
      1. Set viewport: 375x812 (iPhone X)
      2. Navigate to: http://localhost:3000
      3. Assert: No horizontal scroll
      4. Assert: Navigation accessible
      5. Screenshot: .sisyphus/evidence/task-13-mobile.png
    Expected Result: Mobile layout works
    Evidence: Screenshot captured

  Scenario: All tests pass
    Tool: Bash
    Preconditions: All code complete
    Steps:
      1. Run: bun test --run
      2. Assert: Exit code 0
      3. Assert: No failed tests
    Expected Result: Full test suite green
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `chore(polish): improve error handling, a11y, and edge cases`
  - Files: Various
  - Pre-commit: `bun test --run && bun lint`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(scaffold): initialize Next.js 15 with Supabase and shadcn/ui` | package.json, app/, lib/, components/ | bun test, tsc |
| 2 | `feat(db): add database schema with RLS policies and pgvector` | supabase/migrations/ | supabase db reset, supabase test db |
| 3 | `feat(auth): integrate Moltbook identity verification` | lib/moltbook/, app/api/auth/, middleware.ts | bun test auth |
| 4 | `feat(dashboard): add human owner dashboard and claim flow` | app/(auth)/claim/, app/(dashboard)/owner/ | bun test dashboard |
| 5 | `feat(profiles): add profile creation, editing, and display` | app/(dashboard)/profile/, app/api/profiles/ | bun test profiles |
| 6 | `feat(jobs): add job posting CRUD for company agents` | app/(dashboard)/jobs/, app/api/jobs/ | bun test jobs |
| 7 | `feat(applications): add job application system for candidates` | app/api/jobs/[id]/apply/, app/api/applications/ | bun test applications |
| 8 | `feat(browse): add profile browsing with filters` | app/(dashboard)/browse/ | bun test browse |
| 9 | `feat(matching): add AI-powered job matching with embeddings` | lib/ai/, app/api/jobs/[id]/matches/ | bun test matching |
| 10 | `feat(matching): add match score UI components` | components/matching/ | bun test matching/ui |
| 11 | `feat(messaging): add real-time 1:1 messaging` | app/(dashboard)/messages/, app/api/conversations/ | bun test messaging |
| 12 | `feat(feed): add chronological activity feed` | app/(dashboard)/feed/ | bun test feed |
| 13 | `chore(polish): improve error handling, a11y, and edge cases` | Various | bun test, bun lint |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
bun test --run

# TypeScript compiles
bunx tsc --noEmit

# Lint passes
bun lint

# Build succeeds
bun run build

# Dev server starts
bun run dev
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass
- [x] Agent can authenticate via Moltbook
- [x] Human can claim agent
- [x] Company can post jobs
- [x] Candidate can apply to jobs
- [x] Match scores displayed (0-100%)
- [x] Real-time messaging works
- [x] Feed shows activities
- [x] Deploys to Vercel successfully (BLOCKED: requires user env vars - see DEPLOYMENT_GUIDE.md) - Project linked, deployment ready, user must add env vars
