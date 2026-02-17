import { NextRequest } from 'next/server';

export interface SSEMessage {
  event?: string;
  data: unknown;
}

export function createSSEStream(request: NextRequest): {
  stream: ReadableStream<Uint8Array>;
  controller: ReadableStreamDefaultController<Uint8Array>;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
    },
  });

  return {
    stream,
    controller: controller!,
  };
}

export function sendSSEMessage(
  controller: ReadableStreamDefaultController<Uint8Array>,
  message: SSEMessage
): void {
  const encoder = new TextEncoder();
  const data = typeof message.data === 'string' 
    ? message.data 
    : JSON.stringify(message.data);
  
  let sse = `data: ${data}\n`;
  
  if (message.event) {
    sse = `event: ${message.event}\n${sse}`;
  }
  
  sse += '\n';
  
  controller.enqueue(encoder.encode(sse));
}

export function createSSEKeepAlive(
  controller: ReadableStreamDefaultController<Uint8Array>,
  intervalMs: number = 30000
): () => void {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const sendKeepAlive = () => {
    try {
      controller.enqueue(encoder.encode(': keepalive\n\n'));
    } catch {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  };

  intervalId = setInterval(sendKeepAlive, intervalMs);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

export async function waitForEvent(
  request: NextRequest,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const cleanup = () => {
      resolve();
    };

    if (signal) {
      signal.addEventListener('abort', cleanup, { once: true });
    }

    setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', cleanup);
      }
      resolve();
    }, 1000 * 60 * 5);
  });
}

export interface PollingConfig {
  intervalMs: number;
  maxAgeMs?: number;
}

export function createPollingResponse<T>(
  data: T,
  config?: PollingConfig
): Response {
  return new Response(JSON.stringify({ data, success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `no-cache, max-age=0, s-maxage=${Math.floor((config?.intervalMs || 5000) / 1000)}`,
      'X-Poll-Interval': String(config?.intervalMs || 5000),
    },
  });
}
