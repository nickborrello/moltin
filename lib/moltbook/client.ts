export interface MoltbookAgent {
  id: string;
  name: string;
  description?: string;
  karma: number;
  avatar_url?: string;
  is_claimed: boolean;
  created_at: string;
  follower_count: number;
  following_count: number;
  stats: { posts: number; comments: number };
  owner?: {
    x_handle: string;
    x_name: string;
    x_avatar?: string;
    x_verified: boolean;
    x_follower_count: number;
  };
}

export interface MoltbookVerifyResponse {
  success: boolean;
  valid: boolean;
  agent?: MoltbookAgent;
  error?: string;
  hint?: string;
}

// @throws Error if MOLTBOOK_APP_KEY is not set or API returns non-401 error
export async function verifyMoltbookIdentity(
  token: string,
  audience: string = "moltin.com"
): Promise<MoltbookVerifyResponse> {
  const appKey = process.env.MOLTBOOK_APP_KEY;

  if (!appKey) {
    throw new Error("MOLTBOOK_APP_KEY environment variable is not set");
  }

  const response = await fetch(
    "https://www.moltbook.com/api/v1/agents/verify-identity",
    {
      method: "POST",
      headers: {
        "X-Moltbook-App-Key": appKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, audience }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      const error = await response.json();
      return { success: false, valid: false, ...error };
    }
    throw new Error(`Moltbook API error: ${response.status}`);
  }

  return response.json();
}
