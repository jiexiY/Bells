# Backend setup and deployment

Bells has two parts: a React/Vite frontend and a Supabase backend. The public landing page and guest demo use browser-local state; authenticated workspaces require the database, Auth, Storage, and Edge Functions.

## 1. Configure a Supabase project

Create your own Supabase project. Copy `.env.example` to `.env` and replace the placeholders with your project reference, URL, and publishable key. Use public browser credentials only; secret and service-role credentials belong in the backend. See the [Supabase API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

The repository includes no production credentials, user records, or database exports containing user data.

## 2. Initialize an empty database

The migration directory preserves multiple generations of this application's schema. **Do not replay every historical migration with a blanket database push.** One historical migration references superseded helpers, and the restore files already include the earlier schema and production fixes.

For a **new, empty Supabase database**, apply these complete files in order through the SQL editor or your database tooling:

1. [`supabase/restore/enums.sql`](../supabase/restore/enums.sql)
2. [`supabase/restore/schema.sql`](../supabase/restore/schema.sql)
3. [`20260906010008_complete_role_handoff_workflow.sql`](../supabase/migrations/20260906010008_complete_role_handoff_workflow.sql)
4. [`20260906012012_fix_workflow_insert_visibility.sql`](../supabase/migrations/20260906012012_fix_workflow_insert_visibility.sql)
5. [`20260906012804_tighten_team_membership_scope.sql`](../supabase/migrations/20260906012804_tighten_team_membership_scope.sql)

Each file has its own transaction. Execute each file in full. Keep the project closed to users until all five steps are complete. The final updates introduce team relationships, review history, scoped workflow commands, and the current membership rules.

These instructions describe the source's dependency order. The public repository export has not been replayed against a second clean Supabase project. Review the scripts before using them; use a schema comparison and a backup plan for any existing database.

## 3. Deploy the Edge Functions

The source includes four functions:

| Function | Purpose |
| --- | --- |
| `join-project` | Accept a workplace code using the authenticated account and scoped invitation rules. |
| `respond-invitation` | Respond to an invitation through the current workflow. |
| `send-invite-email` | Validate invitation access and report that email delivery is disabled. |
| `delete-workspace` | Delete a workplace only for an authorized owner. |

Use the Supabase CLI or dashboard to deploy each function to your project. Keep JWT verification enabled; each handler also validates the signed-in user. Change the local project identifier in `supabase/config.toml` or explicitly select your own project when using the CLI.

The handlers use the backend variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not copy those backend secrets into the frontend environment or Git.

## 4. Configure authentication

- Set the Auth Site URL to your deployed frontend URL.
- Allow `/auth` and `/reset-password` on your deployed origin, and the corresponding local URLs if you are developing locally.
- Configure custom SMTP before relying on public signup confirmation or password recovery. Supabase's default mail service is restricted and intended for testing; see [custom SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).
- Keep the current email/password flow. Google/Apple OAuth and SSO are not wired as supported sign-in options in this release.
- Share workplace codes directly with the people you invited. The code-join flow requires the matching invitation and preserves the assigned role and team.

## 5. Deploy the frontend to Vercel

Import your repository as a Vite project. Use:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | The three public `VITE_SUPABASE_*` variables in `.env.example` |

`vercel.json` includes the single-page application rewrite required for direct route navigation. Frontend environment variables are included at build time, so redeploy after changing them. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## 6. Verify your deployment

Check `/`, `/demo`, `/auth`, and `/workspace` directly in the browser. Confirm that signed-out private routes lead to authentication. Then use separate test accounts to verify:

- Manager → lead → contributor invitations retain the intended roles and reporting relationships.
- Contributors cannot read or change another person's assigned tasks.
- Leads can assign and review work only within the allowed scope.
- Revision feedback persists through resubmission at both review stages.
- Pending submissions do not count as completed work.
- A project requires final manager approval after the team's tasks are approved.

Use test data in your own project, and remove it after verification.
