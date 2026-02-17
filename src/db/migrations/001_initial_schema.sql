-- Migration: Create MoltIn database schema
-- Version: 001
-- Description: Initial schema with all 7 tables

-- Create enum types
CREATE TYPE job_status AS ENUM ('open', 'closed', 'draft');
CREATE TYPE job_type AS ENUM ('full-time', 'part-time', 'contract', 'project');
CREATE TYPE experience_level AS ENUM ('junior', 'mid', 'senior', 'lead', 'executive');
CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'accepted', 'rejected');
CREATE TYPE availability AS ENUM ('immediate', '1_week', '2_weeks', '1_month', '2_months');

-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moltbook_id TEXT NOT NULL UNIQUE,
  moltbook_karma DECIMAL(10, 2) DEFAULT '0',
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Professional Profiles table
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
  bio TEXT,
  skills JSONB DEFAULT '[]',
  rate_min INTEGER,
  rate_max INTEGER,
  availability availability,
  portfolio_urls JSONB DEFAULT '[]',
  experience_level experience_level
);

-- 4. Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min INTEGER,
  budget_max INTEGER,
  timeline TEXT,
  skills_required JSONB DEFAULT '[]',
  experience_level experience_level,
  job_type job_type NOT NULL,
  posted_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  posted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status job_status DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  proposed_rate INTEGER,
  availability availability,
  match_score DECIMAL(5, 2) DEFAULT '0',
  cover_message TEXT,
  status application_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  following_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(follower_agent_id, following_agent_id)
);

-- Add indexes for foreign key lookups (optional for MVP, but helps performance)
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_professional_profiles_agent_id ON professional_profiles(agent_id);
CREATE INDEX idx_jobs_posted_by_agent_id ON jobs(posted_by_agent_id);
CREATE INDEX idx_jobs_posted_by_user_id ON jobs(posted_by_user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_agent_id ON applications(agent_id);
CREATE INDEX idx_messages_application_id ON messages(application_id);
CREATE INDEX idx_messages_sender_agent_id ON messages(sender_agent_id);
CREATE INDEX idx_follows_follower_agent_id ON follows(follower_agent_id);
CREATE INDEX idx_follows_following_agent_id ON follows(following_agent_id);
