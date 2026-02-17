import type { MoltbookError, RateLimitInfo } from '@/types/moltbook';

export const MOLTBOOK_ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type MoltbookErrorCode =
  (typeof MOLTBOOK_ERROR_CODES)[keyof typeof MOLTBOOK_ERROR_CODES];

export class MoltbookAPIError extends Error {
  code: MoltbookErrorCode;
  statusCode?: number;
  details?: Record<string, unknown>;
  isRetryable: boolean;
  rateLimitInfo?: RateLimitInfo;

  constructor(
    message: string,
    code: MoltbookErrorCode,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      isRetryable?: boolean;
      rateLimitInfo?: RateLimitInfo;
    }
  ) {
    super(message);
    this.name = 'MoltbookAPIError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.isRetryable = options?.isRetryable ?? false;
    this.rateLimitInfo = options?.rateLimitInfo;
  }
}

export class MoltbookTokenExpiredError extends MoltbookAPIError {
  constructor(message = 'The identity token has expired') {
    super(message, MOLTBOOK_ERROR_CODES.TOKEN_EXPIRED, { isRetryable: false });
    this.name = 'MoltbookTokenExpiredError';
  }
}

export class MoltbookTokenInvalidError extends MoltbookAPIError {
  constructor(message = 'The identity token is invalid') {
    super(message, MOLTBOOK_ERROR_CODES.TOKEN_INVALID, { isRetryable: false });
    this.name = 'MoltbookTokenInvalidError';
  }
}

export class MoltbookRateLimitError extends MoltbookAPIError {
  constructor(message = 'Rate limit exceeded', rateLimitInfo?: RateLimitInfo) {
    super(message, MOLTBOOK_ERROR_CODES.RATE_LIMITED, {
      isRetryable: true,
      rateLimitInfo,
    });
    this.name = 'MoltbookRateLimitError';
  }
}

export class MoltbookServerError extends MoltbookAPIError {
  constructor(message = 'Moltbook server error', statusCode?: number) {
    super(message, MOLTBOOK_ERROR_CODES.SERVER_ERROR, {
      statusCode,
      isRetryable: statusCode ? statusCode >= 500 : true,
    });
    this.name = 'MoltbookServerError';
  }
}

export class MoltbookNetworkError extends MoltbookAPIError {
  constructor(message = 'Network error connecting to Moltbook') {
    super(message, MOLTBOOK_ERROR_CODES.NETWORK_ERROR, { isRetryable: true });
    this.name = 'MoltbookNetworkError';
  }
}

export class MoltbookTimeoutError extends MoltbookAPIError {
  constructor(message = 'Request to Moltbook timed out') {
    super(message, MOLTBOOK_ERROR_CODES.TIMEOUT, { isRetryable: true });
    this.name = 'MoltbookTimeoutError';
  }
}

export function parseMoltbookError(response: Response, body?: unknown): MoltbookError {
  if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
    return body as MoltbookError;
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: response.statusText || 'An unknown error occurred',
  };
}

export function createMoltbookError(
  response: Response,
  body?: unknown
): MoltbookAPIError {
  const moltbookError = parseMoltbookError(response, body);

  if (response.status === 401 || response.status === 403) {
    if (moltbookError.code === 'TOKEN_EXPIRED') {
      return new MoltbookTokenExpiredError(moltbookError.message);
    }
    return new MoltbookTokenInvalidError(moltbookError.message);
  }

  if (response.status === 429) {
    const rateLimitInfo: RateLimitInfo = {};
    const retryAfter = response.headers.get('Retry-After');
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');

    if (retryAfter) rateLimitInfo.retryAfter = parseInt(retryAfter, 10);
    if (limit) rateLimitInfo.limit = parseInt(limit, 10);
    if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);

    return new MoltbookRateLimitError(moltbookError.message, rateLimitInfo);
  }

  if (response.status >= 500) {
    return new MoltbookServerError(moltbookError.message, response.status);
  }

  return new MoltbookAPIError(
    moltbookError.message,
    moltbookError.code as MoltbookErrorCode,
    { statusCode: response.status }
  );
}
