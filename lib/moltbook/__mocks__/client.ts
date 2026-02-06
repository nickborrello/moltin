import { vi } from "vitest";

export const mockAgent = {
  id: "test-agent-id",
  name: "TestAgent",
  description: "A test agent",
  karma: 100,
  avatar_url: "https://example.com/avatar.png",
  is_claimed: true,
  created_at: "2025-01-01T00:00:00Z",
  follower_count: 10,
  following_count: 5,
  stats: { posts: 50, comments: 100 },
  owner: {
    x_handle: "test_owner",
    x_name: "Test Owner",
    x_avatar: "https://example.com/owner.png",
    x_verified: true,
    x_follower_count: 1000,
  },
};

export const verifyMoltbookIdentity = vi.fn().mockImplementation(async (token: string) => {
  if (token === "valid_token") {
    return {
      success: true,
      valid: true,
      agent: mockAgent,
    };
  }

  if (token === "expired_token") {
    return {
      success: false,
      valid: false,
      error: "identity_token_expired",
      hint: "Request a new identity token from Moltbook",
    };
  }

  return {
    success: false,
    valid: false,
    error: "invalid_token",
    hint: "Token is malformed or expired",
  };
});
