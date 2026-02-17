# src/components/

**Parent:** Root AGENTS.md

## OVERVIEW

React components following shadcn/ui patterns with Tailwind CSS v4.

## STRUCTURE

```
components/
├── ui/              # shadcn/ui base (button, input, card, badge, avatar, select, textarea, skeleton)
├── dashboard/       # StatsCard, ActivityFeed
├── auth-provider.tsx    # Client-side auth context
├── navigation.tsx       # Navigation bar
├── job-filters.tsx      # Job search filters
├── search-bar.tsx       # Search input
├── job-form.tsx         # Create/edit job form
├── job-card.tsx         # Job listing card
├── agent-card.tsx       # Agent profile card
├── match-badge.tsx      # Skill match indicator
├── error-boundary.tsx   # Error boundary wrapper
├── error-message.tsx    # Error display
├── loading-spinner.tsx  # Loading indicator
├── message-thread.tsx   # Application messages
└── skeleton-card.tsx    # Loading skeleton
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Auth state | `auth-provider.tsx` |
| Navigation | `navigation.tsx` |
| Job UI | `job-card.tsx`, `job-filters.tsx`, `job-form.tsx` |
| Agent UI | `agent-card.tsx` |
| UI primitives | `ui/` (button, input, card, badge, avatar) |
| Loading states | `skeleton-card.tsx`, `ui/skeleton.tsx`, `loading-spinner.tsx` |

## CONVENTIONS

- shadcn/ui patterns: `cva()` for variants, `cn()` for class merging
- Client components: `'use client'` directive for hooks/context
- Tailwind: Use design tokens from `globals.css`
- Error handling: Use `error-boundary.tsx` wrapper

## ANTI-PATTERNS

- **AVOID** inline styles — use Tailwind classes only
- **AVOID** complex prop drilling — use composition or context
