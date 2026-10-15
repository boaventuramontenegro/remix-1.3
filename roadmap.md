# Final Android adjustments
- [ ] Increase validated security session to five minutes and test exact expiry/reload/foreground
- [ ] Keep existing startup screen visible for two seconds minimum and until ready; test error recovery
- [ ] Investigate native transparency and use black opaque lock-bar fallback without altering normal screens
- [ ] Generate transparent monochrome notification wallet badge from existing logo; preserve delivery logic
- [ ] Remove proven biometric initialization waits without duplicate requests or PIN regressions
- [ ] Run relevant tests and browser checks; report physical Android limitations

# Android real-test corrections
- [x] Three-minute lifecycle: visible expiry timer plus synchronous foreground privacy gate; actual PIN/reload checked, Android reproduction remains pending
- [x] Published push diagnosis: 64 invalid client/ precache URLs; published worker becomes redundant; fixed URL transform and awaited activation/retry diagnostics
- [x] Lock document canvas extended with original wallpaper/gradient; opaque platform theme colors retained where transparency is unavailable
- [x] Critical green first-paint shell and shared wallet SVG-derived icons; startup error retry retained
- [x] Natural annual-table scrolling verified with real saved rows at 390px and 1280px
- [x] Themed installation confirmation; early captured native event, cancel and accepted/completed distinctions tested
- [x] Automated regressions and authenticated small/large browser checks; no runtime errors observed
- [ ] Physical Android verification — requires user's device and published update

# Previous priority corrections
- [x] Three-minute device unlock session and biometric-to-PIN fallback; exact boundary and real PIN/reload checks
- [x] Lock-only system theme colors and restoration; three styles tested in document, Android rendering not claimed
- [x] Push persistence/read-back, truthful status and safe delivery diagnostics; contract tests passed
- [x] Atomic daily reminder claims; existing managed 15-minute schedule confirmed active
- [x] Settings card order and inline collapse preserving controls; authenticated small/large-screen checks
- [x] 34 automated tests passed and current build OK; limitations reported
- [ ] Publish changes and validate Android biometric, bars and actual push subscription/delivery — blocked on published update and physical device; backend currently has zero subscriptions
- [ ] Observe an authenticated scheduled reminder delivery with app closed — blocked on a real registered device; schedule metadata is active but successful delivery is not yet evidenced

Financial features and unrelated earlier requests were preserved, not expanded in this task.