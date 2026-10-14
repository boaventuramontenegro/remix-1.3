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
- Reminder callbacks use the generated managed cron authenticator and structured HTTP schedule tools — credentials never enter application code.
- Push service worker only registers on the published site (src/lib/pwa.ts guard) — the Lovable preview cannot receive push.

- Daily averages use the shared calendar-date utility; all period filters compare inclusive ISO dates to avoid elapsed-time rounding errors.
- Reports own the export sheet and one shared calendar-year state for the annual table and chart; profile screens do not export.
- The existing managed 15-minute reminder callback evaluates each user's local enabled windows and atomically claims each daily window before delivery — no browser timers or overlapping duplicate sends.
- Device unlock timestamps are per-user and bound to the current protection record; only successful PIN/WebAuthn assertions renew them — remounts, focus and reload never authenticate.
- Push status requires both an active same-scope browser subscription and an authenticated owner read-back; updates persist atomically without delete-before-insert — preferences alone never prove registration.
