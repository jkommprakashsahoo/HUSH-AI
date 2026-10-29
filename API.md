# Hush AI API

**Status:** MVP API contract  
**Product source of truth:** `PRD.md`  
**Architecture source of truth:** `ARCHITECTURE.md`  
**Database source of truth:** `DATABASE.md`

This document covers the HTTP endpoints currently implemented by the Next.js application, including anonymous Supabase conversation sync. Chat remains stateless. Remote conversation writes occur only after the user explicitly chooses Save.

## Conventions

### Base URL and transport

- Use the origin serving the Hush web application. Local development commonly uses `http://localhost:3000`; production must use HTTPS.
- Routes are same-origin Next.js route handlers. The browser must not call the Ollama host directly.
- All request and response bodies are UTF-8.
- `GET /api/health` and `POST /api/chat` do not require authentication.
- `/api/conversations` requires a valid cookie-backed anonymous Supabase session. There are no named application roles; the required identity is an authenticated anonymous Supabase user.

### Standard error format

Every application-generated JSON error response uses this JSON shape:

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "The request does not match the chat request schema.",
    "details": []
  }
}
```

`error.code` is a stable machine-readable identifier, `error.message` is safe for display, and optional `error.details` contains non-sensitive field-level validation information. Responses must not disclose stack traces, prompts, model output, tokens, host URLs, or other secrets.

`error.code` is a stable machine-readable identifier, `error.message` is safe for display, and `error.details` is an array (currently empty). Responses must not disclose stack traces, prompts, model output, tokens, host URLs, or other secrets. The conversations API and pre-stream chat failures use this envelope. Health runtime problems are HTTP 200 status reports, not errors. Once chat output has started streaming, later failures terminate the stream and cannot change its status or return a JSON envelope. Framework-generated `405 Method Not Allowed` responses for unimplemented methods are not guaranteed to use this envelope.

### Pagination, filtering, and sorting

`GET /api/conversations` returns at most 100 saved root conversations, sorted by `created_at` descending. It does not currently expose pagination, filters, or client-selected sorting; older rows beyond the 100-item limit cannot be fetched through this API. A detail query retrieves the complete saved tree, capped at 100 trails and 1,000 messages per save request. Chat accepts a bounded message history, not a paginated server-side transcript. Health has no pagination or filtering parameters.

### Rate limits

| Route | Current limit | Scope and behavior |
| --- | --- | --- |
| `POST /api/chat` | 60 requests per client IP per fixed 60-second window | In-memory, per application process. Exhaustion returns `429 RATE_LIMIT_EXCEEDED`. This is best-effort protection and is not shared across instances or restarts. |
| `GET /api/health` | No application-level limit is configured | Hosting/platform-level limits may still apply. |
| `/api/conversations` | No application-level limit is configured | The route caps a save request at 5 MiB, 100 trails, and 1,000 messages. Hosting/Supabase limits may also apply. |

The chat handler currently does not return `Retry-After`; clients receiving `429` should back off before retrying. Do not treat the in-memory limiter as distributed abuse prevention.

### API versioning

- The existing `/api/chat`, `/api/health`, and `/api/conversations` paths are the initial, unversioned v1 contract.
- Preserve these paths for compatible v1 changes. Do not change existing response semantics incompatibly under the same path.
- For a breaking change, introduce a versioned path such as `/api/v2/chat`, document it separately, and keep the prior contract available during a documented deprecation period.
- Do not add a version header or query-string version selector; the path is the version boundary for future versions.
- The versioned paths in this policy are rules for future work, not additional endpoints currently implemented.

## Runtime health

### `GET /api/health`

**Purpose:** Report whether the server is configured to reach an authorized Ollama-compatible inference host and whether the configured model is available. The response is a health-state report; unavailable runtime states still return HTTP `200`.

**Authentication:** No. No role is required.

**Request headers:**

| Header | Requirement | Example |
| --- | --- | --- |
| `Accept` | Optional; recommended | `application/json` |

No request body, query parameters, or additional headers are required.

**Success response — `200 OK`:**

`status` is one of `ready`, `configuration_missing`, `offline`, `model_missing`, or `error`. `modelsAvailable` is returned as an array; it is empty when the host is not reachable or configured.

```json
{
  "status": "ready",
  "model": "qwen3:4b",
  "message": "Local model qwen3:4b is ready for private inference.",
  "modelsAvailable": ["qwen3:4b", "llama3:8b"]
}
```

Example configuration-missing response (also `200 OK`):

```json
{
  "status": "configuration_missing",
  "model": "qwen3:4b",
  "message": "Private AI is not configured for this deployment.",
  "suggestedAction": "Configure OLLAMA_BASE_URL to an authorized, reachable Ollama-compatible inference host.",
  "modelsAvailable": []
}
```

**Error responses:** The current handler deliberately returns `200 OK` for runtime health failures, represented by `status` rather than an HTTP error. It returns:

- `200 OK`, `status: "offline"` when the configured runtime is unreachable or its health check fails.
- `200 OK`, `status: "model_missing"` when the configured model is not installed.
- `200 OK`, `status: "error"` if the health check throws unexpectedly.

There is no authentication error or application-specific rate-limit response configured for this route. Unsupported methods receive `405 Method Not Allowed`; the current framework-generated response is not guaranteed to use the standard error envelope.

**PRD/database mapping:**

- PRD feature: **Runtime health and deployment-safe behavior** (and the initial-load health flow).
- Database table: **None.** Health is derived from server configuration and a live inference-host check; `DATABASE.md` defines no runtime-health table. This route has a PRD feature mapping but intentionally has no table mapping.

## Chat

### `POST /api/chat`

**Purpose:** Validate a bounded conversation history and stream a real response from the configured Ollama-compatible model using the selected response style. The endpoint does not save the conversation.

**Authentication:** No. No role is required.

**Request headers:**

| Header | Requirement | Example |
| --- | --- | --- |
| `Content-Type` | Required; must be JSON | `application/json` |
| `Accept` | Optional; recommended for a successful response | `text/plain` |

No bearer token or user identity header is accepted or required. Inference-host credentials remain server-side.

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "Explain this TypeScript error." },
    { "role": "assistant", "content": "Please share the diagnostic and surrounding code." },
    { "role": "user", "content": "Type 'string | undefined' is not assignable to type 'string'." }
  ],
  "style": "explain-it"
}
```

Rules:

- The top-level object allows only `messages` and optional `style`.
- `messages` must contain 1–50 entries. Each entry allows only `role` and `content`.
- `role` must be `user` or `assistant`; `content` must be a non-empty trimmed string of at most 12,000 characters.
- The sum of message-content lengths must not exceed 65,536 JavaScript characters. The raw JSON request body is separately limited to 64 KiB.
- `style` is optional and must be one of `quick-fix`, `explain-it`, `think-with-me`, or `challenge-me`. When omitted, the server uses `quick-fix`.
- Send only the active trail's resolved lineage and turns; sibling-only turns must not be included.

**Success response — `200 OK`:**

The body is a streamed UTF-8 plain-text response, not JSON and not a JSON-lines/event-stream format. Consume it incrementally until the response completes. The response includes:

| Header | Value |
| --- | --- |
| `Content-Type` | `text/plain; charset=utf-8` |
| `Cache-Control` | `no-cache, no-transform` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Hush-Style` | The resolved style used for generation |

Example body (illustrative; actual content is generated by the configured model):

```text
The value may be undefined, so check it before passing it to a function that requires a string.
```

The server waits for the first generated text before sending response headers. Configuration, connection, missing-model, and timeout failures detected before that first text use the JSON error responses below. If generation fails after text streaming has begun, the stream terminates; the client must preserve partial text and display a safe failure state because the already-sent HTTP status cannot change.

**Error responses:**

All JSON errors from `POST /api/chat` use the standard nested envelope defined above. A failure detected before the first generated text returns its corresponding JSON status and error code. If a failure occurs after streaming begins, the stream terminates and the client should preserve any partial text while showing a safe failure state.

| HTTP status | Code | When it occurs | Example response |
| --- | --- | --- | --- |
| `400 Bad Request` | `INVALID_JSON` | The body is empty or is not valid JSON. | `{"error":{"code":"INVALID_JSON","message":"The request body must contain valid JSON."}}` |
| `400 Bad Request` | `INVALID_PAYLOAD` | The JSON does not match the strict schema, a field is invalid, or the message-content limit is exceeded. | `{"error":{"code":"INVALID_PAYLOAD","message":"Invalid request format or message payload exceeded limits."}}` |
| `413 Content Too Large` | `PAYLOAD_TOO_LARGE` | The raw request body exceeds 64 KiB. | `{"error":{"code":"PAYLOAD_TOO_LARGE","message":"The request is too large. Shorten the conversation and try again."}}` |
| `415 Unsupported Media Type` | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` is not `application/json`. | `{"error":{"code":"UNSUPPORTED_MEDIA_TYPE","message":"Send the chat request as JSON."}}` |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | The client IP exceeds 60 requests in the current 60-second window. | `{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please wait a moment before sending another message."}}` |
| `503 Service Unavailable` | `INFERENCE_NOT_CONFIGURED` | No authorized inference host is configured for the deployment. | `{"error":{"code":"INFERENCE_NOT_CONFIGURED","message":"Private AI is not configured for this deployment. Configure an authorized Ollama host and try again."}}` |
| `503 Service Unavailable` | `OLLAMA_OFFLINE` | The configured Ollama runtime cannot be reached. | `{"error":{"code":"OLLAMA_OFFLINE","message":"Local Ollama runtime is offline. Start Ollama and try again."}}` |
| `404 Not Found` | `MODEL_NOT_FOUND` | The configured model is missing from the runtime. | `{"error":{"code":"MODEL_NOT_FOUND","message":"Configured local model is missing or not installed in Ollama."}}` |
| `504 Gateway Timeout` | `TIMEOUT` | Inference exceeds the configured timeout. | `{"error":{"code":"TIMEOUT","message":"Local model inference timed out."}}` |
| `500 Internal Server Error` | `GENERATION_ERROR` | Any other unexpected inference/generation failure. | `{"error":{"code":"GENERATION_ERROR","message":"Unable to process generation with local AI runtime."}}` |
| `405 Method Not Allowed` | `METHOD_NOT_ALLOWED` | The path is called using a method other than `POST`. | `{"error":{"code":"METHOD_NOT_ALLOWED","message":"This method is not supported for this resource."}}` |

Client cancellation aborts the generation request and may end the stream without a complete response; it is not a separate JSON error response. Preserve any partial text and represent cancellation in the client state as specified by the PRD.

**PRD/database mapping:**

- PRD feature: **Anonymous chat workspace**, including real streamed responses, response styles, stop/retry behavior, and truthful inference errors.
- Database table: **No table is read or written by chat inference.** Conversation data is persisted only through the separate explicit-save API using `public.conversations` and `public.messages`. This route is intentionally stateless and is a flagged feature-without-table exception.

## Saved conversations

These endpoints transfer data only after explicit user action. The browser Supabase client establishes/restores the anonymous session; the API authenticates it using the request cookies and never accepts an owner ID from the caller. Reads/deletes apply explicit `owner_id` filters; writes set `owner_id` from the authenticated user. All operations use that user's session and remain subject to the existing owner-based RLS policies.

### `GET /api/conversations`

**Purpose:** List up to 100 saved root conversations, newest first. Include `?id=<uuid>` to load one saved conversation and its complete Thought Trail tree.

**Authentication:** Yes. A valid cookie-backed anonymous Supabase session is required; no login/signup or named role is required.

**Request headers:** `Accept: application/json` is optional. Browser requests must include same-origin credentials/cookies. No request body is used.

**Query parameters:**

| Parameter | Required | Meaning |
| --- | --- | --- |
| `id` | No | Valid conversation UUID. Omit to list roots; provide to load the root and all descendant trails/messages. |

List response (`200 OK`):

```json
{
  "conversations": [
    {
      "id": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
      "title": "How closures work",
      "style": "explain-it",
      "created_at": "2026-01-15T12:00:00.000Z"
    }
  ]
}
```

The server decrypts the title for this authenticated owner before returning it. The detail response decrypts content server-side and returns:

```json
{
  "session": {
    "id": "session_d4a0b223-c18c-4c45-9f08-49dc12e25751",
    "title": "How closures work",
    "createdAt": 1768488000000,
    "activeTrailId": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
    "persistence": "session",
    "trails": {
      "d4a0b223-c18c-4c45-9f08-49dc12e25751": {
        "id": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
        "name": "Main Conversation",
        "createdAt": 1768488000000,
        "style": "explain-it",
        "draftPrompt": ""
      },
      "74857c23-19ba-43e4-9d8b-9cf47137690f": {
        "id": "74857c23-19ba-43e4-9d8b-9cf47137690f",
        "name": "Explain with an example",
        "parentTrailId": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
        "parentMessageId": "1cd44d27-47e0-4b2b-a4ef-820f1abcb00c",
        "createdAt": 1768488100000,
        "style": "quick-fix",
        "draftPrompt": ""
      }
    },
    "messages": [
      {
        "id": "1cd44d27-47e0-4b2b-a4ef-820f1abcb00c",
        "role": "assistant",
        "content": "A closure captures variables from its surrounding scope.",
        "createdAt": 1768488050000,
        "trailId": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
        "style": "explain-it"
      }
    ],
    "supabaseSync": {
      "trailIds": {},
      "messageIds": {},
      "savedAt": 1768488200000
    }
  }
}
```

**Errors (both list and detail):**

| Status | Code | Cause |
| --- | --- | --- |
| `401` | `ANONYMOUS_SESSION_REQUIRED` | Missing, invalid, or non-anonymous session. |
| `400` | `INVALID_CONVERSATION_ID` | `id` is present but is not a UUID. |
| `404` | `CONVERSATION_NOT_FOUND` | Root ID is missing, is a child rather than a root, or is not owned by this user. Cross-owner records are intentionally indistinguishable from missing records. |
| `500` | `SYNC_DATA_INVALID` | A saved encrypted value could not be decrypted/validated. |
| `500` | `PERSISTENCE_ERROR` | Supabase query or persistence failure. |
| `503` | `SUPABASE_NOT_CONFIGURED` | Server-side Supabase URL/key is unavailable. |
| `503` | `SYNC_ENCRYPTION_NOT_CONFIGURED` / `SYNC_ENCRYPTION_KEY_INVALID` | The server-only encryption key is missing or malformed. |

### `POST /api/conversations`

**Purpose:** Explicitly save/upsert the current conversation and every Thought Trail and message in its tree. The route encrypts title/trail names and message contents before writing and assigns every row the authenticated user's actual anonymous ID.

**Authentication:** Yes. A valid cookie-backed anonymous Supabase session is required. No owner ID is accepted in the body.

**Request headers:** The client sends `Content-Type: application/json`; the current handler parses and validates the body but does not separately enforce this header. `Accept: application/json` is optional. Same-origin credentials/cookies are required. Maximum JSON body is 5 MiB.

**Request body example:**

```json
{
  "session": {
    "title": "How closures work",
    "createdAt": 1768488000000,
    "activeTrailId": "root",
    "trails": {
      "root": {
        "id": "root",
        "name": "Main Conversation",
        "createdAt": 1768488000000,
        "style": "explain-it"
      },
      "branch": {
        "id": "branch",
        "name": "Explain with an example",
        "parentTrailId": "root",
        "parentMessageId": "answer-1",
        "createdAt": 1768488100000,
        "style": "quick-fix"
      }
    },
    "messages": [
      {
        "id": "answer-1",
        "role": "assistant",
        "content": "A closure captures variables from its surrounding scope.",
        "createdAt": 1768488050000,
        "trailId": "root"
      }
    ]
  },
  "syncIds": {
    "trailIds": {
      "root": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
      "branch": "74857c23-19ba-43e4-9d8b-9cf47137690f"
    },
    "messageIds": {
      "answer-1": "1cd44d27-47e0-4b2b-a4ef-820f1abcb00c"
    }
  }
}
```

The session is limited to 100 trails, 1,000 messages, 12,000 characters per message, 200 characters per title/trail name, valid styles/roles, exactly one root, and a valid acyclic parent-before-child tree. Each branch must refer to an existing parent trail and an existing assistant source message. Structural validation occurs before writes.

**Success response — `200 OK`:**

```json
{
  "conversationId": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
  "savedAt": "2026-01-15T12:03:20.000Z",
  "savedTrails": 2,
  "savedMessages": 1,
  "syncIds": {
    "trailIds": {
      "root": "d4a0b223-c18c-4c45-9f08-49dc12e25751",
      "branch": "74857c23-19ba-43e4-9d8b-9cf47137690f"
    },
    "messageIds": {
      "answer-1": "1cd44d27-47e0-4b2b-a4ef-820f1abcb00c"
    }
  }
}
```

The success response is emitted only after each upsert returns the expected saved row. A multi-row save is not transactional; if it fails partway, some rows may already exist. Retrying with the same stable sync IDs upserts those rows.

**Errors:**

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `INVALID_JSON` | Body is not valid JSON. |
| `400` | `INVALID_PAYLOAD` | Body shape, field limits, IDs, styles, roles, trail/message mapping, or sync mappings are invalid. |
| `400` | `INVALID_TRAIL_TREE` | Tree has no root, invalid parent/cycle, or missing parent/source-message mapping. |
| `401` | `ANONYMOUS_SESSION_REQUIRED` | Missing, invalid, or non-anonymous session. |
| `413` | `PAYLOAD_TOO_LARGE` | JSON body exceeds 5 MiB. |
| `500` | `SYNC_DATA_INVALID` | Encrypted data validation/decryption failure. |
| `500` | `PERSISTENCE_ERROR` | An upsert failed or did not return its expected confirmation row. Partial writes may remain. |
| `503` | `SUPABASE_NOT_CONFIGURED` | Server-side Supabase URL/key is unavailable. |
| `503` | `SYNC_ENCRYPTION_NOT_CONFIGURED` / `SYNC_ENCRYPTION_KEY_INVALID` | The server-only encryption key is missing or malformed. |

### `DELETE /api/conversations?id=<uuid>`

**Purpose:** Permanently delete a saved root conversation, all its descendants, and their messages after explicit user confirmation.

**Authentication:** Yes. A valid cookie-backed anonymous Supabase session is required.

**Request headers:** `Accept: application/json` optional; same-origin credentials/cookies required. No body.

**Success response — `200 OK`:**

```json
{
  "deleted": true,
  "conversationId": "d4a0b223-c18c-4c45-9f08-49dc12e25751"
}
```

Deletion is sequential and not transactional. A failure during deletion returns an error; some earlier child/message rows may already have been deleted.

**Errors:**

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `INVALID_CONVERSATION_ID` | Missing or malformed UUID. |
| `401` | `ANONYMOUS_SESSION_REQUIRED` | Missing, invalid, or non-anonymous session. |
| `404` | `CONVERSATION_NOT_FOUND` | Root is absent, is a child, or is not owned by this user. |
| `500` | `PERSISTENCE_ERROR` | Supabase deletion failed or no expected row was confirmed; deletion may be partial. |
| `503` | `SUPABASE_NOT_CONFIGURED` | Server-side Supabase URL/key is unavailable. |

## Feature and database coverage

| API resource | PRD feature mapping | Database mapping in `DATABASE.md` | Coverage |
| --- | --- | --- | --- |
| Runtime health | Runtime health and deployment-safe behavior | None; no health/runtime table exists | **Flagged exception:** feature mapped; no table mapping is appropriate because health is live runtime state. |
| Chat | Anonymous chat workspace and conversation styles | None; chat remains stateless and only writes on an explicit Save via the separate conversations resource | **Flagged exception:** feature mapped; no table mapping by design. |
| Saved conversations | Explicit opt-in save/load/delete of conversation trees and Thought Trails | `public.conversations`, `public.messages` (see active schema contract in `DATABASE.md`) | Mapped to the active external schema; RLS isolation testing remains unverified. |

Thought Trail branching/renaming/switching, reset, browser storage preference, retry, and cancellation remain client-side behavior. Explicit save/load/delete of conversation trees use `public.conversations` and `public.messages`.

**Database mapping flags:** `GET /api/health` intentionally has no table because it reports live runtime health. `POST /api/chat` intentionally has no table because inference is stateless and only a separate explicit Save writes transcript data. Those are documented exceptions to a literal "every endpoint must use a table" requirement; adding a runtime table or implicit transcript writes would be a product/architecture change.
