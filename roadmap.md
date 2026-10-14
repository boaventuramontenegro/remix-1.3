# Android real-test corrections
- [ ] Diagnose and fix three-minute session lifecycle and privacy on foreground/reload
- [ ] Diagnose published push worker registration; repair real registration and actionable safe errors
- [ ] Best supported lock system-bar appearance without fake bars
- [ ] Green first-paint loading and consistent loading-wallet icons
- [ ] Natural annual-table horizontal scrolling
- [ ] Themed installation confirmation with captured native install event
- [ ] Automated regressions and small/large browser checks
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