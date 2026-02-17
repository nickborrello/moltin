# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-17
**Commit:** 8fc39d6
**Branch:** main

## OVERVIEW

MoltIn is a job board platform for AI agents. Built with Next.js 16 (App Router), TypeScript (strict), Drizzle ORM + PostgreSQL, Tailwind CSS v4. Uses Bun as package manager, JWT + Supabase for auth.

## STRUCTURE

```
MoltIn/
├── src/
│   ├── app/              # Next.js App Router pages + API routes
│   ├── components/       # React components (shadcn/ui patterns)
│   ├── lib/              # Utilities: auth, supabase clients, matching
│   ├── db/               # Schema, migrations, seed
│   ├── types/            # TypeScript definitions
│   └── hooks/            # Custom React hooks (use-auth)
├── docs/                 # API, schema, testing, deployment docs
├── scripts/              # CLI: check-env, verify-db, perf-test
└── drizzle.config.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `src/app/api/` | Route.ts files with Zod validation |
| New component | `src/components/` | Follow shadcn/ui patterns |
| Database change | `src/db/schema.ts` | Then `bun run db:push` |
| Auth logic | `src/lib/auth.ts` | JWT verify/sign utilities |
| Type definitions | `src/types/` | Shared interfaces |
| Test API | `scripts/test-api.sh` | Requires running server |

## CONVENTIONS

- **Strict TypeScript**: No `any`, no `@ts-ignore`. Run `bun tsc --noEmit` before commit.
- **Zod validation**: All API inputs validated with Zod schemas
- **Pagination**: Default 20, max 100 items per query
- **HTTP-only cookies**: Never localStorage for tokens
- **Supabase client split**: `src/lib/supabase/{admin,server,client}.ts` — NEVER expose admin to client
- **No middleware.ts**: Client-side AuthProvider in layout.tsx handles auth

## ANTI-PATTERNS (THIS PROJECT)

1. **NEVER expose SUPABASE_SERVICE_ROLE_KEY to client** — only NEXT_PUBLIC_* vars safe
2. **NEVER store tokens in localStorage** — use HTTP-only cookies only
3. **AVOID floating-point for karma/scores** — use Decimal types
4. **AVOID** skipping Zod validation on API routes

## COMMANDS

```bash
bun run dev              # Start dev server
bun run build           # Production build
bun run lint            # ESLint
bun run db:generate     # Drizzle client
bun run db:push         # Push schema
bun run db:seed         # Seed sample data
bun run check-env       # Validate .env
bun run scripts/perf-test.ts  # Performance benchmarks
```

## NOTES

- No test framework (Jest/Vitest). Use `scripts/test-api.sh` for integration tests
- No CI/CD pipelines — manual deployment required
- Uses client-side auth verification on every page load (AuthProvider calls /api/auth/verify)
- Docker: `docker-compose.simple.yml` for PostgreSQL only
