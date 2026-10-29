# Hush AI Database Design

**Status:** Active Supabase sync contract plus a separately labeled future-state design  
**Product source of truth:** `PRD.md`  
**Architecture source of truth:** `ARCHITECTURE.md`

> Hush now has opt-in Supabase persistence for conversations. Browser/session storage remains the default; remote writes happen only after the user selects Save. The active application uses the existing externally provisioned `public.conversations` and `public.messages` tables. This integration does not create, drop, or migrate those tables. The detailed schema proposal later in this document is a separate future-state design and is not the active Supabase schema.

## 0. Active Supabase schema contract

The following columns are the integration contract observed in the application and existing Supabase project. Confirm the live table definitions and policies in Supabase before applying any external schema changes; there is no checked-in migration and these records are not a migration recipe.

### `public.conversations`

| Column | Application use |
| --- | --- |
| `id uuid` | Stable, client-mapped trail UUID; primary key and upsert conflict key. |
| `owner_id uuid` | Must equal the authenticated anonymous user's actual Supabase Auth ID. |
| `title text` | Hush AES-256-GCM encrypted title or Thought Trail name, stored as a `hush:v1:` encoded string. |
| `parent_conversation_id uuid null` | Parent trail/conversation UUID; null for an independent root trail. |
| `source_message_id uuid null` | UUID of the assistant message anchoring a child Thought Trail; null for a root. |
| `style text` | One of `quick-fix`, `explain-it`, `think-with-me`, or `challenge-me`. |
| `created_at timestamptz` | Trail creation time. |

### `public.messages`

| Column | Application use |
| --- | --- |
| `id uuid` | Stable client-mapped message UUID; primary key and upsert conflict key. |
| `owner_id uuid` | Must equal the authenticated anonymous user's actual Supabase Auth ID. |
| `conversation_id uuid` | The trail/conversation UUID to which this message directly belongs. |
| `role text` | `user` or `assistant`. |
| `content text` | Hush AES-256-GCM encrypted message text, stored as a `hush:v1:` encoded string. |
| `created_at timestamptz` | Message creation time. |

**Ownership and access requirements**

- Supabase Anonymous Sign-Ins must be enabled. `owner_id` must be set from `auth.getUser()`'s authenticated anonymous user ID; never accept an owner ID from the request body.
- RLS must be enabled on both tables, with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies that require `owner_id = auth.uid()` in `USING`/`WITH CHECK` as appropriate.
- The application adds explicit owner filters to database reads and deletes, and sets `owner_id` from the authenticated user on writes. These checks complement RLS; they do not replace it.
- The server uses the publishable key and the user's cookie-backed session. A service-role key must never be added to client or server app configuration.
- Do not assume database constraints or policy details beyond this contract. The actual live policies have not been independently reviewed; cross-user isolation remains unverified until tested with two distinct anonymous users.
- `title` and `content` are encrypted before persistence; `owner_id`, UUID relationships, style, role, and timestamps remain queryable metadata. This is server-side encryption, not end-to-end encryption.
- `parent_conversation_id` and `source_message_id` represent Thought Trail relationships across rows in `conversations`; messages map to their direct trail through `conversation_id`.
- A conversation-tree delete removes messages and conversation rows sequentially through the authenticated route. It is not a transaction; failures must be surfaced, not reported as success.

The expected owner-policy shape is:

```sql
-- Documentation example only; do not apply without reviewing the live policies.
create policy conversations_owner_access on public.conversations
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy messages_owner_access on public.messages
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

Confirm RLS is enabled as well as policies being present. Policy existence alone does not establish that the policy is enabled or that all operations are covered.

## 0.1 Future-state schema proposal (not active)

The remainder of this document describes a richer normalized PostgreSQL design using `app_users`, `user_preferences`, `thought_trails`, and encrypted-column fields. Those tables and columns are **not used by the current application** and must not be mistaken for the existing Supabase schema described above. No SQL from the proposal should be applied without an explicitly approved migration plan.

## 1. Scope and design decisions

### Included in this future design

- Optional authenticated identity for users who explicitly enable sync.
- User-owned conversations and independent Thought Trails.
- Encrypted-at-application-layer conversation content.
- Per-user storage preferences.
- Soft deletion for user-generated content and profiles where recovery/audit windows are appropriate.
- PostgreSQL row-level security (RLS) for direct-client capable deployments.

### Excluded

- MVP anonymous sessions and browser persistence.
- Mandatory account creation.
- Sharing, teams, collaborators, public trails, and many-to-many memberships.
- Prompt/response telemetry, raw inference logs, embeddings, vector storage, and model analytics.
- OAuth provider implementation details, billing, subscriptions, and admin analytics.
- Any cloud-model data flow or public Ollama endpoint.

### Recommended future database

**PostgreSQL 16+** — mature, portable, widely documented, supports UUIDs, check constraints, transactional migrations, and row-level security. PostgreSQL can run through a self-hosted managed service selected later; provider choice is deliberately not prescribed here.

## 2. Privacy and persistence model

1. A user remains anonymous in the MVP. Nothing in this schema is activated until the user explicitly enables a future sync/persistence feature.
2. `app_users` maps to an external authenticated identity only after opt-in. Use opaque IDs; do not store name, email, IP, device fingerprint, or behavioral profile in application tables.
3. Conversation title, trail name, draft text, and message content are sensitive user data. Store only application-encrypted ciphertext, nonce, and encryption-version metadata—not plaintext.
4. Encryption keys are managed outside PostgreSQL by an approved server-side key-management approach. Do not store encryption keys in these tables or browser local storage.
5. Soft delete supports an approved recovery window; hard deletion must permanently remove encrypted content and related records according to a documented retention policy.
6. All database access is server-side in the Next.js backend unless RLS-enabled direct access is explicitly approved. Model inference remains separate and Ollama-only.

## 3. Common conventions

| Convention | Rule |
| --- | --- |
| Naming | `snake_case` for tables, columns, constraints, indexes, and SQL functions. |
| Primary keys | `uuid`, generated by `gen_random_uuid()`. |
| Timestamps | `timestamptz`, default `now()`. Every table contains `created_at` and `updated_at`. |
| Deletion | `deleted_at timestamptz NULL` on user-owned records where soft deletion is meaningful. Queries must filter `deleted_at IS NULL` unless viewing trash/recovery flows. |
| Updates | A shared trigger updates `updated_at` on every update. Application code must not manually set it. |
| Ownership | Every user-owned record has `user_id uuid NOT NULL REFERENCES app_users(id)`. |
| Encryption | Sensitive strings use `*_ciphertext text`, `*_nonce bytea`, and `encryption_version smallint`; ciphertext is encoded application-encrypted data. |
| Enums | PostgreSQL `CHECK` constraints rather than database enums, allowing product evolution without enum migrations. |
| Time ordering | Use `created_at`, then `id` as a deterministic cursor tie-breaker. |

### Required extensions and shared trigger

```sql
create extension if not exists pgcrypto;

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Apply `set_updated_at()` as a `before update` trigger to every table below.

## 4. Tables

### 4.1 `app_users`

Purpose: Minimal Hush application profile for a user who **opts in** to future sync. Authentication credentials remain in the selected auth provider’s protected identity store, not in this table.

| Column | Type | Default | Constraints / notes |
| --- | --- | --- | --- |
| `id` | `uuid` | none | **PK**. Must match the authenticated subject UUID. |
| `created_at` | `timestamptz` | `now()` | Not null. |
| `updated_at` | `timestamptz` | `now()` | Not null; update trigger managed. |
| `deleted_at` | `timestamptz` | `null` | Soft deletion timestamp. |
| `sync_enabled_at` | `timestamptz` | `now()` | Not null; records explicit opt-in time. |
| `retention_days` | `integer` | `30` | Not null; `CHECK (retention_days between 1 and 3650)`. Future product policy controls defaults. |

Constraints:

```sql
create table app_users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  sync_enabled_at timestamptz not null default now(),
  retention_days integer not null default 30,
  constraint app_users_retention_days_check check (retention_days between 1 and 3650)
);
```

### 4.2 `user_preferences`

Purpose: One-to-one non-sensitive preference record. It does not contain tokens, model host URLs, private model credentials, or prompts.

| Column | Type | Default | Constraints / notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | none | **PK**, **FK** → `app_users(id)` `ON DELETE CASCADE`. |
| `created_at` | `timestamptz` | `now()` | Not null. |
| `updated_at` | `timestamptz` | `now()` | Not null; update trigger managed. |
| `deleted_at` | `timestamptz` | `null` | Soft delete for account recovery flow. |
| `default_response_style` | `text` | `'quick-fix'` | Not null; one of `quick-fix`, `explain-it`, `think-with-me`, `challenge-me`. |
| `theme_preference` | `text` | `'system'` | Not null; one of `system`, `dark`, `light`. |
| `reduced_motion` | `boolean` | `false` | Not null; user preference complementing browser setting. |

Constraints:

```sql
create table user_preferences (
  user_id uuid primary key references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  default_response_style text not null default 'quick-fix',
  theme_preference text not null default 'system',
  reduced_motion boolean not null default false,
  constraint user_preferences_style_check
    check (default_response_style in ('quick-fix', 'explain-it', 'think-with-me', 'challenge-me')),
  constraint user_preferences_theme_check
    check (theme_preference in ('system', 'dark', 'light'))
);
```

### 4.3 `conversations`

Purpose: User-owned conversation root. A conversation may contain multiple independent Thought Trails. The encrypted title can be absent while a client generates/updates it.

| Column | Type | Default | Constraints / notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | **PK**. |
| `user_id` | `uuid` | none | Not null; **FK** → `app_users(id)` `ON DELETE CASCADE`. |
| `created_at` | `timestamptz` | `now()` | Not null. |
| `updated_at` | `timestamptz` | `now()` | Not null; update trigger managed. |
| `deleted_at` | `timestamptz` | `null` | Soft deletion timestamp. |
| `title_ciphertext` | `text` | `null` | Optional encrypted title. |
| `title_nonce` | `bytea` | `null` | Required when title ciphertext exists. |
| `encryption_version` | `smallint` | `1` | Not null; `CHECK (encryption_version > 0)`. |
| `last_activity_at` | `timestamptz` | `now()` | Not null; used for recency listing. |

Constraints:

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  title_ciphertext text,
  title_nonce bytea,
  encryption_version smallint not null default 1,
  last_activity_at timestamptz not null default now(),
  constraint conversations_encryption_version_check check (encryption_version > 0),
  constraint conversations_title_encryption_check
    check ((title_ciphertext is null and title_nonce is null) or (title_ciphertext is not null and title_nonce is not null))
);
```

### 4.4 `thought_trails`

Purpose: A root or child Thought Trail within a conversation. Parent linkage represents branch lineage. `parent_message_id` anchors a child to a completed assistant message from another trail in the same conversation.

| Column | Type | Default | Constraints / notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | **PK**. |
| `conversation_id` | `uuid` | none | Not null; **FK** → `conversations(id)` `ON DELETE CASCADE`. |
| `user_id` | `uuid` | none | Not null; **FK** → `app_users(id)` `ON DELETE CASCADE`; duplicates owner for RLS and query efficiency. Must match conversation owner, enforced by trigger. |
| `created_at` | `timestamptz` | `now()` | Not null. |
| `updated_at` | `timestamptz` | `now()` | Not null; update trigger managed. |
| `deleted_at` | `timestamptz` | `null` | Soft deletion timestamp. |
| `parent_trail_id` | `uuid` | `null` | Self **FK** → `thought_trails(id)` `ON DELETE RESTRICT`; null only for root trail. |
| `parent_message_id` | `uuid` | `null` | **FK** → `messages(id)` `ON DELETE RESTRICT`; null only for root trail. |
| `name_ciphertext` | `text` | `null` | Optional encrypted trail name. |
| `name_nonce` | `bytea` | `null` | Required when name ciphertext exists. |
| `response_style` | `text` | `'quick-fix'` | Not null; style check. |
| `draft_ciphertext` | `text` | `null` | Optional encrypted client-synced draft. |
| `draft_nonce` | `bytea` | `null` | Required when draft ciphertext exists. |
| `encryption_version` | `smallint` | `1` | Not null; positive. |

Constraints:

```sql
create table thought_trails (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  parent_trail_id uuid references thought_trails(id) on delete restrict,
  parent_message_id uuid,
  name_ciphertext text,
  name_nonce bytea,
  response_style text not null default 'quick-fix',
  draft_ciphertext text,
  draft_nonce bytea,
  encryption_version smallint not null default 1,
  constraint thought_trails_style_check
    check (response_style in ('quick-fix', 'explain-it', 'think-with-me', 'challenge-me')),
  constraint thought_trails_encryption_version_check check (encryption_version > 0),
  constraint thought_trails_name_encryption_check
    check ((name_ciphertext is null and name_nonce is null) or (name_ciphertext is not null and name_nonce is not null)),
  constraint thought_trails_draft_encryption_check
    check ((draft_ciphertext is null and draft_nonce is null) or (draft_ciphertext is not null and draft_nonce is not null)),
  constraint thought_trails_parent_pair_check
    check ((parent_trail_id is null and parent_message_id is null) or (parent_trail_id is not null and parent_message_id is not null))
);

alter table thought_trails
  add constraint thought_trails_parent_message_fk
  foreign key (parent_message_id) references messages(id) on delete restrict;
```

**Integrity trigger required:** Before insert/update, verify that:

- `thought_trails.user_id` equals `conversations.user_id`.
- Parent trail and parent message, where present, belong to the same `conversation_id` and `user_id`.
- `parent_message_id` has `role = 'assistant'`.
- `parent_message_id` belongs to `parent_trail_id` or its allowed lineage according to final branch semantics.
- A trail cannot parent itself or introduce a cycle.

A trigger is required because these constraints span tables and cannot be fully represented with simple foreign keys.

### 4.5 `messages`

Purpose: Immutable ordered turns belonging directly to one trail. Ancestor context is resolved through `thought_trails`, not duplicated into child message records.

| Column | Type | Default | Constraints / notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | **PK**. |
| `conversation_id` | `uuid` | none | Not null; **FK** → `conversations(id)` `ON DELETE CASCADE`. |
| `trail_id` | `uuid` | none | Not null; **FK** → `thought_trails(id)` `ON DELETE CASCADE`. |
| `user_id` | `uuid` | none | Not null; **FK** → `app_users(id)` `ON DELETE CASCADE`; used for RLS. Must match trail/conversation owner. |
| `created_at` | `timestamptz` | `now()` | Not null. Primary transcript ordering field. |
| `updated_at` | `timestamptz` | `now()` | Not null; update trigger managed. |
| `deleted_at` | `timestamptz` | `null` | Soft deletion timestamp. |
| `role` | `text` | none | Not null; `user` or `assistant`. System prompts are never persisted. |
| `content_ciphertext` | `text` | none | Not null; encrypted message body. |
| `content_nonce` | `bytea` | none | Not null; nonce/IV for message ciphertext. |
| `encryption_version` | `smallint` | `1` | Not null; positive. |
| `response_style` | `text` | `null` | Null for user messages; required for assistant messages. |
| `generation_status` | `text` | `'complete'` | Not null; `complete`, `stopped`, or `failed`. |
| `failure_code` | `text` | `null` | Safe application error code only; no raw provider error or secret. |

Constraints:

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  trail_id uuid not null references thought_trails(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  role text not null,
  content_ciphertext text not null,
  content_nonce bytea not null,
  encryption_version smallint not null default 1,
  response_style text,
  generation_status text not null default 'complete',
  failure_code text,
  constraint messages_role_check check (role in ('user', 'assistant')),
  constraint messages_encryption_version_check check (encryption_version > 0),
  constraint messages_generation_status_check check (generation_status in ('complete', 'stopped', 'failed')),
  constraint messages_response_style_check
    check (response_style is null or response_style in ('quick-fix', 'explain-it', 'think-with-me', 'challenge-me')),
  constraint messages_role_style_check
    check ((role = 'user' and response_style is null) or (role = 'assistant' and response_style is not null)),
  constraint messages_failure_code_check
    check ((generation_status = 'failed' and failure_code is not null) or (generation_status <> 'failed' and failure_code is null))
);
```

**Integrity trigger required:** Before insert/update, verify `messages.user_id` and `messages.conversation_id` match the referenced trail ownership. Update `conversations.last_activity_at` whenever a non-deleted message is inserted.

## 5. Relationships

| Relationship | Cardinality | Explanation |
| --- | --- | --- |
| `app_users` → `user_preferences` | One-to-one | Each opted-in user has at most one preference record. |
| `app_users` → `conversations` | One-to-many | A user may own many conversations; each conversation belongs to one user. |
| `conversations` → `thought_trails` | One-to-many | A conversation contains one root trail and zero or more child trails. |
| `thought_trails` → `thought_trails` | One-to-many self-reference | One parent trail may have many child trails; a child has one optional parent. |
| `thought_trails` → `messages` | One-to-many | Each trail owns its direct messages. Ancestor messages remain on their original trail. |
| `messages` → `thought_trails` | Zero-or-one to many branch anchors | A completed assistant message may anchor zero or more child trails. |
| `app_users` → `messages` | One-to-many | Ownership duplicated for RLS and efficient user-scoped access; integrity trigger prevents mismatch. |

There is no many-to-many relationship in the approved scope. Future sharing/collaboration would require a new `conversation_memberships` join table and separate product/privacy approval.

## 6. ER diagram

```mermaid
erDiagram
    APP_USERS ||--|| USER_PREFERENCES : has
    APP_USERS ||--o{ CONVERSATIONS : owns
    APP_USERS ||--o{ THOUGHT_TRAILS : owns
    APP_USERS ||--o{ MESSAGES : owns
    CONVERSATIONS ||--o{ THOUGHT_TRAILS : contains
    CONVERSATIONS ||--o{ MESSAGES : contains
    THOUGHT_TRAILS ||--o{ THOUGHT_TRAILS : parents
    THOUGHT_TRAILS ||--o{ MESSAGES : contains
    MESSAGES o|--o{ THOUGHT_TRAILS : anchors

    APP_USERS {
        uuid id PK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        timestamptz sync_enabled_at
        integer retention_days
    }

    USER_PREFERENCES {
        uuid user_id PK_FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        text default_response_style
        text theme_preference
        boolean reduced_motion
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        text title_ciphertext
        bytea title_nonce
        smallint encryption_version
        timestamptz last_activity_at
    }

    THOUGHT_TRAILS {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        uuid parent_trail_id FK
        uuid parent_message_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        text name_ciphertext
        text response_style
        text draft_ciphertext
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid trail_id FK
        uuid user_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        text role
        text content_ciphertext
        text response_style
        text generation_status
    }
```

## 7. Indexes

Indexes prioritize user-scoped recency lists, trail transcript loading, branch lookup, and soft-delete filtering. Do not index encrypted content; it cannot support meaningful plaintext search and indexing it creates unnecessary leakage/cost.

```sql
-- User's active conversations, newest activity first.
create index conversations_user_active_activity_idx
  on conversations (user_id, last_activity_at desc, id desc)
  where deleted_at is null;

-- Active trails inside a conversation and child trail lookup.
create index thought_trails_conversation_active_created_idx
  on thought_trails (conversation_id, created_at asc, id asc)
  where deleted_at is null;

create index thought_trails_parent_active_idx
  on thought_trails (parent_trail_id, created_at asc, id asc)
  where deleted_at is null and parent_trail_id is not null;

-- Locate child trails anchored to a selected assistant answer.
create index thought_trails_parent_message_active_idx
  on thought_trails (parent_message_id, created_at asc, id asc)
  where deleted_at is null and parent_message_id is not null;

-- Render a trail transcript in chronological order.
create index messages_trail_active_created_idx
  on messages (trail_id, created_at asc, id asc)
  where deleted_at is null;

-- Support owner-scoped deletion/retention jobs without scanning all records.
create index messages_user_deleted_created_idx
  on messages (user_id, deleted_at, created_at asc);

create index conversations_user_deleted_idx
  on conversations (user_id, deleted_at, last_activity_at desc);
```

## 8. Row-level security and access rules

PostgreSQL RLS is required if the database is ever reachable through a user-authenticated API layer. If all data access remains in a trusted server-only service role, retain RLS as defense in depth and never expose service credentials to browsers.

### Identity assumption

The selected auth layer exposes the current authenticated user UUID through `auth.uid()` or an equivalent PostgreSQL session claim. The schema does not prescribe an auth provider; its user identifier must map exactly to `app_users.id`.

### Base RLS policy pattern

```sql
alter table app_users enable row level security;
alter table user_preferences enable row level security;
alter table conversations enable row level security;
alter table thought_trails enable row level security;
alter table messages enable row level security;

create policy app_users_self_access on app_users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy user_preferences_self_access on user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversations_owner_access on conversations
  for all using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());

create policy thought_trails_owner_access on thought_trails
  for all using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());

create policy messages_owner_access on messages
  for all using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());
```

### Access rules

- Users can access only records with their own `user_id`.
- Deleted records are hidden from normal user queries. A separate recovery policy/function must be explicitly approved before exposing trash views.
- Users cannot alter `user_id`, `conversation_id`, `trail_id`, branch parent fields, `created_at`, or encryption version after creation except through vetted server-side procedures.
- Prefer narrow `SECURITY DEFINER` functions for complex branch creation, hard deletion, and retention jobs; revoke direct table update/delete grants from browser-facing roles.
- A server service role may perform retention/hard-delete maintenance, but it must never return cross-user data and must not log decrypted content.

## 9. Soft delete, retention, and hard delete

### Soft delete

- Soft delete `conversations`, `thought_trails`, `messages`, `user_preferences`, and `app_users` with `deleted_at`.
- Soft-deleting a conversation hides all descendants in normal queries. A recursive application/service procedure should set `deleted_at` on active trails and messages in one transaction.
- Soft-deleting a trail hides only its direct descendant branch tree; it must not soft-delete its parent/siblings.
- Soft-deleting a user disables normal access immediately.

### Hard delete

Hard deletion is required for a user-approved permanent deletion or retention expiry. In one transaction/job:

1. Delete messages for affected trail/conversation/user.
2. Delete child trails before parent trails.
3. Delete conversations.
4. Delete preferences and user profile when deleting the account.
5. Remove any external encryption-key material or per-user wrapped keys through the approved key-management process.
6. Record only a non-content operational completion signal if audit requirements are approved; do not retain transcript data as an audit log.

Retention duration, recovery window, legal obligations, and encryption key lifecycle are open product/legal questions and must be decided before enabling this schema.

## 10. Sample seed data

Seed data below is structural only. The `*_ciphertext` values are deliberately fake placeholders and must never resemble production plaintext or encryption output.

```sql
-- Opted-in future sync identity.
insert into app_users (id, sync_enabled_at, retention_days)
values ('11111111-1111-4111-8111-111111111111', now(), 30);

insert into user_preferences (user_id, default_response_style, theme_preference, reduced_motion)
values ('11111111-1111-4111-8111-111111111111', 'think-with-me', 'dark', false);

insert into conversations (
  id, user_id, title_ciphertext, title_nonce, encryption_version, last_activity_at
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'seed_ciphertext_conversation_title',
  decode('000102030405060708090a0b', 'hex'),
  1,
  now()
);

-- Root trail.
insert into thought_trails (
  id, conversation_id, user_id, name_ciphertext, name_nonce, response_style
) values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'seed_ciphertext_root_trail_name',
  decode('0c0d0e0f1011121314151617', 'hex'),
  'think-with-me'
);

insert into messages (
  id, conversation_id, trail_id, user_id, role, content_ciphertext, content_nonce, response_style, generation_status
) values
(
  '44444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'user',
  'seed_ciphertext_user_message',
  decode('18191a1b1c1d1e1f20212223', 'hex'),
  null,
  'complete'
),
(
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'assistant',
  'seed_ciphertext_assistant_message',
  decode('2425262728292a2b2c2d2e2f', 'hex'),
  'think-with-me',
  'complete'
);

-- Child Thought Trail anchored to the completed assistant message.
insert into thought_trails (
  id, conversation_id, user_id, parent_trail_id, parent_message_id,
  name_ciphertext, name_nonce, response_style
) values (
  '66666666-6666-4666-8666-666666666666',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '55555555-5555-4555-8555-555555555555',
  'seed_ciphertext_child_trail_name',
  decode('303132333435363738393a3b', 'hex'),
  'challenge-me'
);
```

In an actual migration, create the `messages` table before adding the deferred `thought_trails.parent_message_id` foreign key, as described below.

## 11. Migration order

This order avoids circular foreign-key creation and keeps each migration reversible where practical.

1. **`001_extensions_and_shared_functions`**
   - Enable `pgcrypto`.
   - Create `set_updated_at()` trigger function.

2. **`002_app_users`**
   - Create `app_users`.
   - Add update timestamp trigger and RLS.

3. **`003_user_preferences`**
   - Create `user_preferences` with one-to-one `user_id` primary key/FK.
   - Add update trigger, checks, and RLS.

4. **`004_conversations`**
   - Create `conversations` with owner FK, encryption constraints, indexes, update trigger, and RLS.

5. **`005_thought_trails_base`**
   - Create `thought_trails` with `parent_trail_id`; omit `parent_message_id` FK until messages exist.
   - Add update trigger, indexes, and RLS.

6. **`006_messages`**
   - Create `messages` with trail/conversation/user FKs, content/encryption/status constraints, indexes, update trigger, and RLS.
   - Create owner-consistency and `last_activity_at` maintenance triggers.

7. **`007_thought_trail_branch_anchor`**
   - Add `thought_trails.parent_message_id` FK to `messages`.
   - Add branch integrity/cycle-prevention trigger.

8. **`008_access_hardening`**
   - Revoke direct browser-role mutation grants where applicable.
   - Add vetted stored procedures for trail creation, recursive soft delete, restoration if approved, and hard-delete/retention operations.
   - Test RLS policies with at least two distinct user identities.

9. **`009_seed_non_production`**
   - Add structural seed data only to development/test environments. Never seed production with user-like plaintext or real encryption material.

## 12. Adoption gate before implementation

Do not start migration `001` until all of the following are approved:

- Explicit opt-in user-sync experience and authentication decision.
- Encryption architecture, key custody, rotation, backup, and recovery policy.
- Data retention, soft-delete duration, hard-delete SLA, and export requirements.
- RLS/auth integration choice and security review.
- Threat model for stored sensitive prompts and answers.
- Privacy-policy and legal review for the selected hosting region/provider.
- Updated PRD that moves database persistence from non-goal to an approved release scope.
