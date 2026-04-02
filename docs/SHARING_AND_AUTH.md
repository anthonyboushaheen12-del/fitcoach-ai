# Sharing your Vercel link and sign-in

Sessions are stored **per browser** (Supabase client default: `localStorage` on your app’s origin). Sending someone your production URL does **not** log them in as you—they get their own empty session on their device.

## 1. Supabase Auth URL configuration (required for production)

In **Supabase Dashboard → Authentication → URL configuration**:

1. **Site URL**  
   Set to your canonical app URL, e.g. `https://your-project.vercel.app` or your custom domain (no trailing path required).

2. **Redirect URLs**  
   Add every origin where auth can complete, for example:
   - `https://your-project.vercel.app/**`
   - `http://localhost:3000/**` (local dev)
   - Any custom domain you use  
   Preview deployments: add each `https://*.vercel.app` pattern if your Supabase project allows wildcards, or list specific preview URLs.

3. After changing URLs, **redeploy** or test immediately so email confirmation and OAuth redirects match.

## 2. What to share

- Prefer **`/`** (home) or **`/join`** (public entry with sign-in / sign-up links that do not auto-redirect guests).
- Optional **forced sign-out** for demos or shared devices: append **`?signout=1`** to any URL (e.g. `https://your-app.vercel.app/?signout=1`). The app signs out once and removes the query from the address bar.

## 3. How to verify (incognito / second device)

1. Open your production URL in a **private/incognito** window or on another phone.
2. Confirm you see **Sign in** / **Create account** (after any short loading screen), not someone else’s dashboard.
3. On your own phone, the same link may open **straight to the app** if you are already signed in—that is expected for **your** browser only.

## 4. Vercel

- If **Deployment Protection** (password) is on previews, visitors hit Vercel’s gate first—use an unprotected production URL for real sharing.
- Set the same `NEXT_PUBLIC_SUPABASE_*` (and server secrets) on Vercel as documented in the root [README.md](../README.md).
