export type HushStyle = 'quick-fix' | 'explain-it' | 'think-with-me' | 'challenge-me';

export interface StyleOption {
  id: HushStyle;
  label: string;
  tagline: string;
  description: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  trailId: string;
  parentMessageId?: string;
  style?: HushStyle;
  isStreaming?: boolean;
  error?: string;
}

export interface ThoughtTrail {
  id: string;
  name: string;
  description?: string;
  parentMessageId?: string;
  parentTrailId?: string;
  createdAt: number;
  style: HushStyle;
  draftPrompt?: string;
}

export interface HushSession {
  id: string;
  title?: string;
  createdAt: number;
  activeTrailId: string;
  persistence: 'session' | 'local';
  trails: Record<string, ThoughtTrail>;
  messages: ChatMessage[];
  supabaseSync?: {
    trailIds: Record<string, string>;
    messageIds: Record<string, string>;
    savedAt?: number;
  };
}

export type ConnectionStatus =
  | 'configuration_missing'
  | 'ready'
  | 'connecting'
  | 'offline'
  | 'model_missing'
  | 'loading'
  | 'generating'
  | 'failed';

export interface HealthResponse {
  status: 'ready' | 'configuration_missing' | 'offline' | 'model_missing' | 'error';
  model: string;
  message: string;
  modelsAvailable?: string[];
  suggestedAction?: string;
}

export interface SuggestionChip {
  id: string;
  title: string;
  prompt: string;
  style: HushStyle;
}
