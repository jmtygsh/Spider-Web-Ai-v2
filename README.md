# Spider Web AI

**Built by Yogesh JMT** — an AI-native workspace command center for email and calendar.

> Not another chatbot. Spider Web is a **proactive agent platform** that reads your inbox, prepares you for meetings, and executes multi-step commands — with human approval gates and safety policies built in.

## Demo Highlights (Hackathon Pitch)

### 1. Meeting Preparation Agent
Before every meeting (24h / 2h / 30m windows), background agents:
- Pull related threads, commitments, and relationship context
- Generate a prep brief with risks and next actions
- Surface one-click templates on the dashboard

### 2. Natural Language Command Center (`Ctrl+K`)
Type what you mean — no rigid syntax:
- **Two-stage intent pipeline**: zero-cost regex fast path → `gpt-4o-mini` when ambiguous
- **AI planner** (`gpt-4o`) generates multi-step execution plans
- Supports: create invites, find email threads, draft/send replies, meeting prep
- **Preview before execute** with safety checks and human approval for risky writes

### 3. AI Inbox Prioritization
Hourly Inngest cron scans unread threads and triages into buckets:
`action_required` · `schedule` · `fyi` · `later`

Uses structured reasoning model output — not just keyword rules.

### 4. Fan-Out Event Architecture
Webhook → Inngest orchestrator → isolated child jobs:
thread projection · meeting projection · embeddings · relationship profiles · timeline · suggestions

Each user/workspace gets staggered execution — no thundering herd at cron time.

---

## What Competitors Usually Don't Have

| Spider Web | Typical AI Email Assistants |
|------------|----------------------------|
| **Command center + chat** (Ctrl+K deterministic + MCP agent fallback) | Chat-only UI |
| **Human-in-the-loop tool approval** for writes | Auto-execute without gates |
| **Fan-out Inngest workflows** with retries | Single cron or inline processing |
| **Safety policy layer** (injection detection, tool risk scoring) | Prompt-only guardrails |
| **Relationship intelligence** (latency, open requests, linking) | Flat thread list |
| **Grounded RAG** over your workspace embeddings | Generic LLM answers |
| **Dual execution modes** (deterministic plan vs MCP agent) | One-size-fits-all agent |

---

## Architecture

```
User → Dashboard / Ctrl+K / Chat
         ↓
    API Routes (rate-limited via Upstash Redis)
         ↓
    Feature modules (23 slices under src/features/)
         ↓
    PostgreSQL (Drizzle) + entity store + embeddings (JSONB)
         ↓
    Inngest (background jobs, cron, fan-out)
         ↓
    Corsair MCP (Gmail, Google Calendar, Tavily)
```

### Stack
- **Next.js 15** (App Router) + React 19
- **Better Auth** + Google OAuth
- **Drizzle ORM** + PostgreSQL
- **Inngest** — durable workflows, cron, fan-out
- **Upstash Redis** — distributed rate limits + hot-path cache
- **Corsair** — integration layer + MCP tools
- **OpenAI** — embeddings (`text-embedding-3-small`), chat (`gpt-4.1`), intent (`gpt-4o-mini`), reasoning (`gpt-4o`)

---

## Feature Checklist (Honest Audit)

| Capability | Status |
|------------|--------|
| Multi-model intent (regex + gpt-4o-mini) | ✅ Wired |
| Multi-model planning (gpt-4o planner) | ✅ Wired |
| Rate limiting (Upstash Redis, per-tenant) | ✅ Wired on chat/command/events |
| Redis cache (events poll, RAG retrieval) | ✅ Wired |
| Background jobs / queue (Inngest) | ✅ 10 registered functions |
| RAG + embeddings | ✅ OpenAI embeddings, cosine search |
| Vector DB (pgvector / Pinecone) | ⚠️ JSONB + in-memory cosine (hackathon scope) |
| Structured JSON logging | ✅ `src/server/observability/logger.ts` |
| Sentry | ⚠️ Scaffold ready — install manually (see below) |
| Human approval for tool writes | ✅ |
| Prompt injection detection | ✅ |
| MCP agent fallback | ✅ |

---

## Quick Start

```bash
pnpm install
cp .env.example .env   # fill in keys
pnpm db:push
pnpm dev               # Next.js on :3000
pnpm inngest           # Inngest dev server (separate terminal)
```

### Required env vars
See `.env.example`. Minimum: `DATABASE_URL`, `OPENAI_API_KEY`, `CORSAIR_KEK`, auth keys, `RESEND_API_KEY`.

### Optional but recommended for demo
```env
UPSTASH_REDIS_REST_URL=...   # distributed rate limits + cache
UPSTASH_REDIS_REST_TOKEN=...
INNGEST_EVENT_KEY=...        # production Inngest
INNGEST_SIGNING_KEY=...
```

---

## Sentry

Manual setup is complete. Add your DSN from [Sentry dashboard](https://ygjm.sentry.io) to `.env`:

```env
SENTRY_DSN="https://...@o....ingest.de.sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@o....ingest.de.sentry.io/..."
```

Both vars use the same DSN value. Restart `pnpm dev` after saving.

Errors are captured from:
- Server/API routes (`/api/chat`, `/api/command/*`, etc.)
- React render errors (`src/app/global-error.tsx`)
- Client-side via `src/instrumentation-client.ts`

To verify: trigger any error in the app and check **Issues** in Sentry.

---

## Ctrl+K Command Flow

```
User types command
    → resolveCommandIntent (regex fast path OR gpt-4o-mini)
    → resolveCommandEntities (DB projections)
    → planCommandWithAi (gpt-4o steps)
    → safety check (injection + tool risk)
    → preview → user confirms
    → deterministic execute OR MCP agent fallback
```

---

## Background Jobs (Inngest)

| Function | Trigger |
|----------|---------|
| `fanOutProjectionRefresh` | Webhook events |
| `refreshThreadProjection` | Fan-out child |
| `refreshMeetingProjection` | Fan-out child |
| `refreshMeetingPrep` | Fan-out child |
| `refreshRelationshipProfiles` | Fan-out child |
| `refreshTimeline` | Fan-out child |
| `runScheduledMeetingPrep` | Cron `*/15 * * * *` |
| `runScheduledBatchTriage` | Cron `0 * * * *` |

---

## License

MIT
