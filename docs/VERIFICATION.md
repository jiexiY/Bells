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

The September 6 video refresh localizes both recorded native upload labels to English, enlarges the top-left icon and wordmark, and adds a 2.8-second yellow-bell animation over a fixed rounded white tile. The bell reaches +35° and −35° at 3.75 cycles per second. Frame checks confirm that it continues moving through the ending and does not overlap the wordmark or CTA. The original captures remain unchanged; the upload labels are editorial video overlays.

The revised export decoded all 1,800 frames at 1920×1080 and 30 fps without errors. The production build passed. Chrome checks passed locally and on bellsapp.site for playback, seeking, English captions, and 1440, 390, and 320 px layouts. Live playback captured 83 frames of visible bell motion across the ending. All 24 deployed assets matched the tested build, and the versioned v6 MP4 supports HTTP 206 byte-range streaming. The approved music and its AIGC metadata are retained.

The landing-page walkthrough player was checked locally and in production in Chrome for 60-second 1080p playback, seeking to the ending, 25 English caption cues, and layouts at 1440, 390, and 320 px. It starts paused and defers video loading until playback. All 22 deployed assets matched the tested build; the MP4 serves as `video/mp4` with HTTP 206 range responses, and captions serve as `text/vtt`. The README walkthrough links point directly to `https://bellsapp.site/#walkthrough`; the former GitHub file-viewer destination could not preview the 7.13 MB video.

The light-theme and video update was verified separately: the production build passed, all 19 deployed public assets matched that build, and Chrome checks confirmed the light default with a dark system preference, the manual theme toggle, and the guest workspace at desktop and 390 px mobile widths without horizontal overflow. The landing-page and README previews use the actual light guest dashboard.

The revised 60-second, 1080p video decoded all 1,800 frames without errors. Active windows remain centered, a stationary composition check found no movement with the animated cursor disabled, and encoded frames were visually inspected for cursor placement and the rounded icon. These presentation changes did not modify the backend.

The subsequent depth and motion revision enlarges the main showcase from a 640 px to a 780 px maximum height. Role panels interpolate between their normal and emphasized sizes, preserving their order and a 24 px gap. The video ends with “Try Bells now” and the demo destination. All 1,800 exported frames decoded without errors; geometry checks and visual inspection confirmed the centered framing, role transitions, click alignment, and closing call to action.

The public export passed the following checks before publication:

- Clean dependency installation using `npm ci`.
- All 32 existing app tests using `npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=15000`.
- TypeScript using `npx tsc --noEmit -p tsconfig.app.json`.
- Production build using `npm run build`, without production environment files.
- Chrome navigation from the landing page into the guest workspace with no page errors or Supabase requests.
- Local documentation links and a source scan for credential markers. Only the placeholder `.env.example` is included.

The build reports the existing large-bundle warning; tests emit existing React Router and React test warnings. Lint was not part of this export's pass criteria.

The database bootstrap scripts have not been replayed against another empty hosted project as part of this export. SMTP, OAuth, SSO, and external invitation-email delivery are outside the verified feature set.
