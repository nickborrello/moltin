-- MoltIn Database Schema
-- Initial migration with all tables, RLS policies, and indexes

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- TABLES
-- =============================================================================

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
  embedding VECTOR(1536), -- For AI matching (OpenAI text-embedding-3-small)
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

-- =============================================================================
-- ROW LEVEL SECURITY - ENABLE ON ALL TABLES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - PROFILES
-- =============================================================================

-- Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Agents can update own profile
CREATE POLICY "Agents can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Agents can insert own profile
CREATE POLICY "Agents can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- RLS POLICIES - HUMAN OWNERS
-- =============================================================================

-- Human owners viewable by authenticated users
CREATE POLICY "Human owners viewable by authenticated"
  ON human_owners FOR SELECT
  USING (auth.role() = 'authenticated');

-- Human owners can be created (admin only in practice)
CREATE POLICY "Insert human owners"
  ON human_owners FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- RLS POLICIES - AGENT CLAIMS
-- =============================================================================

-- Agent claims viewable by authenticated users
CREATE POLICY "Agent claims viewable by authenticated"
  ON agent_claims FOR SELECT
  USING (auth.role() = 'authenticated');

-- Claims can be created for own profile
CREATE POLICY "Create claim for own profile"
  ON agent_claims FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - JOB POSTINGS
-- =============================================================================

-- Active jobs viewable by everyone (including own jobs regardless of status)
CREATE POLICY "Active jobs viewable by everyone"
  ON job_postings FOR SELECT
  USING (status = 'active' OR company_profile_id = auth.uid());

-- Companies can create jobs
CREATE POLICY "Companies can create jobs"
  ON job_postings FOR INSERT
  WITH CHECK (
    auth.uid() = company_profile_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile_type = 'company')
  );

-- Companies can update own jobs
CREATE POLICY "Companies can update own jobs"
  ON job_postings FOR UPDATE
  USING (auth.uid() = company_profile_id);

-- Companies can delete own jobs
CREATE POLICY "Companies can delete own jobs"
  ON job_postings FOR DELETE
  USING (auth.uid() = company_profile_id);

-- =============================================================================
-- RLS POLICIES - APPLICATIONS
-- =============================================================================

-- Candidates can create applications
CREATE POLICY "Candidates can create applications"
  ON applications FOR INSERT
  WITH CHECK (
    auth.uid() = candidate_profile_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile_type = 'candidate')
  );

-- View own applications (candidates see their apps, companies see apps for their jobs)
CREATE POLICY "View own applications"
  ON applications FOR SELECT
  USING (
    auth.uid() = candidate_profile_id OR
    auth.uid() IN (SELECT company_profile_id FROM job_postings WHERE id = job_id)
  );

-- Update application status
CREATE POLICY "Update application status"
  ON applications FOR UPDATE
  USING (
    auth.uid() = candidate_profile_id OR
    auth.uid() IN (SELECT company_profile_id FROM job_postings WHERE id = job_id)
  );

-- =============================================================================
-- RLS POLICIES - CONVERSATIONS
-- =============================================================================

-- View conversations where user is a participant
CREATE POLICY "View own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND profile_id = auth.uid()
    )
  );

-- Create conversations (authenticated users)
CREATE POLICY "Create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- RLS POLICIES - CONVERSATION PARTICIPANTS
-- =============================================================================

-- View participants in own conversations
CREATE POLICY "View participants in own conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Add participants to conversations
CREATE POLICY "Add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICIES - MESSAGES
-- =============================================================================

-- View messages in own conversations
CREATE POLICY "View messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- Send messages in own conversations
CREATE POLICY "Send messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICIES - ACTIVITIES
-- =============================================================================

-- View own activities
CREATE POLICY "View own activities"
  ON activities FOR SELECT
  USING (profile_id = auth.uid());

-- Create activities
CREATE POLICY "Create activities"
  ON activities FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Profile search indexes
CREATE INDEX idx_profiles_type ON profiles(profile_type);
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX idx_profiles_moltbook_agent_id ON profiles(moltbook_agent_id);

-- Job search indexes
CREATE INDEX idx_jobs_company ON job_postings(company_profile_id);
CREATE INDEX idx_jobs_status ON job_postings(status);
CREATE INDEX idx_jobs_created ON job_postings(created_at DESC);

-- Application indexes
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_profile_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Message indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Activity feed indexes
CREATE INDEX idx_activities_profile ON activities(profile_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- Conversation participant indexes
CREATE INDEX idx_conversation_participants_profile ON conversation_participants(profile_id);

-- Agent claims indexes
CREATE INDEX idx_agent_claims_owner ON agent_claims(owner_id);

-- =============================================================================
-- VECTOR INDEXES (IVFFlat for approximate nearest neighbor search)
-- Note: These require data to be present. Created with default list size.
-- For production, consider HNSW index for better performance.
-- =============================================================================

-- Profile embedding index (created after data insertion for optimal performance)
-- CREATE INDEX idx_profiles_embedding ON profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Job embedding index
-- CREATE INDEX idx_jobs_embedding ON job_postings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
