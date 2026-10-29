'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  HushSession,
  ThoughtTrail,
  ChatMessage,
  HushStyle,
  ConnectionStatus,
  HealthResponse,
} from '@/types/chat';
import {
  loadSession,
  saveSession,
  clearAllStoredSessions,
  getStoragePreference,
  setStoragePreference,
} from '@/lib/storage';
import { ensureAnonymousSupabaseSession } from '@/lib/supabase/client';

function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialSession(persistence: 'session' | 'local' = 'session'): HushSession {
  const rootTrailId = 'trail_root';
  const rootTrail: ThoughtTrail = {
    id: rootTrailId,
    name: 'Main Conversation',
    description: 'Original anonymous thought space',
    createdAt: Date.now(),
    style: 'quick-fix',
    draftPrompt: '',
  };

  return {
    id: createId('session'),
    title: 'New Conversation',
    createdAt: Date.now(),
    activeTrailId: rootTrailId,
    persistence,
    trails: {
      [rootTrailId]: rootTrail,
    },
    messages: [],
  };
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  const validStatuses = new Set<string>([
    'ready',
    'configuration_missing',
    'offline',
    'model_missing',
    'error',
  ]);

  return typeof response.status === 'string' &&
    validStatuses.has(response.status) &&
    typeof response.model === 'string' &&
    typeof response.message === 'string' &&
    (response.suggestedAction === undefined || typeof response.suggestedAction === 'string') &&
    (response.modelsAvailable === undefined ||
      (Array.isArray(response.modelsAvailable) &&
        response.modelsAvailable.every((model) => typeof model === 'string')));
}

function readApiError(payload: unknown): { code?: string; message: string } {
  if (!payload || typeof payload !== 'object') {
    return { message: 'The local AI request failed.' };
  }

  const response = payload as Record<string, unknown>;
  const error = response.error;
  if (error && typeof error === 'object') {
    const details = error as Record<string, unknown>;
    return {
      code: typeof details.code === 'string' ? details.code : undefined,
      message: typeof details.message === 'string' ? details.message : 'The local AI request failed.',
    };
  }

  return {
    code: typeof response.code === 'string' ? response.code : undefined,
    message: typeof error === 'string' ? error : 'The local AI request failed.',
  };
}

export function useHushSession() {
  const [session, setSession] = useState<HushSession>(() => createInitialSession('session'));
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseAuthStatus, setSupabaseAuthStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [supabaseAuthError, setSupabaseAuthError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Hydrate from storage on mount
  useEffect(() => {
    const saved = loadSession();
    setSession(saved ?? createInitialSession(getStoragePreference()));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;
    ensureAnonymousSupabaseSession()
      .then(() => {
        if (active) {
          setSupabaseAuthStatus('ready');
          setSupabaseAuthError(null);
        }
      })
      .catch((authError: unknown) => {
        if (active) {
          setSupabaseAuthStatus('error');
          setSupabaseAuthError(authError instanceof Error ? authError.message : 'Anonymous sync is unavailable.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Do not write the server/initial placeholder over the browser's saved session.
  useEffect(() => {
    if (isHydrated) saveSession(session);
  }, [isHydrated, session]);

  // Periodic health check against local Ollama API
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        setStatus('failed');
        setHealth({
          status: 'error',
          model: 'unknown',
          message: `Hush health endpoint returned HTTP ${res.status}.`,
        });
        return;
      }
      const payload: unknown = await res.json();
      if (!isHealthResponse(payload)) {
        setStatus('failed');
        setHealth({
          status: 'error',
          model: 'unknown',
          message: 'Hush returned an invalid health status response.',
        });
        return;
      }

      const data = payload;
      setHealth(data);

      if (data.status === 'ready') {
        setStatus((prev) => (prev === 'generating' ? 'generating' : 'ready'));
      } else if (data.status === 'configuration_missing') {
        setStatus('configuration_missing');
      } else if (data.status === 'model_missing') {
        setStatus('model_missing');
      } else if (data.status === 'offline') {
        setStatus('offline');
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
      setHealth({
        status: 'error',
        model: 'unknown',
        message: 'Could not connect to Hush backend.',
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Current active trail
  const activeTrail: ThoughtTrail = useMemo(() => {
    return (
      session.trails[session.activeTrailId] ||
      session.trails['trail_root'] || {
        id: 'trail_root',
        name: 'Main Conversation',
        createdAt: Date.now(),
        style: 'quick-fix',
        draftPrompt: '',
      }
    );
  }, [session.trails, session.activeTrailId]);

  // Helper: recursively resolve messages in a trail's ancestral hierarchy
  const resolveTrailMessages = useCallback(
    (trailId: string, currentSession: HushSession): ChatMessage[] => {
      const targetTrail = currentSession.trails[trailId];
      if (!targetTrail) return [];

      let ancestralMessages: ChatMessage[] = [];

      // If this trail branched from a parent message, carry forward context up to that message
      if (targetTrail.parentTrailId && targetTrail.parentMessageId) {
        const parentLineage = resolveTrailMessages(targetTrail.parentTrailId, currentSession);
        const splitIndex = parentLineage.findIndex((m) => m.id === targetTrail.parentMessageId);
        if (splitIndex !== -1) {
          ancestralMessages = parentLineage.slice(0, splitIndex + 1);
        } else {
          ancestralMessages = parentLineage;
        }
      }

      // Append messages belonging exclusively to this trail
      const localTrailMessages = currentSession.messages.filter((m) => m.trailId === trailId);
      return [...ancestralMessages, ...localTrailMessages];
    },
    []
  );

  // Resolved linear conversation for active trail
  const activeMessages = useMemo(() => {
    return resolveTrailMessages(session.activeTrailId, session);
  }, [session, resolveTrailMessages]);

  // Style for active trail
  const currentStyle: HushStyle = activeTrail.style || 'quick-fix';

  // Set style for active trail
  const setStyle = useCallback((newStyle: HushStyle) => {
    setSession((prev) => {
      const trail = prev.trails[prev.activeTrailId];
      if (!trail) return prev;
      return {
        ...prev,
        trails: {
          ...prev.trails,
          [prev.activeTrailId]: {
            ...trail,
            style: newStyle,
          },
        },
      };
    });
  }, []);

  // Update draft prompt for active trail
  const setDraftPrompt = useCallback((draft: string) => {
    setSession((prev) => {
      const trail = prev.trails[prev.activeTrailId];
      if (!trail) return prev;
      return {
        ...prev,
        trails: {
          ...prev.trails,
          [prev.activeTrailId]: {
            ...trail,
            draftPrompt: draft,
          },
        },
      };
    });
  }, []);

  // Switch active trail
  const switchTrail = useCallback((trailId: string) => {
    setSession((prev) => {
      if (!prev.trails[trailId]) return prev;
      return {
        ...prev,
        activeTrailId: trailId,
      };
    });
    setError(null);
  }, []);

  // Update session title
  const updateSessionTitle = useCallback((title: string) => {
    setSession((prev) => ({
      ...prev,
      title: title.trim() || 'Conversation',
    }));
  }, []);

  // Update trail name
  const updateTrailName = useCallback((trailId: string, name: string) => {
    setSession((prev) => {
      const trail = prev.trails[trailId];
      if (!trail) return prev;
      return {
        ...prev,
        trails: {
          ...prev.trails,
          [trailId]: {
            ...trail,
            name: name.trim() || trail.name,
          },
        },
      };
    });
  }, []);

  // Create a new branch from an assistant message
  const createBranch = useCallback((parentMessageId: string) => {
    setSession((prev) => {
      const parentMessage = prev.messages.find((m) => m.id === parentMessageId);
      const cleanSnippet = parentMessage
        ? parentMessage.content
            .replace(/[#*`_]/g, '')
            .slice(0, 32)
            .trim() + (parentMessage.content.length > 32 ? '...' : '')
        : 'Thought Trail';

      const newTrailId = createId('trail');
      const branchTrail: ThoughtTrail = {
        id: newTrailId,
        name: `Trail: "${cleanSnippet}"`,
        parentMessageId,
        parentTrailId: prev.activeTrailId,
        createdAt: Date.now(),
        style: prev.trails[prev.activeTrailId]?.style || 'quick-fix',
        draftPrompt: '',
      };

      return {
        ...prev,
        activeTrailId: newTrailId,
        trails: {
          ...prev.trails,
          [newTrailId]: branchTrail,
        },
      };
    });
    setError(null);
  }, []);

  // Stop active generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStatus('ready');
  }, []);

  // Send a message and stream response
  const sendMessage = useCallback(
    async (
      textContent: string,
      overrideStyle?: HushStyle,
      retryTarget?: { userMessageId: string; assistantMessageId: string }
    ) => {
      const trimmed = textContent.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const styleToUse = overrideStyle || currentStyle;

      const userMessageId = retryTarget?.userMessageId || createId('msg_user');
      const assistantMessageId = createId('msg_assistant');
      const userMessage: ChatMessage = retryTarget
        ? session.messages.find((message) => message.id === retryTarget.userMessageId) ?? {
            id: userMessageId,
            role: 'user',
            content: trimmed,
            createdAt: Date.now(),
            trailId: session.activeTrailId,
            style: styleToUse,
          }
        : {
            id: userMessageId,
            role: 'user',
            content: trimmed,
            createdAt: Date.now(),
            trailId: session.activeTrailId,
            style: styleToUse,
          };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        trailId: session.activeTrailId,
        style: styleToUse,
        isStreaming: true,
      };

      // Set conversation title from first user message if still default
      const isFirstMessage = session.messages.length === 0;
      const initialTitle = isFirstMessage
        ? trimmed.slice(0, 40) + (trimmed.length > 40 ? '...' : '')
        : session.title;

      // Compute active trail messages to send to server
      const currentTrailContext = resolveTrailMessages(session.activeTrailId, session).filter(
        (message) => message.id !== retryTarget?.userMessageId && message.id !== retryTarget?.assistantMessageId
      );
      const outboundHistory = [
        ...currentTrailContext.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      // Optimistically append user message and placeholder assistant message
      setSession((prev) => {
        const updatedTrails = { ...prev.trails };
        if (updatedTrails[prev.activeTrailId]) {
          updatedTrails[prev.activeTrailId] = {
            ...updatedTrails[prev.activeTrailId],
            draftPrompt: '',
            style: styleToUse,
          };
        }
        return {
          ...prev,
          title: initialTitle,
          trails: updatedTrails,
          messages: retryTarget
            ? [...prev.messages.filter((message) => message.id !== retryTarget.assistantMessageId), assistantMessage]
            : [...prev.messages, userMessage, assistantMessage],
        };
      });

      setIsStreaming(true);
      setStatus('generating');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: outboundHistory,
            style: styleToUse,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData: unknown = await response.json().catch(() => null);
          const apiError = readApiError(errorData);
          const errText = apiError.message === 'The local AI request failed.'
            ? `Inference error: HTTP ${response.status}`
            : apiError.message;

          if (apiError.code === 'INFERENCE_NOT_CONFIGURED') {
            setStatus('configuration_missing');
          } else if (apiError.code === 'OLLAMA_OFFLINE') {
            setStatus('offline');
          } else if (apiError.code === 'MODEL_NOT_FOUND') {
            setStatus('model_missing');
          } else {
            setStatus('failed');
          }

          throw new Error(errText);
        }

        if (!response.body) {
          throw new Error('Readable stream not supported by browser.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Update assistant message with streaming chunk
          setSession((prev) => {
            const updated = prev.messages.map((m) => {
              if (m.id === assistantMessageId) {
                return {
                  ...m,
                  content: accumulatedText,
                  isStreaming: true,
                };
              }
              return m;
            });
            return { ...prev, messages: updated };
          });
        }

        accumulatedText += decoder.decode();

        // Finalize completed message
        if (!accumulatedText.trim()) {
          throw new Error('The local AI runtime returned an empty response. Check its status and retry.');
        }

        setSession((prev) => {
          const updated = prev.messages.map((m) => {
            if (m.id === assistantMessageId) {
              return {
                ...m,
                content: accumulatedText,
                isStreaming: false,
              };
            }
            return m;
          });
          return { ...prev, messages: updated };
        });

        setStatus('ready');
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User aborted stream
          setSession((prev) => {
            const updated = prev.messages.map((m) => {
              if (m.id === assistantMessageId) {
                return {
                  ...m,
                  isStreaming: false,
                  content: m.content || '[Generation stopped]',
                };
              }
              return m;
            });
            return { ...prev, messages: updated };
          });
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to generate response.';
          setStatus('failed');
          setError(msg);
          setSession((prev) => {
            const updated = prev.messages.map((m) => {
              if (m.id === assistantMessageId) {
                return {
                  ...m,
                  isStreaming: false,
                  error: msg,
                };
              }
              return m;
            });
            return { ...prev, messages: updated };
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, currentStyle, session, resolveTrailMessages]
  );

  // Retry or regenerate response
  const retryLastMessage = useCallback(() => {
    if (isStreaming) return;

    const trailMsgs = resolveTrailMessages(session.activeTrailId, session);
    const lastAssistantIdx = trailMsgs.findLastIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx === -1) return;

    const precedingUserIdx = trailMsgs
      .slice(0, lastAssistantIdx)
      .findLastIndex((m) => m.role === 'user');
    if (precedingUserIdx === -1) return;

    const userPrompt = trailMsgs[precedingUserIdx].content;
    const assistantMsg = trailMsgs[lastAssistantIdx];

    sendMessage(userPrompt, assistantMsg.style, {
      userMessageId: trailMsgs[precedingUserIdx].id,
      assistantMessageId: assistantMsg.id,
    });
  }, [isStreaming, session, resolveTrailMessages, sendMessage]);

  // Reset session completely
  const resetSession = useCallback(() => {
    stopGeneration();
    clearAllStoredSessions();
    const fresh = createInitialSession(getStoragePreference());
    setSession(fresh);
    setError(null);
  }, [stopGeneration]);

  // Toggle storage persistence
  const togglePersistence = useCallback((newPref: 'session' | 'local') => {
    setStoragePreference(newPref);
    setSession((prev) => ({
      ...prev,
      persistence: newPref,
    }));
  }, []);

  const replaceSession = useCallback((nextSession: HushSession) => {
    setSession(nextSession);
    setError(null);
  }, []);

  const updateSupabaseSync = useCallback((sync: NonNullable<HushSession['supabaseSync']>) => {
    setSession((prev) => ({ ...prev, supabaseSync: sync }));
  }, []);

  return {
    session,
    activeTrail,
    activeMessages,
    status,
    health,
    isStreaming,
    error,
    supabaseAuthStatus,
    supabaseAuthError,
    currentStyle,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    createBranch,
    switchTrail,
    setStyle,
    setDraftPrompt,
    updateSessionTitle,
    updateTrailName,
    resetSession,
    togglePersistence,
    replaceSession,
    updateSupabaseSync,
    refreshHealth: checkHealth,
  };
}
