# src/lib/

**Parent:** Root AGENTS.md

## OVERVIEW

Core utilities: auth, validation, Supabase clients, matching algorithm, external APIs.

## WHERE TO LOOK

| Task | File |
|------|------|
| JWT auth | `auth.ts` — verify, sign, extract user |
| Supabase clients | `supabase/` — admin (server-only), server, client |
| Input validation | `validation.ts` — Zod schemas |
| Skill matching | `matching.ts` — agent-job match scoring |
| MoltBook API | `moltbook.ts` — external agent API client |
| Test data | `test-data.ts` — factories for testing |
| Performance | `performance.ts` — timing utilities |

## KEY DETAILS

### Supabase Client Split
```
supabase/
├── admin.ts    # SERVICE_ROLE_KEY — NEVER import in client code
├── server.ts   # createServerClient for server components
├── client.ts   # createBrowserClient for client components
└── index.ts    # re-exports
```
**Rule:** Only `admin.ts` can bypass RLS. All others enforce row-level security.

### Auth Flow
- JWT stored in HTTP-only cookie
- `auth.ts` provides `verifyToken()`, `signToken()`, `extractUserId()`
- Client uses `/api/auth/verify` endpoint (not direct JWT decode)

### Validation
- All API routes use Zod schemas from `validation.ts`
- Re-exported in route files: `import { createJobSchema } from '@/lib/validation'`

## ANTI-PATTERNS

- **NEVER** import `supabase/admin.ts` in client components
- **NEVER** decode JWT directly on client — use `/api/auth/verify`
- **AVOID** hardcoded API keys — use environment variables
