# Architecture

## Overview

A single Next.js 16 (App Router) application serves as both frontend and
backend — no separate service. SQLite (via Prisma) is the only datastore.
There is one "backend" by design: Next.js Route Handlers under `src/app/api/`.

## System Diagram

```
Device Simulator (public, /simulator)
        │  POST /api/telemetry (heart rate)
        │  POST /api/alerts    (SOS / voice distress)
        ▼
Next.js Route Handlers ──► Prisma ──► SQLite (dev.db)
        │
        │  after() schedules, non-blocking
        ▼
Risk Assessment (src/lib/risk-assessment.ts)
        │  tries Gemini API (gemini-3.5-flash-lite, 3s timeout)
        │  → falls back to deterministic heuristic on any
        │    missing key / failure / timeout / bad output
        ▼
Alert row updated with riskLevel/rationale/etc.
        ▲
        │  GET /api/alerts?status=ACTIVE (polled every 3s)
Guardian Console (protected, /guardian)
```

## Components

- **Pages** (`src/app/*`): `/` (home, guides a judge through the two-step
  demo), `/login`, `/signup` (NextAuth Credentials, redirect to
  `/guardian`), `/simulator` (public wearable stand-in), `/guardian`
  (server component that gates on session, renders the client console).
- **`GuardianConsole`** (`src/components/guardian-console.tsx`): client
  component owning polling, filtering (Active/All), and resolve/cancel/
  log-out actions.
- **API routes** (`src/app/api/`): `telemetry`, `alerts`, `alerts/[id]`,
  `auth/[...nextauth]`, `auth/signup`.
- **`src/lib/`**: `prisma.ts` (singleton client), `risk-assessment.ts`
  (orchestrator), `llm-seam.ts` (real Gemini API call, server-only —
  guarded with the `server-only` package so the key can never reach a
  client bundle), `risk-fallback.ts` (deterministic heuristic),
  `alert-telemetry.ts` (attaches recent telemetry + a human-readable
  `sourceLabel` to alerts for API responses), `ai-source-label.ts`.
- **`src/auth.ts`**: NextAuth v5 config — Credentials provider, JWT
  session, `signIn`/`signOut`/`auth` exported for use across server and
  client components.

## Data Flow

1. Simulator posts telemetry independently (no alert side effect) or posts
   an alert (SOS / voice distress) — the alert is created synchronously and
   returned immediately, before any AI work runs.
2. The route handler schedules `runRiskAssessment` via Next.js's `after()`,
   which runs *after* the HTTP response has already been sent.
3. `runRiskAssessment` loads the alert's last 20 telemetry readings, tries
   `tryLlmAssessment` (`src/lib/llm-seam.ts`), which — if `GEMINI_API_KEY`
   is set — sends the trigger type and recent heart rate to Gemini
   (`gemini-3.5-flash-lite`, requesting strict JSON, 3s timeout) and
   validates the shape of whatever comes back. Any missing key, HTTP
   failure, timeout, or malformed/invalid response returns `null`, at
   which point the orchestrator falls back to `computeFallbackAssessment`,
   a pure function of trigger type + recent heart rate that always
   produces a result. The fallback path is never skipped due to error —
   it's the guaranteed floor.
4. The alert row is updated with `riskLevel`, `riskConfidence`,
   `triggeringSignals`, `rationale`, `recommendedAction`, and `aiSource`
   (`"llm"` or `"fallback"`, surfaced to the Guardian Console as
   `sourceLabel` so a viewer can see which path actually ran).
5. The Guardian Console and the simulator's own status tracker each poll
   independently (`GET /api/alerts?status=ACTIVE` and
   `GET /api/alerts/[id]`) to reflect state changes within one interval.

## Tech Stack

- Next.js 16 (App Router, Turbopack, TypeScript)
- Tailwind CSS 4
- Prisma 6 ORM on SQLite
- NextAuth v5 (beta), Credentials provider, bcryptjs for password hashing
- Gemini API (`gemini-3.5-flash-lite`) for risk-assessment enrichment, called
  directly via `fetch` (no SDK dependency), gated behind `GEMINI_API_KEY`

## Infrastructure

Local-only for the hackathon: `npm run dev`, SQLite file on disk
(`prisma/dev.db`, gitignored — migrations are committed). No containers; the
one external dependency is the Gemini API call from `llm-seam.ts`, which
degrades to the local deterministic fallback if it's unreachable. Deployment
was explicitly out of scope for this pass.

## Scalability Considerations

Not a design goal for the hackathon, but notable: SQLite and polling both
cap out well before any real load; `attachRecentTelemetry` fetches all
telemetry for the alerts being displayed and trims to 10 per device in
memory rather than at the query level, which is fine at demo scale only.
