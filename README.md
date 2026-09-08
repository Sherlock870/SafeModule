# IIC 3.0

A Next.js (App Router) + Tailwind CSS scaffold with Prisma/SQLite and a
NextAuth email/password auth flow.

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

Open [http://localhost:3000](http://localhost:3000). Use `/signup` to create an
account and `/login` to sign in; `/guardian` is a protected page that
redirects to `/login` when there's no session.

## Database

The Prisma schema (`prisma/schema.prisma`) defines:

- `User` — `id`, `email`, `password` (bcrypt hash), `createdAt`
- `Item` — a placeholder model with `id`, `name`, `createdAt`

Run `npx prisma studio` to browse the database, or `npx prisma migrate dev`
after changing the schema.
