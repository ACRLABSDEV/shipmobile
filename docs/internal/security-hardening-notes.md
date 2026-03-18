# ShipMobile Security Hardening Notes

## Current Model
ShipMobile stores credentials locally in `.shipmobile/credentials.json` encrypted at rest.

### What is protected
- Credentials are not stored in plaintext on disk.
- Secret prompts are masked during interactive entry.
- Credentials directory/file are written with restrictive permissions:
  - `.shipmobile/` => `700`
  - `.shipmobile/credentials.json` => `600`

### What is NOT fully protected
- Local machine compromise can still extract data.
- Default encryption mode is convenience-grade for local developer UX.

## Optional Stronger Mode
Set `SHIPMOBILE_PASSPHRASE` to derive encryption key from a user-controlled passphrase:

```bash
export SHIPMOBILE_PASSPHRASE='your-strong-passphrase'
```

Notes:
- Must be present for both encryption and decryption on that machine/session.
- Rotating passphrase requires credential re-encryption flow (future improvement).

## Operational Best Practices
- Never paste tokens in public channels.
- Revoke and rotate leaked tokens immediately.
- Keep Apple `.p8` and Google service account files outside repo.
- Ensure `.shipmobile/` remains ignored in git.
- Prefer EAS-managed auth unless org policy requires BYO API keys.
