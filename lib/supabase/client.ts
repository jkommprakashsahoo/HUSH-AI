'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let anonymousSessionPromise: Promise<string> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  browserClient ??= createBrowserClient(url, publishableKey);
  return browserClient;
}

export async function ensureAnonymousSupabaseSession(): Promise<string> {
  if (anonymousSessionPromise) return anonymousSessionPromise;

  anonymousSessionPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error('Could not restore the anonymous Supabase session.');

    if (sessionData.session) {
      if (!sessionData.session.user.is_anonymous) {
        throw new Error('Hush sync requires an anonymous Supabase session.');
      }
      return sessionData.session.user.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user || !data.user.is_anonymous) {
      throw new Error('Could not create an anonymous Supabase session. Check that Anonymous Sign-Ins are enabled.');
    }
    return data.user.id;
  })();

  try {
    return await anonymousSessionPromise;
  } catch (error) {
    anonymousSessionPromise = null;
    throw error;
  }
}
