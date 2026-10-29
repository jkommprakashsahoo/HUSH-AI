# Hush AI Integrations

This guide documents integrations currently used or explicitly excluded by the current product. Supabase conversation sync is active but opt-in; its browser auth session does not automatically persist transcript data.

## Integration policy

- The MVP has no payments, email, remote file storage, mandatory accounts, or cloud-model provider.
- Chat, health, and conversation persistence use Hush's Next.js API routes. The browser never calls an inference provider directly. The browser Supabase client is used only for anonymous Auth session handling.
- Keep each future external service behind a small server-side adapter/service module. Route handlers call that module; UI code calls Hush routes. Do not scatter provider SDK calls through components.
- Keep secrets in server-side environment configuration. The Supabase publishable key and project URL are intentionally `NEXT_PUBLIC_`; never use a public prefix for server secrets, including the Supabase service-role key and sync encryption key. Never commit real values.
- Do not add a provider, SDK, database, or external data flow that conflicts with the PRD without first asking for product approval and updating the source-of-truth documents.

## Active MVP integrations

### Supabase anonymous auth and opt-in conversation sync

**Why:** Anonymous Supabase Auth gives each visitor an owner ID without a login/signup screen. Conversations remain browser-local by default; only the explicit Save action sends transcript data for remote storage. Load and delete operations are likewise explicit.

**Environment:** Both public settings are required to establish the browser session. Remote save/load additionally requires the server-only encryption key.

| Variable | Required | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for anonymous auth/sync | `https://YOUR_PROJECT_ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for anonymous auth/sync | `YOUR_SUPABASE_PUBLISHABLE_KEY` |
| `HUSH_SYNC_ENCRYPTION_KEY` | Yes for encrypted save/load | `YOUR_BASE64_ENCODED_32_BYTE_KEY` |

Use placeholders in docs and deployment templates only. Keep `.env.local` untracked. Do not configure or use a Supabase service-role key. Enable Anonymous Sign-Ins in the Supabase dashboard and keep owner-based RLS enabled on both `public.conversations` and `public.messages`.

**SDK/packages:** `@supabase/supabase-js` and `@supabase/ssr`, already installed. No dependency is added by this integration.

**Wrapping files and data path:**

- `lib/supabase/client.ts` creates the browser client and reuses or creates an anonymous session.
- `lib/supabase/server.ts` creates a cookie-aware server client for Next.js 15.
- `app/api/conversations/route.ts` authenticates with `auth.getUser()`, validates payloads, applies `owner_id` filters, encrypts values, and performs CRUD through the user's session.
- `lib/supabase/conversation-crypto.ts` uses AES-256-GCM with a server-only 32-byte key. It is not end-to-end encryption.
- `hooks/use-supabase-conversations.ts` and `components/CloudConversations.tsx` provide the explicit save/list/load/delete UI and operation states.

The tables are provisioned outside this repository; no migration is run and no table is created, altered, or dropped. Their active field contract is documented in `DATABASE.md`. Browser `sessionStorage` remains the default and is independent of Supabase auth. Merely creating the anonymous auth user does not write conversation content.

**Webhooks, retries, idempotency, and errors:**

- Supabase Auth does not use a Hush webhook in this integration.
- Saves upsert stable conversation/message UUIDs and can be retried after partial failure. The save operation is not transactional, so a failed request may leave partial records.
- Deletes process a tree sequentially and are also not transactional. A partial failure is surfaced; the UI must not show success unless the API confirms deletion.
- List/load/save/delete require a cookie-backed anonymous session. Queries include the actual authenticated `owner_id`; RLS provides the database enforcement boundary.
- Missing auth returns `401`; invalid data `400`; missing/foreign conversation `404`; Supabase/encryption configuration issues `503`; and unexpected persistence/decryption failures `500`, using the standard envelope in `API.md`.
- Cross-user RLS isolation has not yet been verified in this checkout. Do not describe the security behavior as tested until it passes with two independent anonymous identities.

**Cost, limits, and fallback:** Supabase quotas and pricing depend on the selected project plan and usage; consult the active plan. The API caps saves at 5 MiB, 100 trails, and 1,000 messages. Listing is limited to 100 root conversations with no pagination. If Supabase or anonymous auth is unavailable, users can continue with browser session/local storage; remote sync is unavailable, and the UI must show an error rather than claim success. Loss of the encryption key prevents decrypting saved conversation content.

**Testing:** Confirm Anonymous Sign-Ins are enabled, check the session is reused across reloads, explicitly save then list/load/delete a conversation, and create branches to verify parent/source relationships. Test RLS with two separate anonymous users: user B must not list, load, update, or delete user A's rows even when given a known UUID. Those end-to-end and two-user checks are still unverified in this checkout.

### Ollama-compatible inference

**Why:** Hush generates real streamed answers using an authorized Ollama-compatible host and open-weight models. It must not fall back to OpenAI, Anthropic, or any commercial cloud model.

**Environment:** These server-only variables are defined by `ARCHITECTURE.md` and `.env.example`.

| Variable | Required | Example |
| --- | --- | --- |
| `LLM_PROVIDER` | Optional; only `ollama` is supported | `ollama` |
| `OLLAMA_BASE_URL` | Optional for local development; required for production inference | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Optional; defaults to `qwen3:4b` | `qwen3:4b` |
| `OLLAMA_TIMEOUT_MS` | Optional; defaults to `120000` | `120000` |
| `OLLAMA_API_TOKEN` | Optional; only when the authorized host requires bearer authentication | `YOUR_SERVER_ONLY_TOKEN` |

Never put an actual token in documentation or source control. For deployed environments, set variables in the hosting provider's server-side secret/environment settings. Do not expose port `11434` directly to the public internet.

**SDK/package:** `ai` and `@ai-sdk/openai-compatible` from `package.json`. The latter is a protocol adapter pointed at Ollama's compatible API; it does not mean Hush calls OpenAI. There is no separate Ollama SDK.

**Service boundary and setup:**

1. Install and start Ollama locally, then download the configured model. For the default setup, see `SETUP.md` (`ollama serve` and `ollama pull qwen3:4b`).
2. Set `OLLAMA_BASE_URL` to the authorized host reachable from the Hush server. For local development the code defaults to `http://127.0.0.1:11434`; production must configure a reachable authorized endpoint.
3. If the host requires authentication, configure `OLLAMA_API_TOKEN` on the server only. Use TLS for network-reachable production hosts.
4. Configure the model and timeout as required; never accept an arbitrary provider URL or credential from a browser request.
5. Start Hush and check `GET /api/health`. Only enable a real deployment after it reports `ready` and a genuine streamed chat succeeds.

**Wrapping files:** `lib/ai.ts` owns configuration, the `OllamaProvider` adapter, health checks, and streamed inference. `app/api/health/route.ts` exposes sanitized health status; `app/api/chat/route.ts` validates requests, rate-limits chat, invokes the adapter, streams output, and maps errors to the API contract. The frontend calls `/api/health` and `/api/chat`, never Ollama.

**Webhooks, retries, idempotency, and errors:**

- Ollama has no Hush webhook integration. The app makes outbound health and generation requests.
- No idempotency key is implemented. Chat is a non-idempotent generation request; repeating it can consume additional inference time. Do not automatically retry a request after output has started.
- The user can retry through the chat UI. Preserve partial output if a stream fails after its first token. Do not retry on behalf of the user in a way that could create duplicate generations.
- Health failure is reported as a truthful status. Chat returns documented `503` configuration/offline errors, `404` for a missing model, `504` for timeout, and safe `500` for unexpected generation errors. Validation and rate-limit errors follow `API.md`.
- There is no cloud-model fallback. If the host is down, show the unavailable state and allow an explicit user retry after recovery.

**Cost and limits:** Local inference has no per-token SaaS charge but consumes the operator's compute, memory, power, and hosting capacity. A hosted authorized endpoint may have its own costs and limits; check that host's contract. The app's current `POST /api/chat` limit is 60 requests per client IP per fixed 60-second window in an in-memory per-process map; it is best-effort, not a distributed limit. The request size, history count, and generation timeout are bounded as documented in `API.md` and `ARCHITECTURE.md`.

**Testing:** Use the local Ollama install and configured model. Check `GET /api/health`, send a real request through the Hush UI or `/api/chat`, and run `npm run test:styles` against a running Hush server. This is a live inference check, not a sandbox. Verify missing configuration, offline runtime, missing model, timeout, and successful streaming without substituting fake content.

### Vercel hosting

**Why:** The PRD and architecture identify Vercel as the intended host for the Next.js frontend and request-scoped API routes. Vercel does not host a persistent Ollama process; inference must run on a separately authorized and reachable host.

**Environment:** No Vercel-specific application variable is defined. Configure the Ollama variables above in Vercel's server-side project environment settings only when a secure inference host is ready. `OLLAMA_BASE_URL` may be left unset for a frontend-only Preview.

**SDK/package:** None is required by the app. Vercel's deployment integration is configured in the Vercel dashboard. Do not add a Vercel SDK for ordinary deployment.

**Service boundary and setup:**

1. Choose or create the GitHub repository through an authorized account; the current deployment checklist says this workspace has no configured Git remote.
2. Import that repository as a new Vercel project. Keep the existing Next.js framework detection and create a Preview deployment first.
3. For frontend-only Preview, leave `OLLAMA_BASE_URL` unset. `/api/health` must report `configuration_missing`, and chat must return the documented service-unavailable error.
4. Once a secure authorized inference endpoint exists, add the Ollama environment variables in Vercel's server-only settings and redeploy Preview.
5. Verify health and a real streaming request before promoting the deployment. Follow `DEPLOYMENT_CHECKLIST.md`.

**Wrapping files:** No Vercel-specific backend wrapper or webhook handler exists. Vercel runs the existing Next.js routes, which in turn call `lib/ai.ts`. Do not put Vercel credentials in application code.

**Webhooks, retries, idempotency, and errors:** Hush does not consume Vercel webhooks. Vercel deployment retry/rollback controls are operated through its dashboard or Git integration. Chat generation remains non-idempotent, as described above; platform retries must not turn a partially streamed generation into a silent duplicate. Runtime failures remain the Hush API errors in `API.md`.

**Cost and limits:** Pricing, function duration, and resource limits depend on the selected Vercel plan and deployment configuration; check the current project plan before enabling inference. Serverless route time limits must be compatible with `OLLAMA_TIMEOUT_MS`. Per-process in-memory rate limiting is not shared across instances. If limits or the host are unavailable, leave the UI deployed in the documented configuration-missing/unavailable state; do not add a cloud-model fallback.

**Testing:** Use a Preview deployment. Test the frontend-only state without inference configuration first. Then, only after configuring an authorized host, test `/api/health` and an actual streamed chat request. Do not use a Colab tunnel as a production endpoint.

### GitHub source hosting

**Why:** The PRD release criteria call for a GitHub repository and Vercel Preview. GitHub is not part of the Hush runtime and is not currently connected to this workspace.

**Environment:** None is required by Hush. Authenticate through GitHub/Vercel's official account flows; never add a personal access token to the app's environment file.

**SDK/package:** None is used by the application. No GitHub Actions workflow or GitHub webhook handler is documented as part of the MVP.

**Service boundary and setup:**

1. Select an existing repository or authorize creating one, including its visibility.
2. Review `.gitignore`, especially local environment files, and inspect staged changes before publishing.
3. Initialize/link and push only to the repository the owner selected. `DEPLOYMENT_CHECKLIST.md` contains the exact commands and currently marks this as blocked pending repository authorization.
4. Import that repository into Vercel for Preview deployment.

**Wrapping files:** None in the application. GitHub-to-Vercel deployment is an external build/deploy integration; it does not handle application requests.

**Webhooks, retries, idempotency, and errors:** No GitHub webhook is consumed by Hush. Repository pushes and Vercel deployment events are managed by the host services, not by an application endpoint. On a failed deployment, inspect the provider logs and retry or roll back explicitly; do not treat a failed deployment as a successful release.

**Cost and limits:** GitHub plan, repository visibility, Actions usage, and organization policy determine any limits or charges. The MVP defines no CI workflow and no runtime GitHub API calls. If GitHub is unavailable, the running app and its local browser sessions do not depend on it.

**Testing:** After an authorized repository is connected, verify that the intended branch and commit appear in GitHub and that Vercel creates a Preview deployment. No GitHub sandbox is required for the MVP.

### Google Colab experimentation

**Why:** The PRD and architecture mention Colab only for temporary model/GPU experiments, separate from the Hush production data flow.

**Environment:** None in Hush. Do not add Colab credentials or runtime URLs to `.env.local` or Vercel settings.

**SDK/package:** None in the Hush application; the experiment is the notebook under `colab/`.

**Service boundary and setup:**

1. Open the existing experiment notebook in an authorized Colab account when experimentation is needed.
2. Run notebook steps only for temporary model experiments and review what data those steps send to the runtime.
3. Keep the experiment private and isolated. Do not create public tunnels/proxies or configure a Colab host as `OLLAMA_BASE_URL` for production.

**Wrapping files:** No backend wrapper. The notebook is not imported by the application and must not be used to serve production requests.

**Webhooks, retries, idempotency, errors:** No application webhooks or idempotency behavior. Colab sessions are temporary; restart/reconnect the experiment manually if its runtime disconnects. No user chat data should be sent to the experiment.

**Cost and limits:** Availability, GPU/CPU quotas, session duration, and any paid usage depend on the current Colab account and plan. Treat all capacity as temporary. If the runtime is unavailable, skip the experiment; the application remains governed by its configured Ollama host.

**Testing:** Run the notebook experiment in its own session and confirm it does not expose a public endpoint or change Hush production configuration. There is no Hush integration sandbox.

### Google Fonts (presentation asset)

**Why:** `app/layout.tsx` currently loads Geist and Newsreader styles from Google Fonts.

**Environment and SDK:** None. The application uses a stylesheet URL; no SDK or backend credentials are involved.

**Boundary and setup:** This is a static presentation asset currently requested by the browser from Google Fonts, not an API/service used for user data. No prompt, transcript, or credential is sent in this font request. There is no backend wrapper; this is the documented static-asset exception to the server-side API rule. If removing third-party font requests becomes a requirement, approve a change to self-host the chosen font assets and update the layout; do not pretend this current request is server-side.

**Webhooks, retries, idempotency, cost, rate limits, and fallback:** No webhooks or idempotency apply. The app's CSS font-family fallbacks keep text readable if the font host is unavailable. Availability and request limits are controlled by Google; Hush makes no guarantee about that external asset.

**Testing:** Load the app with network access and inspect the computed typography; then block the font host in browser dev tools and confirm the fallback remains legible.

## Not required by the MVP

These are not integrations to configure. Adding them would change product scope and, in some cases, contradict explicit PRD requirements.

| Requested category/provider | MVP status and reason | Required variables, SDK, setup, webhook, sandbox, and fallback |
| --- | --- | --- |
| Payments: Stripe or Razorpay | Not required; no subscriptions, purchases, billing, or paid features exist in the PRD. | None. No payment SDK, checkout routes, webhook endpoints, idempotency store, or sandbox configuration. Do not add payment flows without product approval. |
| Cloud AI: OpenAI or Anthropic | Prohibited for this MVP; the PRD and architecture require Ollama-compatible open-weight inference and explicitly disallow commercial cloud-model fallback. | None. No provider API key, SDK, backend wrapper, or cloud-model sandbox. If Ollama is unavailable, return the documented error instead of falling back. |
| Remote file storage: S3 or Supabase Storage | Not required; MVP has no file attachments or remote user-file feature. The PRD's optional attachments are a V2 item. | None. No bucket, storage SDK, upload endpoint, storage credentials, webhook, retry policy, or sandbox. Browser/session storage is not a remote file-storage integration. |
| Email provider | Not required; there are no accounts, verification, invitations, or email notifications in the PRD. | None. No email SDK, API key, mail-sending route, webhook, or test mailbox. |
| External telemetry/analytics | Explicitly out of scope; the PRD excludes analytics and external telemetry. | None. Do not add tracking SDKs or event endpoints. |

## Adding a future integration

Before adding any service, confirm that it is permitted by `PRD.md`, update the relevant architecture/API/privacy documentation, and obtain approval for any scope conflict. Add a small typed server-side adapter that owns configuration, request/response conversion, timeouts, safe error mapping, and any provider-specific retry rules. Keep credentials server-side and keep route handlers thin.

For webhook-driven services, verify signatures before processing, validate event schemas, persist event IDs before side effects, and make handlers idempotent. Return success only after durable processing or durable queuing; retry only transient failures with bounded backoff and observable errors. These are future integration requirements, not behavior currently implemented by Hush.
