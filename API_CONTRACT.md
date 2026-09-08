# API Contract

## Overview

All endpoints are Next.js Route Handlers under `/api`, returning JSON.
There is no separate backend service — this is the whole API surface.

## Authentication

- `POST /api/auth/signup` — public. Body: `{ email, password }` (password
  ≥ 8 chars). Hashes with bcrypt, creates a `User`. `201` on success,
  `400` on bad input, `409` if the email already exists.
- `/api/auth/[...nextauth]` — NextAuth's handler (Credentials provider,
  JWT sessions). Sign-in/sign-out go through `next-auth/react`'s
  `signIn`/`signOut` from client components, or `auth()`/`signOut()` from
  `@/auth` on the server.
- `telemetry` and `alerts` endpoints are **unauthenticated by design** —
  the wearable can't require login. Only `/guardian` (and therefore
  reading the console's data through the browser) requires a session.

## Endpoints

### `POST /api/telemetry`
Ingest a heart-rate reading. Independent of alerts — never touches the
`Alert` table.

Request: `{ deviceId: string, deviceType: "BAG_CLIP" | "NECKLACE", heartRate: number }`
`heartRate` must be an integer between 30 and 220.

Response `201`: `{ telemetry: { id, deviceId, heartRate, recordedAt } }`
`400` on missing/invalid `deviceId`/`deviceType`, or a non-integer or
out-of-range `heartRate`.

### `POST /api/alerts`
Create an alert. Synchronous, and never waits on AI. Lazily creates the
`Device` row if it doesn't exist yet.

Request: `{ deviceId, deviceType, triggerType: "MANUAL_SOS" | "VOICE_DISTRESS", latitude?, longitude?, locationLabel? }`

Response `201`: the created `Alert` row, with `status: "ACTIVE"` and
`aiStatus: "PENDING"` (enrichment hasn't run yet — poll `GET
/api/alerts/[id]` to see it land). `400` on invalid `deviceType`/`triggerType`.

### `GET /api/alerts`
List alerts for the Guardian Console. Query: `?status=ACTIVE|RESOLVED|CANCELLED`
(omit for all). Each alert includes its `device` and up to 10 most-recent
`recentTelemetry` readings for that device.

Response `200`: `{ alerts: Alert[] }`

### `GET /api/alerts/[id]`
Single alert detail, same shape as one element of the list above.
`404` if not found.

### `PATCH /api/alerts/[id]`
Resolve or cancel an alert. One-directional — no un-resolving.

Request: `{ status: "RESOLVED" | "CANCELLED" }`
Response `200`: the updated `Alert`. `400` on an invalid status value,
`404` if not found.

## Request/Response Formats

All bodies are JSON (`Content-Type: application/json`). The `Alert` shape
returned by list/detail/create includes the enrichment fields, populated
after `runRiskAssessment` completes:

```json
{
  "id": "...",
  "deviceId": "...",
  "device": { "id": "...", "type": "NECKLACE", "label": "..." },
  "triggerType": "VOICE_DISTRESS",
  "status": "ACTIVE",
  "latitude": 12.97, "longitude": 77.59, "locationLabel": null,
  "createdAt": "...", "updatedAt": "...", "resolvedAt": null,
  "aiStatus": "DONE_FALLBACK",
  "riskLevel": "CRITICAL",
  "riskConfidence": 0.85,
  "triggeringSignals": ["voice_distress", "critically_elevated_heart_rate"],
  "rationale": "Voice distress phrase detected; recent heart rate averaging 143bpm (peak 169bpm).",
  "recommendedAction": "Immediate dispatch — treat as active life-threatening emergency.",
  "aiSource": "fallback",
  "sourceLabel": "SafeModule's rule-based triage engine",
  "recentTelemetry": [{ "id": "...", "heartRate": 169, "recordedAt": "..." }]
}
```

`aiStatus` progresses `PENDING` → `ANALYZING` → `DONE_LLM` or
`DONE_FALLBACK` (or `FAILED`, a defensive state that should be
unreachable since the fallback always succeeds). `aiSource`/`sourceLabel`
tell the caller whether the result came from a real LLM call or the
rule-based fallback — currently always `"fallback"`, since the LLM seam is
stubbed.

## Error Handling

Errors are `{ error: string }` with a matching HTTP status: `400` for
invalid/missing input, `404` for a missing alert, `409` for a duplicate
signup email. There is no global error middleware — each route validates
its own input defensively (`request.json().catch(() => null)` plus manual
field checks) before touching the database.

## Versioning

Unversioned — this is a single hackathon build with one consumer (the
bundled frontend). No `/v1` prefix or deprecation policy exists.
