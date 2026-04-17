# Innovaco Command Center

Internal platform for running the agency.

## Local dev

```bash
pnpm install
cp .env.example .env.local    # fill values
pnpm hash-password            # generates ADMIN_PASSWORD_HASH
pnpm db:migrate               # applies schema to Turso
pnpm dev                      # http://localhost:3000
```

## Tests

```bash
pnpm test
```

## Deploy

Hosted on Vercel. Env vars required: `AUTH_SECRET`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD_HASH`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
