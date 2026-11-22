# Google admin sign-in operations

The Vercel `/api/*` rewrite in `vercel.json` keeps the browser session cookie
first-party. Configure the Google OAuth web client with callback
`https://saturday-smashers.vercel.app/api/auth/google/callback` (the former
Render callback is not appropriate for this proxy). The frontend must use the
same-origin `/api` base; an old `VITE_API_URL` pointing directly to Render
bypasses the proxy. HTTPS is required for the secure cookie.

Backend settings: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI` (the callback above), and `FRONTEND_ORIGIN`
(`https://saturday-smashers.vercel.app`). Store the secret only in the hosting
environment. `AUTH_COOKIE_SECURE=false` is intended solely for local HTTP.
Before cutover, an authorized database operator can run
`backend/migrations/20261122_google_admin_auth.sql` in the target PostgreSQL
SQL editor. It creates the auth tables and indexes, enables RLS, and inserts
the five initial accounts without changing pre-existing records. Verify the
backend database role can access those RLS-enabled tables. The backend also
creates registered tables at startup via SQLAlchemy metadata.

After schema creation, an operator with trusted database access can provision
an email from the backend directory using `python admin_provision.py EMAIL`.
The initial accounts are the five addresses in the migration SQL.
The command does not change existing accounts. Initial sign-in binds the account
to Google's stable subject. Only verified Gmail or Google Workspace identities
are accepted; other addresses require an additional ownership procedure that is
not implemented.

For urgent removal, a trusted database operator can set `active = false` on
an `admin_accounts` row. Requests check that flag on every authenticated
request. To recover access, independently verify an approved administrator's
identity, then provision a new approved address or investigate and restore the
existing row through a trusted database console. Do not reset `google_sub`
without independent verification. Expired rows in `admin_sessions` and
`admin_login_attempts` may be deleted by a trusted scheduled database job.

Before production cutover, verify the migration and hosting settings, test
Google sign-in and logout with an approved account, and test denied, expired,
and revoked sessions in a real browser. The application removes the OAuth
callback query from its own access log; verify that the hosting proxy also
does not retain authorization codes. Rotate the old password and review
previous logs for exposed query credentials.
