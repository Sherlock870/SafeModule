# SafeModule

SafeModule is a real-time personal-safety alert demo. A public device
simulator raises deliberate SOS or voice-distress alerts, while an
authenticated guardian console receives, assesses, and resolves them.

The device is simulated in software for this build. Alert creation does not
depend on AI: every alert is stored immediately, then enriched asynchronously
with either Gemini or a deterministic local risk assessment.

## Stack

- **Next.js** (App Router, TypeScript, Turbopack)
- **Tailwind CSS**
- **Prisma ORM** with a **SQLite** database (`prisma/dev.db`)
- **NextAuth (Auth.js) v5** with the Credentials provider for email/password login

## Getting started

```bash
npm install        # also runs `prisma generate` via postinstall
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the demo:

1. Open `/simulator` and choose Bag / Clip or Necklace mode.
2. In Necklace mode, optionally start the heart-rate stream and spike it.
3. Trigger an SOS or voice-distress alert and let the short cancellation
	window expire.
4. Create an account at `/signup`, sign in, and open `/guardian`.
5. Review the incident, its location and telemetry, then resolve or cancel it.

The simulator is public and does not require an account. The Guardian Console
is protected by NextAuth credentials authentication.

`GEMINI_API_KEY` is optional. When it is absent, unavailable, times out, or
returns invalid data, the local fallback still produces a risk assessment.

## Database

The Prisma schema (`prisma/schema.prisma`) defines:

- `User` — `id`, `email`, `password` (bcrypt hash), `createdAt`
- `Device` — simulated wearable identity and type
- `Telemetry` — heart-rate readings associated with a device
- `Alert` — trigger, location, status, risk assessment, and response data

Run `npx prisma studio` to browse the database, or `npx prisma migrate dev`
after changing the schema.

## API flow

- `POST /api/alerts` creates an active alert immediately.
- `POST /api/telemetry` stores an independent heart-rate reading.
- `GET /api/alerts?status=ACTIVE` returns alerts for the guardian console.
- `GET /api/alerts/:id` lets the simulator track its alert status.
- `PATCH /api/alerts/:id` resolves or cancels an alert.

The guardian console and simulator poll for changes every three seconds in this
demo. Real emergency-service dispatch, SMS, WhatsApp, physical Bluetooth
hardware, and map SDK integration are intentionally out of scope.
