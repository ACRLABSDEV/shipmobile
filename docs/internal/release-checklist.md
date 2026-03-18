# ShipMobile Release Checklist

Use this before publishing npm releases.

## 1) Code & Quality Gates
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] Manual smoke in sample Expo app:
  - [ ] login
  - [ ] doctor
  - [ ] build
  - [ ] status
  - [ ] preview

## 2) Security Checks
- [ ] No secrets in git diff (`.p8`, tokens, service accounts)
- [ ] Prompt masking still active for token entry
- [ ] `.shipmobile` permissions handling unchanged (`700` dir / `600` creds file)
- [ ] Any new logs/errors reviewed for secret leakage

## 3) Behavioral Contract Checks
- [ ] `build` queues correctly and does not falsely fail on queued builds
- [ ] `status` works with and without local cache
- [ ] `preview` works with and without local cache
- [ ] iOS interactive credential bootstrap fallback prompt works

## 4) Versioning & Publish
- [ ] Update version in `package.json`
- [ ] Update changelog/release notes with user-visible fixes
- [ ] Tag commit
- [ ] Publish to npm
- [ ] Validate with `npx shipmobile --version` and one end-to-end command

## 5) Post-Release
- [ ] Announce release notes with migration notes (if any)
- [ ] Confirm npm users can reproduce fixed behavior
- [ ] Track first 24h regression reports
