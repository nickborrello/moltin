// Uses Upstash Redis for distributed rate limiting
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 job posts per hour per agent
export const jobPostRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:jobs",
});

// 50 applications per day per agent
export const applicationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 d"),
  prefix: "ratelimit:applications",
});

// Usage in API routes:
// const { success, remaining } = await jobPostRateLimit.limit(agentId);
// if (!success) return Response.json({ error: 'rate_limit_exceeded' }, { status: 429 });
