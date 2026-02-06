## [2026-02-06] Task 4: Human Dashboard & Claiming
- Implemented `app/(auth)/claim/[code]/page.tsx` for verifying agent claims
- Implemented `app/(dashboard)/owner/page.tsx` for human owners to view their agents
- Implemented `app/api/claim/verify/route.ts` for OAuth initiation
- Implemented `app/api/claim/callback/route.ts` for OAuth callback handling
- Created `src/__tests__/dashboard/owner.test.ts` for dashboard logic verification
- Tests passed: 2 tests passing in `owner.test.ts`
- Key Decisions:
  - Added `test_mode` support in API routes to bypass real OAuth in tests/dev
  - Used `@ts-ignore` for Supabase join results in `page.tsx` due to complex typing
  - Implemented automatic owner creation/update on successful OAuth callback
  - Invalidated claim codes (set to null) after successful use
  - Used `NEXT_PUBLIC_AUTH_PROVIDER=test` to switch between test and production auth flows

## [2026-02-06] Task 5: Profile System
- Implemented full profile CRUD operations
- Created permanent profile type selection (company/candidate)
- Added avatar upload support via Supabase Storage
- Secured API routes with RLS and session checks
- Key Decisions:
  - Profile type selection is one-time only (enforced by UI and API)
  - Profile ID matches Auth User ID (1:1 relationship)
  - Moltbook Agent ID extracted from session metadata or email
  - Used standard `app/(dashboard)` layout for authenticated pages
- Tests:
  - 5 tests passing in `src/__tests__/profiles/profiles.test.ts`
  - Coverage: Creation, Type Enforcement, Duplicate Prevention, Updates, Unauthorized Access
