# Google sign-in, profile and account logout

## Purpose

Replace Cloudflare Access as the **application authentication provider** with
direct Google OpenID Connect (OAuth 2.0 authorization-code flow + PKCE).
Cloudflare Workers, D1 and R2 continue to host the application and its data.
Google supplies the verified stable account subject (`sub`), email, given name
and optional profile image. Google mail, contacts, calendar, Drive and refresh
tokens are never requested.

The new sign-in screen appears for unauthenticated visitors at `/` and
`/login` only when `AUTH_PROVIDER=google`. Sign-in begins at
`/auth/google/start` and completes at `/auth/google/callback`. The POST
`/auth/logout` invalidates the current session server-side and redirects to
`/login`. The Google photo replaces the avatar's letter when available and
the typewriter uses `given_name`, with the previous name fallback. Default
language and mobile/desktop layouts are preserved.

## Security model

- Google OAuth scopes: **`openid profile email`** only.
- `state` + `nonce` + S256 PKCE with random cryptographic tokens.
- The returned Google ID token's **RS256 signature** is checked against
  Google's public keys, and issuer, audience, nonce, expiry, issuance and
  verified email are all validated.
- Google's userinfo `sub` and email must match the verified ID token.
- The access token is used once to fetch the user profile, then discarded.
  Google refresh tokens and Google access tokens are **not stored**.
- App sessions use an opaque, random browser cookie with `HttpOnly`,
  `Secure` on HTTPS, `SameSite=Lax`, and 14-day expiration. Only a SHA-256
  hash of the session token is saved in D1.
- Logout deletes the D1 session row and expires the browser cookie. A copied
  expired/revoked session token cannot authorize an API call.
- Deleting the entire app account also removes its Google identity mapping
  and all active Google sessions, returning the browser to the login screen.
- When `AUTH_PROVIDER=google`, Cloudflare/legacy identity headers are
  **not** accepted by the application; this is essential for a real logout.
- `APP_PUBLIC_ORIGIN` pins the canonical OAuth callback host, instead of
  trusting a user-controlled Host header. Google photo URLs are restricted
  to HTTPS on `googleusercontent.com` hostnames.
- OAuth/session responses use `Cache-Control: no-store`. The profile photo
  is fetched with `referrerPolicy=no-referrer`.
- Cloudflare Access must be removed **only after** Google OAuth, D1 migration
  and the real login/logout flow have been tested against production.
- Do not put client secrets or OAuth access tokens in Git, chat, build logs
  or public client-side environment variables.

## Preserve existing memories

Application memory ownership uses `user_id` in the existing D1 tables.
The previous Cloudflare mode generated a key of the form
`cloudflare:<verified-email>`. The new `google_identities` table maps the
verified Google `sub` to the **same original app user ID** if the Google
email matches an existing Cloudflare or single unambiguous legacy account.
Otherwise it creates a new isolated app identity `google:<sub>`.

Once linked, the Google `sub` remains the durable identity even if a Google
account changes its email address. For the initial handover, **use the Google
account with the same verified email address as the old Cloudflare Access
login**. A different account will intentionally receive its own separate,
empty memory bank rather than taking ownership of someone else's memories. Neither existing `items`, `locations`
nor historical user IDs are rewritten during the migration.

The new migration `drizzle/0005_google_identity_and_sessions.sql` creates
`google_identities` and `auth_sessions` only. It does not alter or remove
the existing memories and must run **before** switching to Google auth mode.

## Google Cloud setup (owner/admin action)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Choose a Google Cloud project; under **Google Auth Platform**, configure
   Branding and Audience. Add your Google account as a test user if the
   application is in Testing status.
3. Under **Clients**, create an **OAuth client ID**, application type
   **Web application**.
4. Set its **Authorized redirect URI** to exactly:

   `https://where-did-i-put-that.storemyrj.workers.dev/auth/google/callback`

   It must match `APP_PUBLIC_ORIGIN` plus `/auth/google/callback`.
5. The resulting client ID and secret belong on the **Cloudflare Worker
   configuration**, not in the source repository. Use encrypted secrets for
   `GOOGLE_CLIENT_SECRET`.

If Google Cloud disallows this shared `workers.dev` callback hostname,
configure a custom domain owned by the app owner and use its **exact**
origin and callback in both Google Cloud and the Worker.

## Deployment order — keep service running

1. Keep `AUTH_PROVIDER` absent or set to `cloudflare` while publishing
   the code. The existing Cloudflare Access login remains in effect.
2. Confirm the latest code is deployed with a successful health and core
   memory flow check.
3. Create a D1 backup. Apply the non-destructive migration
   `drizzle/0005_google_identity_and_sessions.sql` to production through
   the existing Wrangler D1 migration workflow. Verify both tables exist.
4. Configure these **runtime settings** on the deployed Worker:
   - `GOOGLE_CLIENT_ID` = OAuth web application's client ID
   - `GOOGLE_CLIENT_SECRET` = OAuth web application's secret (encrypted)
   - `APP_PUBLIC_ORIGIN` = `https://where-did-i-put-that.storemyrj.workers.dev`
   - `AUTH_PROVIDER` = `google` **only when ready to cut over**

   **Deployment persistence (verified October 2026):** Store all four as
   Cloudflare **Runtime secrets**, even though the client ID and public
   origin are not sensitive. The GitHub-connected Worker deployment removed
   those two settings when they were stored as ordinary Runtime variables,
   leaving `AUTH_PROVIDER=google` but disabling the login button. Secrets
   survived the same deployments. Do not confuse **Build variables and
   secrets** with **Runtime variables and secrets**, and never commit the
   Google client secret or OAuth tokens. After any deployment, verify the
   active Worker still has all four binding names before testing sign-in.
5. While Cloudflare Access still protects the hostname, sign in to Google
   and test account linking, original saved memories, name, photo, search,
   add/edit, and `POST /auth/logout`. Logging out should now show the
   **app login page** even if Access's own session is still active.
6. Once verified, disable the obsolete Cloudflare Access policy for this
   hostname. Test the public login screen in a private browser session;
   verify unauthenticated API requests return 401, OAuth succeeds, profile
   shows the expected Google information, and logout revokes session access.
7. Confirm both desktop and physical iPhone; the iPhone may have to refresh
   its home-screen app to pick up the updated login flow.

## Rollback

If new Google sign-in has a production problem, restore
`AUTH_PROVIDER=cloudflare` **and re-enable Cloudflare Access** together.
Do not expose production under legacy-header authentication without the
Cloudflare Access protection. The new D1 tables can remain in place.

## Local validation

Unit tests in `tests/google-auth-core.test.mjs` cover OAuth scopes,
redirect safety, URL-safe random tokens, PKCE, cookie attributes,
temporary OAuth state, profile image allowlisting and signed Google
ID token verification (including tampered, expired or wrong-identity
tokens). Run with:

```text
node --experimental-strip-types --test tests/google-auth-core.test.mjs
pnpm exec tsc --noEmit
pnpm run build
```

The real OAuth authorization grant and new Cloudflare Access policy
**cannot be proven** without the owner's actual Google Cloud OAuth
credentials and explicit production configuration. Do not report the
Google sign-in as live until verified end-to-end in production.
