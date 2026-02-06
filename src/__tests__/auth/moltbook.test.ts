import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { verifyMoltbookIdentity } from "@/lib/moltbook/client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeAll(() => {
  process.env.MOLTBOOK_APP_KEY = "test_app_key";
});

describe("verifyMoltbookIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify valid token successfully", async () => {
    const mockResponse = {
      success: true,
      valid: true,
      agent: {
        id: "test-agent-id",
        name: "TestAgent",
        karma: 100,
        is_claimed: true,
        created_at: "2025-01-01T00:00:00Z",
        follower_count: 10,
        following_count: 5,
        stats: { posts: 50, comments: 100 },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await verifyMoltbookIdentity("valid_token");

    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.agent?.name).toBe("TestAgent");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.moltbook.com/api/v1/agents/verify-identity",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-Moltbook-App-Key": "test_app_key",
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("should return error for invalid token", async () => {
    const mockResponse = {
      success: false,
      valid: false,
      error: "invalid_token",
      hint: "Token is malformed or expired",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => mockResponse,
    });

    const result = await verifyMoltbookIdentity("invalid_token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_token");
    expect(result.hint).toBe("Token is malformed or expired");
  });

  it("should handle expired token", async () => {
    const mockResponse = {
      success: false,
      valid: false,
      error: "identity_token_expired",
      hint: "Request a new identity token from Moltbook",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => mockResponse,
    });

    const result = await verifyMoltbookIdentity("expired_token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("identity_token_expired");
    expect(result.hint).toContain("Request a new identity token");
  });

  it("should handle agent not found", async () => {
    const mockResponse = {
      success: false,
      valid: false,
      error: "agent_not_found",
      hint: "The agent associated with this token does not exist",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => mockResponse,
    });

    const result = await verifyMoltbookIdentity("unknown_agent_token");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("agent_not_found");
  });

  it("should handle audience mismatch", async () => {
    const mockResponse = {
      success: false,
      valid: false,
      error: "audience_mismatch",
      hint: "Token was not issued for this audience",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => mockResponse,
    });

    const result = await verifyMoltbookIdentity("wrong_audience_token", "other.com");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("audience_mismatch");
  });

  it("should throw on non-401 API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(verifyMoltbookIdentity("any_token")).rejects.toThrow(
      "Moltbook API error: 500"
    );
  });

  it("should throw when MOLTBOOK_APP_KEY is not set", async () => {
    const originalKey = process.env.MOLTBOOK_APP_KEY;
    delete process.env.MOLTBOOK_APP_KEY;

    await expect(verifyMoltbookIdentity("any_token")).rejects.toThrow(
      "MOLTBOOK_APP_KEY environment variable is not set"
    );

    process.env.MOLTBOOK_APP_KEY = originalKey;
  });

  it("should use default audience when not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, valid: true, agent: {} }),
    });

    await verifyMoltbookIdentity("token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ token: "token", audience: "moltin.com" }),
      })
    );
  });

  it("should use custom audience when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, valid: true, agent: {} }),
    });

    await verifyMoltbookIdentity("token", "custom.com");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ token: "token", audience: "custom.com" }),
      })
    );
  });
});
