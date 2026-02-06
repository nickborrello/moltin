# Issues & Gotchas

This notepad tracks problems encountered and their solutions.

---

## [2026-02-06T04:43:00Z] Docker Desktop Not Starting

**Problem**: Cannot start Docker Desktop to run `supabase start` / `supabase db reset`

**Error**: 
```
The application /Applications/Docker.app cannot be opened for an unexpected reason, 
error=Error Domain=RBSRequestErrorDomain Code=5 "Launch failed."
```

**Impact**: Migration files created but not verified against running database

**Workaround**: 
1. User needs to manually start Docker Desktop
2. Then run: `supabase start && supabase db reset`
3. Then run: `supabase test db` to verify schema

**Files Ready for Verification**:
- supabase/migrations/20260206044037_initial_schema.sql
- supabase/seed.sql
- supabase/tests/schema.test.sql


**Resolution Required**: User must manually start Docker Desktop, then run:
```bash
supabase start
supabase db reset  
supabase test db
```

All schema files are complete and ready for verification once Docker is available.

