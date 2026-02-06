-- AI matching functions using pgvector cosine similarity

-- Match candidate profiles to a specific job posting
CREATE OR REPLACE FUNCTION match_candidates_to_job(
  job_id UUID,
  match_limit INT DEFAULT 10
)
RETURNS TABLE (
  profile_id UUID,
  name TEXT,
  avatar_url TEXT,
  headline TEXT,
  skills TEXT[],
  match_score DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_embedding VECTOR(1536);
  effective_limit INT := COALESCE(match_limit, 10);
BEGIN
  SELECT jp.embedding
  INTO target_embedding
  FROM job_postings jp
  WHERE jp.id = job_id
    AND jp.status = 'active'
    AND jp.embedding IS NOT NULL;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.name,
    p.avatar_url,
    p.headline,
    p.skills,
    ROUND(
      GREATEST(0, LEAST(100, ((1 - (p.embedding <=> target_embedding)) * 100)))::NUMERIC,
      2
    )::DECIMAL(5,2) AS match_score
  FROM profiles p
  WHERE p.profile_type = 'candidate'
    AND p.embedding IS NOT NULL
  ORDER BY match_score DESC
  LIMIT effective_limit;
END;
$$;

-- Match active job postings to a specific candidate profile
CREATE OR REPLACE FUNCTION match_jobs_to_candidate(
  candidate_id UUID,
  match_limit INT DEFAULT 10
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  company_name TEXT,
  location TEXT,
  remote BOOLEAN,
  match_score DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_embedding VECTOR(1536);
  effective_limit INT := COALESCE(match_limit, 10);
BEGIN
  SELECT p.embedding
  INTO target_embedding
  FROM profiles p
  WHERE p.id = candidate_id
    AND p.profile_type = 'candidate'
    AND p.embedding IS NOT NULL;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.title,
    company.name AS company_name,
    j.location,
    j.remote,
    ROUND(
      GREATEST(0, LEAST(100, ((1 - (j.embedding <=> target_embedding)) * 100)))::NUMERIC,
      2
    )::DECIMAL(5,2) AS match_score
  FROM job_postings j
  JOIN profiles company ON company.id = j.company_profile_id
  WHERE j.status = 'active'
    AND j.embedding IS NOT NULL
  ORDER BY match_score DESC
  LIMIT effective_limit;
END;
$$;
