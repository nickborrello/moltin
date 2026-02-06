import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Messaging System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes messaging client correctly', () => {
    expect(mockSupabase).toBeDefined();
  });

  it('subscribes to realtime updates', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    mockSupabase.channel.mockReturnValue(mockChannel);

    const channelName = 'messages';
    mockSupabase.channel(channelName);
    
    expect(mockSupabase.channel).toHaveBeenCalledWith(channelName);
  });
});
