# Hush GitHub and Vercel Deployment Checklist

## Current publication status

- **Git repository:** BLOCKED — `C:\Users\Win11\Desktop\HUSH AI` is not currently a Git repository (`git status` reports no `.git` directory).
- **GitHub remote:** BLOCKED — no remote exists because no repository has been initialized or selected.
- **Vercel CLI/project:** BLOCKED — Vercel CLI is not installed and no Vercel project was inspected.
- **Production inference:** BLOCKED — no authorized, reachable Ollama-compatible host has been configured or verified.
- **Frontend build:** READY — `npm run build` passes without a production Ollama host.

## Before creating a GitHub repository

- [x] `.gitignore` excludes `.env*.local`, `node_modules`, `.next`, logs, and generated TypeScript build info.
- [x] `.env.example` contains placeholders only.
- [x] No model weights, runtime data, tokens, or `.env.local` values are documented or staged.
- [x] Build, TypeScript, and lint checks were run; see `QA_CHECKLIST.md`.
- [ ] Choose an existing GitHub repository or authorize creating a new repository name/visibility. Do not invent a remote URL.

After you choose the GitHub target:

```bash
git init
git add .
git status
git diff --cached
git commit -m "Prepare Hush for GitHub and Vercel deployment"
git branch -M main
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Review `git status` and the staged diff before the commit. Do not add `.env.local`.

## Vercel deployment

1. Import the selected GitHub repository in the Vercel dashboard as a **new** project. Do not replace an existing project or production domain.
2. Use the detected Next.js framework settings. This application uses App Router route handlers and does not need a persistent background process.
3. Create a **Preview** deployment first.
4. For a frontend-only Preview, leave `OLLAMA_BASE_URL` unset. `/api/health` will truthfully return `configuration_missing`, and `/api/chat` will return HTTP 503 with recovery guidance.
5. To enable real production AI, set these server-side Vercel environment variables only after a secure inference host is available:

   ```dotenv
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=https://authorized-inference.example.internal-or-private
   OLLAMA_MODEL=qwen3:4b
   OLLAMA_TIMEOUT_MS=120000
   OLLAMA_API_TOKEN=server-only-secret-if-required
   ```

6. The inference host must be reachable from Vercel, use TLS where applicable, require authorization, enforce limits, and must **not** expose Ollama port `11434` directly to the public internet.
7. Do not use a managed Google Colab localhost/tunnel as a Vercel production endpoint. Colab experiments are ephemeral and are not automatically a permitted public service.
8. Verify Preview UI and `/api/health`; verify a genuine streaming `/api/chat` request only after an authorized production host is configured.
9. Promote to production only after the checklist in `QA_CHECKLIST.md` has passed for the deployment.

## Rollback and incident response

- Remove or rotate `OLLAMA_API_TOKEN` in Vercel project settings if it is exposed.
- Disable/remove the affected deployment or environment variable rather than adding a cloud-model fallback.
- The UI remains usable for local session inspection; it must show the actual unavailable/configuration state instead of fabricating responses.
