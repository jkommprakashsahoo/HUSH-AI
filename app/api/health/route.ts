import { NextResponse } from 'next/server';
import { getLocalProvider, getAIConfig } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  const provider = getLocalProvider();
  const config = getAIConfig();

  try {
    const health = await provider.checkHealth();

    if (!health.configured) {
      return NextResponse.json(
        {
          status: 'configuration_missing',
          model: config.model,
          message: 'Private AI is not configured for this deployment.',
          suggestedAction: 'Configure OLLAMA_BASE_URL to an authorized, reachable Ollama-compatible inference host.',
          modelsAvailable: [],
        },
        { status: 200 }
      );
    }

    if (!health.reachable) {
      return NextResponse.json(
        {
          status: 'offline',
          model: config.model,
          message: health.error || 'Ollama is unreachable from this server.',
          suggestedAction: health.details || 'Verify that the configured Ollama host is running and reachable from this server.',
          modelsAvailable: [],
        },
        { status: 200 } // Return 200 with status payload so client handles gracefully without HTTP exceptions
      );
    }

    if (!health.modelAvailable) {
      return NextResponse.json(
        {
          status: 'model_missing',
          model: config.model,
          message: `The configured model "${config.model}" is not installed locally.`,
          suggestedAction: `Run \`ollama pull ${config.model}\` in your terminal to download it.`,
          modelsAvailable: health.modelsInstalled,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'ready',
        model: config.model,
        message: `Local model ${config.model} is ready for private inference.`,
        modelsAvailable: health.modelsInstalled,
      },
      { status: 200 }
    );
  } catch {
    // Return sanitized status response, never leak raw stack traces or host internals
    return NextResponse.json(
      {
        status: 'error',
        model: config.model,
        message: 'Could not complete local AI runtime health check.',
        suggestedAction: 'Verify your local Ollama installation and try again.',
        modelsAvailable: [],
      },
      { status: 200 }
    );
  }
}

