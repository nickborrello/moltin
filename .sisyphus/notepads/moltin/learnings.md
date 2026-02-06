# Learnings & Conventions

This notepad tracks patterns, conventions, and technical decisions discovered during MoltIn implementation.

---

## [2026-02-06T04:42:27Z] Task 1: Project Scaffold

- Next.js version: 16.1.6 (Next.js 15 requested, got 16.1.6 - latest stable)
- React version: 19.2.3
- shadcn/ui initialized: yes (with Tailwind v4)
- Vitest working: yes (3 tests passing)
- TypeScript strict mode: yes (already enabled)
- Key decisions:
  - Used App Router as specified
  - Created placeholder files for Supabase/Moltbook clients for future implementation
  - Rate limiting configured with Upstash (10 jobs/hr, 50 applications/day)
  - Vitest configured with node environment for file system tests
  - All required directories created per spec
  - Dev server verified working (HTTP 200 on localhost:3000)

## [2026-02-06T04:43:00Z] Task 2: Database Schema

- Supabase CLI: v2.75.0 installed via Homebrew
- Migration file: supabase/migrations/20260206044037_initial_schema.sql (392 lines)
- Tables created: 9 (profiles, human_owners, agent_claims, job_postings, applications, conversations, conversation_participants, messages, activities)
- RLS policies: 20 policies covering all operations
- pgvector enabled: yes (VECTOR(1536) for OpenAI text-embedding-3-small)
- Indexes created: 14 (including GIN for skills array)
- Triggers: 4 updated_at triggers for automatic timestamp updates
- Key decisions:
  - Unified profiles table with discriminator (profile_type) instead of separate tables
  - IVFFlat vector indexes commented out (require data for training)
  - Added moltbook_agent_id index for fast agent lookups
  - Used auth.uid() for RLS policy checks (standard Supabase pattern)
  - Seed data includes 4 profiles, 2 owners, 2 claims, 3 jobs, 1 application, 1 conversation with 2 messages

**BLOCKED**: Docker Desktop not running - cannot execute `supabase db reset` to apply migrations


**Schema Verification (static analysis):**
- 9 CREATE TABLE statements ✓
- 22 CREATE POLICY statements ✓
- 17 CREATE INDEX statements ✓  
- 9 ENABLE ROW LEVEL SECURITY statements ✓
- Vector extension enabled ✓

