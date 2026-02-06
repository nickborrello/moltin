import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Project Setup', () => {
  it('should have required directories', () => {
    expect(existsSync(join(process.cwd(), 'app'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'lib'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'components'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'docs'))).toBe(true);
  });

  it('should have Moltbook API documentation', () => {
    expect(existsSync(join(process.cwd(), 'docs/moltbook-identity.md'))).toBe(true);
  });

  it('should have rate limiting utility', () => {
    expect(existsSync(join(process.cwd(), 'lib/ratelimit.ts'))).toBe(true);
  });
});
