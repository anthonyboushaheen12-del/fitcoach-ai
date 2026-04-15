This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Git workflow

- **`npm run verify`** — lint, tests, and production build.
- **`npm run setup:autopush`** (once) — installs a post-commit hook that runs `git push` after every commit.
- **`scripts/commit-and-push.ps1 -Message "…"`** — stage all, commit, and push (PowerShell).

Cursor agents working in this repo are configured to **commit and push** when implementation tasks finish, unless you ask otherwise.

### Supabase environment variables (production)

Add the same variables you use locally (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

In **Vercel → Project → Settings → Environment Variables**, also set **`SUPABASE_SERVICE_ROLE_KEY`** to the **`service_role`** secret from Supabase (Project Settings → API). Do **not** paste the `anon` key here — if you do, inserts still hit RLS and you will see “row-level security policy” errors. Apply to **Production** and **Preview** if you test deployments there, then redeploy.

See [`.env.example`](.env.example) for a template. For SQL checks on policies and `profiles.user_id`, run [`supabase-verify-progress-photos.sql`](supabase-verify-progress-photos.sql) in the Supabase SQL Editor after applying [`supabase-progress-photos-migration.sql`](supabase-progress-photos-migration.sql).

If the SQL Editor shows **`relation "progress_photos" already exists`**, stop using a handwritten `CREATE TABLE progress_photos` fragment. Run [`supabase-progress-photos-safe-rerun.sql`](supabase-progress-photos-safe-rerun.sql) instead (it skips recreating the table, repairs missing columns, and applies storage + split RLS policies), then run [`supabase-progress-photo-rpc.sql`](supabase-progress-photo-rpc.sql).

**Sharing the app:** See [docs/SHARING_AND_AUTH.md](docs/SHARING_AND_AUTH.md) for Supabase redirect URLs, public `/join` link, and `?signout=1`.

If saving progress photos still returns a row-level security error: (1) run [`supabase-progress-photos-rls-insert-fix.sql`](supabase-progress-photos-rls-insert-fix.sql) or the safe-rerun script above; (2) run the **full** [`supabase-progress-photo-rpc.sql`](supabase-progress-photo-rpc.sql) (including `ALTER FUNCTION … OWNER TO postgres` and `set_config('row_security', 'off', true)` inside the function). The API tries **user JWT insert first**, then **RPC**, then (when configured) **service_role insert**.
