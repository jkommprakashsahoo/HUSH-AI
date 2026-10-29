import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIConfigurationError, streamLocalChat } from '@/lib/ai';
import { VALID_STYLES, isValidStyle } from '@/lib/styles';
import { HushStyle } from '@/types/chat';

export const dynamic = 'force-dynamic';

// Validation schema using Zod
const MAX_REQUEST_BYTES = 64 * 1024;

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(12000),
      }).strict()
    )
    .min(1)
    .max(50)
    .refine((messages) => messages.reduce((size, message) => size + message.content.length, 0) <= MAX_REQUEST_BYTES, {
      message: 'Conversation exceeds the maximum supported size.',
    }),
  style: z.enum(VALID_STYLES as [HushStyle, ...HushStyle[]]).optional(),
}).strict();

function createChatErrorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message, details: [] } },
    { status }
  );
}

function createInferenceErrorResponse(err: unknown) {
  const errorMessage = err instanceof Error ? err.message : '';

  if (err instanceof AIConfigurationError) {
    return createChatErrorResponse(
      503,
      'INFERENCE_NOT_CONFIGURED',
      'Private AI is not configured for this deployment. Configure an authorized Ollama host and try again.'
    );
  }

  const isConnRefused =
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('Failed to fetch');

  const isTimeout =
    errorMessage.includes('timed out') ||
    errorMessage.includes('timeout') ||
    (err instanceof Error && err.name === 'AbortError');

  const isModelMissing =
    errorMessage.includes('not found') ||
    (errorMessage.includes('model') && errorMessage.includes('404'));

  if (isConnRefused) {
    return createChatErrorResponse(
      503,
      'OLLAMA_OFFLINE',
      'Local Ollama runtime is offline. Start Ollama (`ollama serve`) and try again.'
    );
  }

  if (isModelMissing) {
    return createChatErrorResponse(
      404,
      'MODEL_NOT_FOUND',
      'Configured local model is missing or not installed in Ollama.'
    );
  }

  if (isTimeout) {
    return createChatErrorResponse(
      504,
      'TIMEOUT',
      'Local model inference timed out. Ollama may be loading weights or memory is saturated.'
    );
  }

  return createChatErrorResponse(
    500,
    'GENERATION_ERROR',
    'Unable to process generation with local AI runtime.'
  );
}

async function readBoundedJson(req: NextRequest): Promise<unknown> {
  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  if (!req.body) throw new Error('EMPTY_BODY');

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

// Simple in-memory rate limiter per IP / host for local protection
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Extract client IP or localhost fallback
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    return createChatErrorResponse(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please wait a moment before sending another message.'
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return createChatErrorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the chat request as JSON.');
    }

    let rawBody: unknown;
    try {
      rawBody = await readBoundedJson(req);
    } catch (error) {
      const isTooLarge = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE';
      return createChatErrorResponse(
        isTooLarge ? 413 : 400,
        isTooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
        isTooLarge ? 'The request is too large. Shorten the conversation and try again.' : 'The request body must contain valid JSON.'
      );
    }

    const parseResult = ChatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return createChatErrorResponse(
        400,
        'INVALID_PAYLOAD',
        'Invalid request format or message payload exceeded limits.'
      );
    }

    const { messages, style } = parseResult.data;

    // Validate style against explicit server allowlist
    const validatedStyle: HushStyle = isValidStyle(style) ? style : 'quick-fix';

    // Stream generation from local Ollama model
    let streamError: unknown;
    const result = await streamLocalChat({
      messages,
      style: validatedStyle,
      clientSignal: req.signal,
      onError: (error) => {
        streamError = error;
      },
    });

    const reader = result.textStream.getReader();
    let firstChunk: ReadableStreamReadResult<string>;
    try {
      firstChunk = await reader.read();
    } catch (error) {
      return createInferenceErrorResponse(streamError ?? error);
    }

    if (firstChunk.done) {
      return createInferenceErrorResponse(
        streamError ?? new Error('Local inference completed without producing a response.')
      );
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(firstChunk.value));
      },
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(encoder.encode(value));
          }
        } catch (error) {
          controller.error(error);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason);
      },
    });

    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
        'X-Hush-Style': validatedStyle,
      },
    });
  } catch (err: unknown) {
    return createInferenceErrorResponse(err);
  }
}
