import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { decryptConversationValue, encryptConversationValue } from '@/lib/supabase/conversation-crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_TRAILS = 100;
const MAX_MESSAGES = 1000;

const StyleSchema = z.enum(['quick-fix', 'explain-it', 'think-with-me', 'challenge-me']);
const SyncIdsSchema = z.object({
  trailIds: z.record(z.string(), z.string().uuid()),
  messageIds: z.record(z.string(), z.string().uuid()),
}).strict();

const SaveSchema = z.object({
  session: z.object({
    title: z.string().trim().min(1).max(200),
    createdAt: z.number().finite(),
    activeTrailId: z.string().min(1),
    trails: z.record(z.string(), z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(200),
      parentMessageId: z.string().optional(),
      parentTrailId: z.string().optional(),
      createdAt: z.number().finite(),
      style: StyleSchema,
    }).strict()).refine((trails) => Object.keys(trails).length > 0 && Object.keys(trails).length <= MAX_TRAILS),
    messages: z.array(z.object({
      id: z.string().min(1),
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(12000),
      createdAt: z.number().finite(),
      trailId: z.string().min(1),
    }).strict()).max(MAX_MESSAGES),
  }).strict(),
  syncIds: SyncIdsSchema,
}).strict();

type ConversationRow = {
  id: string;
  owner_id: string;
  title: string;
  parent_conversation_id: string | null;
  source_message_id: string | null;
  style: 'quick-fix' | 'explain-it' | 'think-with-me' | 'challenge-me';
  created_at: string;
};

type MessageRow = {
  id: string;
  owner_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, details: [] } }, { status });
}

function mapServerError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'SUPABASE_NOT_CONFIGURED') {
    return errorResponse(503, code, 'Conversation sync is not configured on this server.');
  }
  if (code === 'SYNC_ENCRYPTION_NOT_CONFIGURED' || code === 'SYNC_ENCRYPTION_KEY_INVALID') {
    return errorResponse(503, code, 'Conversation sync encryption is not configured correctly on this server.');
  }
  if (code === 'SYNC_DATA_INVALID') {
    return errorResponse(500, code, 'Saved conversation data could not be decrypted or validated.');
  }
  return errorResponse(500, 'PERSISTENCE_ERROR', 'The conversation could not be synchronized. No successful save was confirmed.');
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.is_anonymous) {
    return { supabase, user: null };
  }
  return { supabase, user: data.user };
}

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new Error('BODY_TOO_LARGE');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error('BODY_TOO_LARGE');
  }
  return JSON.parse(text) as unknown;
}

async function getConversationTree(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  ownerId: string,
  rootId: string
): Promise<ConversationRow[]> {
  const { data: root, error: rootError } = await supabase
    .from('conversations')
    .select('id,owner_id,title,parent_conversation_id,source_message_id,style,created_at')
    .eq('id', rootId)
    .eq('owner_id', ownerId)
    .is('parent_conversation_id', null)
    .maybeSingle();

  if (rootError) throw rootError;
  if (!root) return [];

  const rows: ConversationRow[] = [root as ConversationRow];
  const seen = new Set([rootId]);
  const pending = [rootId];

  while (pending.length > 0) {
    const parentId = pending.shift();
    if (!parentId) continue;
    const { data: children, error } = await supabase
      .from('conversations')
      .select('id,owner_id,title,parent_conversation_id,source_message_id,style,created_at')
      .eq('owner_id', ownerId)
      .eq('parent_conversation_id', parentId)
      .order('created_at', { ascending: true })
      .limit(MAX_TRAILS + 1);

    if (error) throw error;
    for (const child of (children || []) as ConversationRow[]) {
      if (seen.has(child.id)) continue;
      if (rows.length >= MAX_TRAILS) throw new Error('TREE_TOO_LARGE');
      seen.add(child.id);
      rows.push(child);
      pending.push(child.id);
    }
  }
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return errorResponse(401, 'ANONYMOUS_SESSION_REQUIRED', 'Create or restore the anonymous Hush session and try again.');

    const conversationId = request.nextUrl.searchParams.get('id');
    if (!conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .select('id,title,style,created_at')
        .eq('owner_id', user.id)
        .is('parent_conversation_id', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const conversations = (data || []).map((conversation) => ({
        ...conversation,
        title: decryptConversationValue(conversation.title, user.id, conversation.id, 'conversation-title'),
      }));
      return NextResponse.json({ conversations });
    }

    if (!z.string().uuid().safeParse(conversationId).success) {
      return errorResponse(400, 'INVALID_CONVERSATION_ID', 'The conversation ID must be a UUID.');
    }

    const tree = await getConversationTree(supabase, user.id, conversationId);
    if (tree.length === 0) return errorResponse(404, 'CONVERSATION_NOT_FOUND', 'Saved conversation was not found.');

    const conversationIds = tree.map((row) => row.id);
    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('id,owner_id,conversation_id,role,content,created_at')
      .eq('owner_id', user.id)
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (messageError) throw messageError;

    const trailIds: Record<string, string> = {};
    const messageIds: Record<string, string> = {};
    const trails: Record<string, {
      id: string;
      name: string;
      parentMessageId?: string;
      parentTrailId?: string;
      createdAt: number;
      style: ConversationRow['style'];
      draftPrompt: string;
    }> = {};
    const rowById = new Map(tree.map((row) => [row.id, row]));
    const root = tree[0];

    for (const row of tree) {
      trailIds[row.id] = row.id;
      const title = decryptConversationValue(row.title, user.id, row.id, 'conversation-title');
      trails[row.id] = {
        id: row.id,
        name: row.parent_conversation_id ? title : 'Main Conversation',
        ...(row.parent_conversation_id ? { parentTrailId: row.parent_conversation_id } : {}),
        ...(row.source_message_id ? { parentMessageId: row.source_message_id } : {}),
        createdAt: Date.parse(row.created_at),
        style: row.style,
        draftPrompt: '',
      };
    }

    const loadedMessages = ((messages || []) as MessageRow[]).map((row) => {
      const conversation = rowById.get(row.conversation_id);
      const content = decryptConversationValue(row.content, user.id, row.id, 'message-content');
      messageIds[row.id] = row.id;
      return {
        id: row.id,
        role: row.role,
        content,
        createdAt: Date.parse(row.created_at),
        trailId: row.conversation_id,
        ...(row.role === 'assistant' && conversation ? { style: conversation.style } : {}),
      };
    });

    const session = {
      id: `session_${root.id}`,
      title: decryptConversationValue(root.title, user.id, root.id, 'conversation-title'),
      createdAt: Date.parse(root.created_at),
      activeTrailId: root.id,
      persistence: 'session' as const,
      trails,
      messages: loadedMessages,
      supabaseSync: { trailIds, messageIds, savedAt: Date.now() },
    };

    return NextResponse.json({ session });
  } catch (error) {
    return mapServerError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return errorResponse(401, 'ANONYMOUS_SESSION_REQUIRED', 'Create or restore the anonymous Hush session and try again.');

    let payload: unknown;
    try {
      payload = await readBoundedJson(request);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'BODY_TOO_LARGE';
      return errorResponse(tooLarge ? 413 : 400, tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON', tooLarge
        ? 'The conversation is too large to save.'
        : 'The request body must contain valid JSON.');
    }

    const parsed = SaveSchema.safeParse(payload);
    if (!parsed.success) return errorResponse(400, 'INVALID_PAYLOAD', 'The conversation data is invalid or exceeds sync limits.');

    const { session, syncIds } = parsed.data;
    const trails = Object.values(session.trails);
    if (trails.some((trail) => session.trails[trail.id] !== trail)) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Each Thought Trail key must match its ID.');
    }
    if (session.messages.some((message) => !session.trails[message.trailId])) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Every saved message must belong to a Thought Trail.');
    }
    if (trails.some((trail) => !syncIds.trailIds[trail.id])) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'A saved Thought Trail is missing its synchronization ID.');
    }
    if (session.messages.some((message) => !syncIds.messageIds[message.id])) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'A saved message is missing its synchronization ID.');
    }

    const rootTrails = trails.filter((trail) => !trail.parentTrailId);
    if (rootTrails.length !== 1) {
      return errorResponse(400, 'INVALID_TRAIL_TREE', 'A saved conversation must include exactly one root Thought Trail.');
    }

    const messagesById = new Map(session.messages.map((message) => [message.id, message]));
    for (const trail of trails) {
      if (!trail.parentTrailId) continue;
      const parentTrail = session.trails[trail.parentTrailId];
      const sourceMessage = trail.parentMessageId ? messagesById.get(trail.parentMessageId) : undefined;
      if (!parentTrail || !sourceMessage || sourceMessage.role !== 'assistant') {
        return errorResponse(400, 'INVALID_TRAIL_TREE', 'A branch must reference an existing parent trail and assistant source message.');
      }
    }

    const pending = [...trails];
    const savedTrailIds = new Set<string>();
    let savedMessages = 0;
    while (pending.length > 0) {
      const index = pending.findIndex((trail) => !trail.parentTrailId || savedTrailIds.has(trail.parentTrailId));
      if (index === -1) return errorResponse(400, 'INVALID_TRAIL_TREE', 'Thought Trail parent relationships are invalid.');
      const [trail] = pending.splice(index, 1);
      if (!trail) continue;

      const remoteId = syncIds.trailIds[trail.id];
      const parentId = trail.parentTrailId ? syncIds.trailIds[trail.parentTrailId] : null;
      const sourceMessageId = trail.parentMessageId ? syncIds.messageIds[trail.parentMessageId] : null;
      if (trail.parentTrailId && (!parentId || !sourceMessageId)) {
        return errorResponse(400, 'INVALID_TRAIL_TREE', 'A branch is missing its parent conversation or source message.');
      }

      const conversationTitle = trail.parentTrailId ? trail.name : session.title;
      const conversationRow = {
        id: remoteId,
        owner_id: user.id,
        title: encryptConversationValue(conversationTitle, user.id, remoteId, 'conversation-title'),
        parent_conversation_id: parentId,
        source_message_id: sourceMessageId,
        style: trail.style,
        created_at: new Date(trail.createdAt).toISOString(),
      };
      const { data: savedConversation, error: conversationError } = await supabase
        .from('conversations')
        .upsert(conversationRow, { onConflict: 'id' })
        .select('id')
        .single();

      if (conversationError || savedConversation?.id !== remoteId) throw conversationError || new Error('PERSISTENCE_ERROR');

      const directMessages = session.messages
        .filter((message) => message.trailId === trail.id && message.content.trim().length > 0)
        .sort((left, right) => left.createdAt - right.createdAt);

      for (const message of directMessages) {
        const remoteMessageId = syncIds.messageIds[message.id];
        if (!remoteMessageId) return errorResponse(400, 'INVALID_PAYLOAD', 'A saved message is missing its synchronization ID.');
        const messageRow = {
          id: remoteMessageId,
          owner_id: user.id,
          conversation_id: remoteId,
          role: message.role,
          content: encryptConversationValue(message.content, user.id, remoteMessageId, 'message-content'),
          created_at: new Date(message.createdAt).toISOString(),
        };
        const { data: savedMessage, error: saveMessageError } = await supabase
          .from('messages')
          .upsert(messageRow, { onConflict: 'id' })
          .select('id')
          .single();

        if (saveMessageError || savedMessage?.id !== remoteMessageId) throw saveMessageError || new Error('PERSISTENCE_ERROR');
        savedMessages += 1;
      }
      savedTrailIds.add(trail.id);
    }

    const rootTrail = rootTrails[0];
    return NextResponse.json({
      conversationId: syncIds.trailIds[rootTrail.id],
      savedAt: new Date().toISOString(),
      savedTrails: savedTrailIds.size,
      savedMessages,
      syncIds,
    });
  } catch (error) {
    return mapServerError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return errorResponse(401, 'ANONYMOUS_SESSION_REQUIRED', 'Create or restore the anonymous Hush session and try again.');

    const conversationId = request.nextUrl.searchParams.get('id');
    if (!conversationId || !z.string().uuid().safeParse(conversationId).success) {
      return errorResponse(400, 'INVALID_CONVERSATION_ID', 'Provide a valid conversation UUID.');
    }

    const tree = await getConversationTree(supabase, user.id, conversationId);
    if (tree.length === 0) return errorResponse(404, 'CONVERSATION_NOT_FOUND', 'Saved conversation was not found.');
    const childrenByParent = new Map<string, ConversationRow[]>();
    for (const row of tree) {
      if (!row.parent_conversation_id) continue;
      const children = childrenByParent.get(row.parent_conversation_id) || [];
      children.push(row);
      childrenByParent.set(row.parent_conversation_id, children);
    }

    const deletePostOrder = async (row: ConversationRow): Promise<void> => {
      for (const child of childrenByParent.get(row.id) || []) await deletePostOrder(child);
      const { error: messageError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', row.id)
        .eq('owner_id', user.id);
      if (messageError) throw messageError;

      const { data, error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', row.id)
        .eq('owner_id', user.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('PERSISTENCE_ERROR');
    };

    await deletePostOrder(tree[0]);
    return NextResponse.json({ deleted: true, conversationId });
  } catch (error) {
    return mapServerError(error);
  }
}
