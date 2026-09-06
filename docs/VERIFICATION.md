# Verification scope

The existing Bells release was exercised with one project manager, two team leads, and five contributors. That workflow covered invitations, assignments, contributor submissions, lead and manager revision cycles, saved feedback, and completion metrics.

## Prior release checks

- 32 existing app regression tests passed.
- 28 backend workflow checks passed against isolated test accounts.
- TypeScript and the production frontend build passed.
- Desktop and 390 px mobile role layouts were checked in Chrome.
- The complete workflow was exercised in the actual app while recording the 60-second walkthrough.
- Temporary test accounts, workspaces, and uploads were removed after verification.

The backend checks used a separate local test harness and are not included as runnable tests in this repository. These results describe that release verification; they are not a security certification or a substitute for testing a new deployment.

## Public repository checks

The public export passed the following checks before publication:

- Clean dependency installation using `npm ci`.
- All 32 existing app tests using `npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=15000`.
- TypeScript using `npx tsc --noEmit -p tsconfig.app.json`.
- Production build using `npm run build`, without production environment files.
- Chrome navigation from the landing page into the guest workspace with no page errors or Supabase requests.
- Local documentation links and a source scan for credential markers. Only the placeholder `.env.example` is included.

The build reports the existing large-bundle warning; tests emit existing React Router and React test warnings. Lint was not part of this export's pass criteria.

The database bootstrap scripts have not been replayed against another empty hosted project as part of this export. SMTP, OAuth, SSO, and external invitation-email delivery are outside the verified feature set.
