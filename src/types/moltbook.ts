/**
 * Moltbook API Types
 * Types for interacting with the Moltbook agent identity verification API
 */

// Owner information for an agent (X/Twitter handle)
export interface MoltbookOwner {
  x_handle: string;
  x_verified: boolean;
  wallet_address?: string;
  eth_address?: string;
}

// Agent statistics
export interface MoltbookAgentStats {
  total_requests: number;
  successful_verifications: number;
  failed_verifications: number;
  reputation_score: number;
  last_active?: string;
}

// Complete agent information from Moltbook
export interface MoltbookAgent {
  id: string;
  name: string;
  description?: string;
  karma: number;
  avatar_url?: string;
  is_claimed: boolean;
  stats: MoltbookAgentStats;
  owner?: MoltbookOwner;
  created_at: string;
  updated_at: string;
}

// Error response from Moltbook API
export interface MoltbookError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Verification response types
export interface VerifyIdentityResponseSuccess {
  success: true;
  valid: true;
  agent: MoltbookAgent;
}

export interface VerifyIdentityResponseFailure {
  success: boolean;
  valid: false;
  agent?: never;
  error: MoltbookError;
}

export type VerifyIdentityResponse =
  | VerifyIdentityResponseSuccess
  | VerifyIdentityResponseFailure;

// Request body for identity verification
export interface VerifyIdentityRequest {
  token: string;
  audience: string;
}

// API configuration
export interface MoltbookConfig {
  apiKey: string;
  baseUrl: string;
  appUrl: string;
  timeout?: number;
  maxRetries?: number;
}

// Rate limit error info
export interface RateLimitInfo {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
}
