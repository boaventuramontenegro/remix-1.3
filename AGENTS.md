<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- VAPID keys are derived at runtime from the `VAPID_SEED` backend secret (src/lib/vapid.server.ts); never store VAPID keys in code — keeps the private key out of every file and log.
- The reminder cron authenticates with a random secret stored in `public.app_internal` (service-role only), read by pg_cron and the route — no shared secret ever leaves the backend.
- Push service worker only registers on the published site (src/lib/pwa.ts guard) — the Lovable preview cannot receive push.

- Daily averages use the shared calendar-date utility; all period filters compare inclusive ISO dates to avoid elapsed-time rounding errors.
- Reports own the export sheet and one shared calendar-year state for the annual table and chart; profile screens do not export.
- Reminder schedules are per-user, per-time-window database jobs, recalculated from local times; never use permanent polling for notifications.
