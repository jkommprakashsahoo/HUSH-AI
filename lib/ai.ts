import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';
import { HushStyle } from '@/types/chat';
import { isValidStyle, getStyleInstruction } from './styles';

/** Server-only, Ollama-compatible inference adapter. No cloud model fallback exists. */
const LOCAL_OLLAMA_URL = 'http://127.0.0.1:11434';

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigurationError';
  }
}

export function getAIConfig() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const configuredBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  const baseUrl = (configuredBaseUrl || (process.env.NODE_ENV === 'production' ? '' : LOCAL_OLLAMA_URL)).replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL?.trim() || 'qwen3:4b';
  const parsedTimeout = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);

  return {
    provider,
    baseUrl,
    model,
    apiToken: process.env.OLLAMA_API_TOKEN?.trim() || undefined,
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 120000,
    isConfigured: provider === 'ollama' && Boolean(baseUrl),
  };
}

export interface LocalAIProvider {
  name: string;
  createModelInstance: (modelName: string) => ReturnType<ReturnType<typeof createOpenAICompatible>>;
  checkHealth: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  configured: boolean;
  reachable: boolean;
  modelAvailable: boolean;
  modelsInstalled: string[];
  activeModel: string;
  error?: string;
  details?: string;
}

export class OllamaProvider implements LocalAIProvider {
  name = 'ollama';

  private getProviderInstance() {
    const { baseUrl, apiToken, isConfigured } = getAIConfig();
    if (!isConfigured) {
      throw new AIConfigurationError('Ollama inference host is not configured for this deployment.');
    }
    return createOpenAICompatible({
      name: 'ollama',
      baseURL: `${baseUrl}/v1`,
      apiKey: apiToken || 'ollama-local',
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
    });
  }

  createModelInstance(modelName: string) {
    return this.getProviderInstance()(modelName);
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const { baseUrl, model, apiToken, isConfigured } = getAIConfig();
    if (!isConfigured) {
      return {
        configured: false,
        reachable: false,
        modelAvailable: false,
        modelsInstalled: [],
        activeModel: model,
        error: 'Ollama host is not configured.',
        details: 'Set OLLAMA_BASE_URL on the deployed server to an authorized Ollama-compatible host.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        headers: {
          Accept: 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        return {
          configured: true,
          reachable: false,
          modelAvailable: false,
          modelsInstalled: [],
          activeModel: model,
          error: `Ollama health check returned HTTP ${response.status}.`,
          details: 'Verify the authorized inference host and its credentials.',
        };
      }

      const data = await response.json() as { models?: Array<{ name?: string; model?: string }> };
      const modelsInstalled = (data.models || []).map((entry) => entry.name || entry.model || '').filter(Boolean);
      const target = model.toLowerCase();
      const modelAvailable = modelsInstalled.some((installed) => {
        const normalized = installed.toLowerCase();
        return normalized === target || normalized === `${target}:latest` || `${normalized}:latest` === target || normalized.startsWith(`${target}:`) || target.startsWith(`${normalized}:`);
      });

      return { configured: true, reachable: true, modelAvailable, modelsInstalled, activeModel: model };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      return {
        configured: true,
        reachable: false,
        modelAvailable: false,
        modelsInstalled: [],
        activeModel: model,
        error: timedOut ? 'Ollama health check timed out.' : 'Ollama runtime is unreachable.',
        details: timedOut ? 'The inference host did not answer within six seconds.' : 'Verify network reachability, TLS, and authorized access to the inference host.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

const activeProvider: LocalAIProvider = new OllamaProvider();
export function getLocalProvider(): LocalAIProvider { return activeProvider; }

export interface StreamChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  style: HushStyle;
  clientSignal?: AbortSignal;
  onError?: (error: unknown) => void;
}

export async function streamLocalChat({ messages, style, clientSignal, onError }: StreamChatParams) {
  const { model, timeoutMs, isConfigured } = getAIConfig();
  if (!isConfigured) {
    throw new AIConfigurationError('Ollama inference is not configured for this deployment.');
  }
  const resolvedStyle = isValidStyle(style) ? style : 'quick-fix';
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(new Error(`Ollama generation timed out after ${timeoutMs / 1000}s`)), timeoutMs);
  const abortFromClient = () => abortController.abort(clientSignal?.reason);
  const cleanup = () => {
    clearTimeout(timeoutId);
    clientSignal?.removeEventListener('abort', abortFromClient);
  };
  clientSignal?.addEventListener('abort', abortFromClient, { once: true });

  try {
    const sanitizedMessages = messages
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
      .map((message) => ({ role: message.role, content: message.content.trim() }))
      .filter((message) => message.content.length > 0);
    if (sanitizedMessages.length === 0) throw new Error('No valid messages provided for conversation.');

    return streamText({
      model: activeProvider.createModelInstance(model),
      system: getStyleInstruction(resolvedStyle),
      messages: sanitizedMessages,
      abortSignal: abortController.signal,
      onFinish: cleanup,
      onError: ({ error }) => {
        cleanup();
        onError?.(error);
      },
    });
  } catch (error) {
    cleanup();
    throw error;
  }
}
