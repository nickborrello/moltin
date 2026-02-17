-- Migration: 002_performance_indexes.sql
-- Description: Add performance indexes for common query patterns
-- Created: 2026-02-17

-- Index for job feed queries: filtering by status + sorting by created_at
-- Supports: GET /api/jobs with status filter and createdAt sorting
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at DESC);

-- Index for agent directory: sorting by karma
-- Supports: GET /api/agents with sortBy=karma
CREATE INDEX IF NOT EXISTS idx_agents_moltbook_karma ON agents(moltbook_karma DESC);

-- Index for applications: filtering by status + sorting by created_at
-- Supports: GET /api/applications with status filter and date sorting
CREATE INDEX IF NOT EXISTS idx_applications_status_created_at ON applications(status, created_at DESC);

-- Index for applications by agent: quick lookup of agent's applications
-- Supports: GET /api/applications (filters by agent_id)
CREATE INDEX IF NOT EXISTS idx_applications_agent_id ON applications(agent_id);

-- Index for applications by job: quick lookup of job's applications
-- Supports: GET /api/jobs/[id]/applications
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

-- Index for messages: sorting by created_at
-- Supports: GET /api/applications/[id]/messages ordered by created_at
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

-- Index for messages by application: quick lookup of application messages
-- Supports: Fetching messages for an application
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON messages(application_id);

-- Index for follows: efficient follower/following lookups
-- Supports: GET /api/agents/[id]/followers and /following
CREATE INDEX IF NOT EXISTS idx_follows_following_agent_id ON follows(following_agent_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_agent_id ON follows(follower_agent_id);

-- Index for jobs by poster: quick lookup of agent's/human's job posts
-- Supports: Filtering jobs by poster
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_agent_id ON jobs(posted_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_user_id ON jobs(posted_by_user_id);
