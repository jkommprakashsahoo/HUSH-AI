# Local Setup

This guide covers the current Hush AI MVP on Windows, macOS, and Linux. Commands below are based on the checked-in `package.json`, `package-lock.json`, and `.env.example`.

## Prerequisites

| Requirement | Version / need |
| --- | --- |
| Node.js | `18.18` or newer; Node 20 LTS is recommended. The project uses Next.js 15.2.1. |
| npm | npm 9 or newer is recommended for the version-3 `package-lock.json`; npm is installed with Node.js. |
| Git | Required only when cloning a hosted repository. |
| Ollama | Required to receive real local model responses. Install the current Ollama release for your OS. The project does not pin an Ollama version. |
| Model | `qwen3:4b` is the configured default. Download it with `ollama pull qwen3:4b`. |
| Python | Not required by the web application. |
| Supabase | Optional, only for anonymous auth and explicitly saved conversation sync. Existing project tables and owner-based RLS policies must already be configured. No migration or seed command is included. |

Check Node and npm versions:

```text
node --version
npm --version
```

## 1. Get the project files

This checkout has no configured Git remote, so a repository clone URL is not available here. If you have an authorized repository URL, replace the two placeholders with its actual URL and directory name:

```text
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

For example, the clone URL must be the one supplied by your repository owner; this guide does not assume or invent a GitHub location. Alternatively, open the project folder you already received in a terminal.

Run the remaining commands from the project root (the directory containing `package.json`).

## 2. Install dependencies

The project has a `package-lock.json`; use `npm ci` for a reproducible install:

```text
npm ci
```

## 3. Create `.env.local`

The default local Ollama URL is supplied by the app when `OLLAMA_BASE_URL` is unset, but copying the checked-in template is recommended.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux (POSIX shell):**

```sh
cp .env.example .env.local
```

The template sets `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:4b`, and `OLLAMA_TIMEOUT_MS=120000`. `OLLAMA_API_TOKEN` is optional and should be set only when the authorized inference host requires it. To use Supabase sync, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's values and replace `HUSH_SYNC_ENCRYPTION_KEY` with a generated Base64-encoded 32-byte key. Enable Anonymous Sign-Ins and owner-based RLS in Supabase. Keep real credentials out of source control; `.env.local` is ignored by `.gitignore`.

Generate a server-only encryption key with this copy-paste command (same on Windows, macOS, and Linux), then copy the output into `.env.local`:

```text
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

The Supabase URL and publishable key are public client configuration, not service credentials. Never use a service-role key. Restart Next.js after changing environment variables.

## 4. Start Ollama and download the model

Install Ollama using its official installer for your operating system. If its service is not already running, start it in a separate terminal:

```text
ollama serve
```

In another terminal, download the configured default model:

```text
ollama pull qwen3:4b
```

Ollama may start automatically on some systems. If `ollama serve` reports that the port is already in use, the service is likely already running; continue to the health check.

## 5. Start Hush and open it

From the project root:

```text
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Check runtime status at [http://localhost:3000/api/health](http://localhost:3000/api/health). A ready local runtime should report `"status": "ready"`.

If port 3000 is occupied, start Next.js on port 3001:

```text
npm run dev -- --port 3001
```

Then open `http://localhost:3001`.

## Database, migrations, and seed data

For normal chat and Thought Trails, no database setup is required; browser `sessionStorage` remains the default. Supabase sync is optional and requires the already provisioned `public.conversations` and `public.messages` tables, Anonymous Sign-Ins, and owner-based RLS policies. The app does not create, drop, migrate, or seed tables. See the active table contract in `DATABASE.md`; do not apply its separately labeled future-state SQL to the live project.

## Checks and tests

Run these commands from the project root:

```text
npm run typecheck
npm run lint
npm run build
```

There is no `npm test` command and no configured unit or integration test runner in `package.json`.

The project does provide a live response-style check. First ensure Ollama is running with `qwen3:4b` available and start Hush with `npm run dev` in a separate terminal. Then run:

```text
npm run test:styles
```

It sends a real request for each of the four response styles to `http://127.0.0.1:3000`; it can take time because it waits for model output. To target another running Hush server, set `HUSH_TEST_URL`.

**Windows PowerShell:**

```powershell
$env:HUSH_TEST_URL = 'http://127.0.0.1:3001'
npm run test:styles
```

**macOS / Linux (POSIX shell):**

```sh
HUSH_TEST_URL=http://127.0.0.1:3001 npm run test:styles
```

`npm run test:styles` is an inference smoke check, not a unit-test suite. See `QA_CHECKLIST.md` for current automated and manual verification status.

## Common setup errors

1. **`node` or `npm` is not recognized / command not found.** Install Node.js 18.18 or newer, open a new terminal so PATH refreshes, then rerun `node --version` and `npm --version`.
2. **Node.js is older than 18.18.** Upgrade Node.js to 18.18+ (Node 20 LTS recommended), then run `npm ci` again.
3. **`npm ci` fails because the lockfile and manifest disagree.** Make sure you are in the project root and that `package.json` and `package-lock.json` came from the same checkout. Do not delete the lockfile to bypass the mismatch.
4. **Next.js says it cannot find a `package.json` or script.** Change to the project root (the folder containing `package.json`) before running `npm ci` or any `npm run` command.
5. **The app reports `configuration_missing`.** This is expected in production without `OLLAMA_BASE_URL`. For local use, leave it unset to use `http://127.0.0.1:11434`, or set the local URL in `.env.local`, then restart the dev server.
6. **Health reports `offline`, or chat returns `OLLAMA_OFFLINE`.** Start Ollama with `ollama serve`, confirm it is reachable on the configured host, and restart Hush after changing `.env.local`.
7. **Health reports `model_missing`, or chat returns `MODEL_NOT_FOUND`.** Download the configured model using `ollama pull qwen3:4b`, or ensure `OLLAMA_MODEL` matches a model installed in Ollama.
8. **A remote Ollama-compatible host returns an authorization or connection error.** Set `OLLAMA_BASE_URL` to the host's base URL (not the `/v1` path; the app adds `/v1` for inference), and set `OLLAMA_API_TOKEN` only if that host requires a bearer token. Restart the Next.js server after changing variables.
9. **Chat returns `TIMEOUT` / HTTP 504.** The model may still be loading or the host may be resource constrained. Wait for warm-up; if appropriate, increase `OLLAMA_TIMEOUT_MS` in `.env.local` and restart the app.
10. **`EADDRINUSE` / port 3000 is already in use.** Stop the other app using that port or run `npm run dev -- --port 3001` and open `http://localhost:3001`.
11. **`npm run test:styles` cannot connect.** Keep `npm run dev` running in another terminal, confirm the target URL and port, and set `HUSH_TEST_URL` using the command for your shell if necessary.
12. **`npm run test:styles` fails or takes a long time.** Confirm the health endpoint reports `ready`, the configured model is installed, and Ollama can complete a chat request. The script waits up to 180 seconds for each live generation.
13. **Supabase auth or saved-conversation sync fails.** Confirm the two `NEXT_PUBLIC_SUPABASE_*` values, restart Next.js, ensure Anonymous Sign-Ins are enabled, check the existing table columns and owner-based RLS policies, and set a valid server-only `HUSH_SYNC_ENCRYPTION_KEY`.
14. **A saved title/content cannot be decrypted.** Ensure the same Base64-encoded 32-byte `HUSH_SYNC_ENCRYPTION_KEY` is configured as when the record was saved; losing/changing the key makes existing encrypted content unreadable.
15. **You are looking for PostgreSQL, migration, or seed commands.** No migration or seed command exists; tables are managed in the existing Supabase project. Do not recreate or drop them.
16. **You are looking for `npm test`.** There is no test-runner script in `package.json`. Use `npm run typecheck`, `npm run lint`, `npm run build`, and, with Ollama running, `npm run test:styles`.

## Platform notes

- The `npm` commands, Ollama commands, and URLs are the same on Windows, macOS, and Linux.
- Only copying `.env.example` differs above: PowerShell uses `Copy-Item`; macOS/Linux shells use `cp`.
- Run `ollama serve` in its own terminal only when the Ollama service is not already running.
- Do not use a Google Colab localhost/tunnel as a production inference host. Keep inference credentials server-side.
