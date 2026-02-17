/**
 * Moltbook API Client
 * Client for interacting with the Moltbook agent identity verification API
 */

import type {
  VerifyIdentityRequest,
  VerifyIdentityResponse,
  MoltbookConfig,
  MoltbookError,
} from '@/types/moltbook';
import {
  createMoltbookError,
  MoltbookAPIError,
  MoltbookTokenExpiredError,
  MoltbookTokenInvalidError,
  MoltbookRateLimitError,
  MoltbookTimeoutError,
} from './moltbook-error';

const DEFAULT_BASE_URL = 'https://moltbook.com/api/v1';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Create a configured Moltbook API client
 */
export function createMoltbookClient(config: MoltbookConfig) {
  const { apiKey, baseUrl = DEFAULT_BASE_URL, appUrl, timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = config;

  if (!apiKey) {
    throw new Error('Moltbook API key is required');
  }

  if (!appUrl) {
    throw new Error('App URL is required for audience validation');
  }

  /**
   * Verify an identity token from Moltbook
   * @param token - The identity token to verify
   * @returns The verification response with agent data or error
   */
  async function verifyIdentityToken(token: string): Promise<VerifyIdentityResponse> {
    const request: VerifyIdentityRequest = {
      token,
      audience: appUrl,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}/agents/verify-identity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Moltbook-App-Key': apiKey,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
          
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

    const data = await response.json();

    if (!response.ok) {
      const error = createMoltbookError(response, data);
      
      if (error instanceof MoltbookTokenExpiredError) {
        return {
          success: false,
          valid: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: error.message,
          },
        };
      }
      
      if (error instanceof MoltbookTokenInvalidError) {
        return {
          success: false,
          valid: false,
          error: {
            code: 'TOKEN_INVALID',
            message: error.message,
          },
        };
      }
      
      if (error instanceof MoltbookRateLimitError) {
        return {
          success: false,
          valid: false,
          error: {
            code: 'RATE_LIMITED',
            message: error.message,
          },
        };
      }
      
      if (error instanceof MoltbookTimeoutError) {
        return {
          success: false,
          valid: false,
          error: {
            code: 'TIMEOUT',
            message: error.message,
          },
        };
      }
      
      const moltbookError: MoltbookError = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        details: error.details,
      };
      
      return {
        success: false,
        valid: false,
        error: moltbookError,
      };
    }

        return data as VerifyIdentityResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        }
        
        // Exponential backoff for retries
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Return error response if all retries failed
    return {
      success: false,
      valid: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError?.message || 'Failed to verify identity token',
      },
    };
  }

  return {
    verifyIdentityToken,
  };
}

/**
 * Get the default Moltbook client using environment variables
 */
export function getMoltbookClient() {
  const apiKey = process.env.MOLTBOOK_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !appUrl) {
    throw new Error('MOLTBOOK_API_KEY and NEXT_PUBLIC_APP_URL must be configured');
  }

  return createMoltbookClient({
    apiKey,
    appUrl,
    baseUrl: process.env.MOLTBOOK_API_URL || DEFAULT_BASE_URL,
    timeout: parseInt(process.env.MOLTBOOK_TIMEOUT || String(DEFAULT_TIMEOUT), 10),
    maxRetries: parseInt(process.env.MOLTBOOK_MAX_RETRIES || String(DEFAULT_MAX_RETRIES), 10),
  });
}

export type { VerifyIdentityResponse, MoltbookAgent } from '@/types/moltbook';
