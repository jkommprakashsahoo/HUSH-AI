'use client';

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { HushSession } from '@/types/chat';
import { isValidHushSession } from '@/lib/storage';
import { ensureAnonymousSupabaseSession } from '@/lib/supabase/client';

const SavedConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  style: z.enum(['quick-fix', 'explain-it', 'think-with-me', 'challenge-me']),
  created_at: z.string(),
});

export type SavedConversation = z.infer<typeof SavedConversationSchema>;

interface ApiError {
  error?: {
    code?: string;
    message?: string;
  };
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const error = (payload as ApiError).error;
  return typeof error?.message === 'string' ? error.message : fallback;
}

function createRemoteIds(session: HushSession) {
  const trailIds = { ...session.supabaseSync?.trailIds };
  const messageIds = { ...session.supabaseSync?.messageIds };

  for (const trail of Object.values(session.trails)) {
    trailIds[trail.id] ||= crypto.randomUUID();
  }
  for (const message of session.messages) {
    messageIds[message.id] ||= crypto.randomUUID();
  }
  return { trailIds, messageIds };
}

export function useSupabaseConversations() {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await ensureAnonymousSupabaseSession();
      const response = await fetch('/api/conversations', { credentials: 'same-origin' });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload, 'Could not load saved conversations.'));
      if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { conversations?: unknown }).conversations)) {
        throw new Error('The saved-conversations response was invalid.');
      }
      const parsed = z.array(SavedConversationSchema).safeParse((payload as { conversations: unknown[] }).conversations);
      if (!parsed.success) throw new Error('The saved-conversations response was invalid.');
      setConversations(parsed.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load saved conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (
    session: HushSession,
    updateSync: (sync: NonNullable<HushSession['supabaseSync']>) => void
  ) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await ensureAnonymousSupabaseSession();
      const syncIds = createRemoteIds(session);
      updateSync({ ...syncIds, savedAt: session.supabaseSync?.savedAt });

      const requestSession = {
        title: session.title || 'Conversation',
        createdAt: session.createdAt,
        activeTrailId: session.activeTrailId,
        trails: Object.fromEntries(Object.entries(session.trails).map(([id, trail]) => [id, {
          id: trail.id,
          name: trail.name,
          parentMessageId: trail.parentMessageId,
          parentTrailId: trail.parentTrailId,
          createdAt: trail.createdAt,
          style: trail.style,
        }])),
        messages: session.messages
          .filter((message) => !message.isStreaming && message.content.trim().length > 0)
          .map(({ id, role, content, createdAt, trailId }) => ({ id, role, content, createdAt, trailId })),
      };

      const response = await fetch('/api/conversations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: requestSession, syncIds }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload, 'Conversation save failed.'));
      if (!payload || typeof payload !== 'object' ||
          typeof (payload as { conversationId?: unknown }).conversationId !== 'string' ||
          typeof (payload as { savedAt?: unknown }).savedAt !== 'string' ||
          (payload as { savedMessages?: unknown }).savedMessages !== requestSession.messages.length) {
        throw new Error('Supabase did not confirm the complete conversation save.');
      }

      updateSync({ ...syncIds, savedAt: Date.parse((payload as { savedAt: string }).savedAt) });
      setSuccess('Conversation saved to Supabase.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Conversation save failed.');
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const load = useCallback(async (id: string): Promise<HushSession | null> => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await ensureAnonymousSupabaseSession();
      const response = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload, 'Could not load this conversation.'));
      const loaded = payload && typeof payload === 'object'
        ? (payload as { session?: unknown }).session
        : null;
      if (!isValidHushSession(loaded)) throw new Error('The saved conversation response was invalid.');
      setSuccess('Conversation loaded from Supabase.');
      return loaded;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load this conversation.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await ensureAnonymousSupabaseSession();
      const response = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readErrorMessage(payload, 'Could not delete this conversation.'));
      if (!payload || typeof payload !== 'object' || (payload as { deleted?: unknown }).deleted !== true) {
        throw new Error('Supabase did not confirm the conversation deletion.');
      }
      setConversations((current) => current.filter((conversation) => conversation.id !== id));
      setSuccess('Conversation deleted from Supabase.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete this conversation.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  return { conversations, isLoading, isSaving, deletingId, error, success, refresh, save, load, remove };
}
