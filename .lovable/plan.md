

# AuthentiSeal Security Audit & Hardening Plan
## 2026 Audit Readiness Assessment

This plan addresses each section of the expert-level audit checklist against the current AuthentiSeal codebase, identifying gaps and proposing concrete fixes.

---

## Summary of Findings

| Area | Status | Severity |
|------|--------|----------|
| NFT isMutable left on | Gap | HIGH |
| Mint authority not revoked | Gap | HIGH |
| No ImmutableOwner on token accounts | Gap | MEDIUM |
| Metadata URI points to mutable edge function | By Design (documented) | INFO |
| No Token-2022 / Transfer Hooks used | N/A | -- |
| NFC replay attack protection missing | Gap | HIGH |
| Auth inconsistency (getUser vs getClaims) | Gap | MEDIUM |
| verify-public exposes issuer_id in URL | Gap | LOW |
| nft-metadata brute-force hash lookup | Gap | MEDIUM |
| LP deposit SPL verification skipped on devnet | Gap | MEDIUM |
| Treasury wallet hardcoded to devnet | Gap | MEDIUM |

---

## Phase 1: NFT Integrity Hardening

### 1.1 Post-Mint Authority Revocation Option

**File:** `src/lib/metaplex.ts`

Currently `isMutable: true` is set with a comment that it supports transfers and metadata updates. After the final metadata update (e.g., transfer complete, certificate finalized), the issuer should have an option to "lock" the NFT by:

- Setting `isMutable` to `false` via a Metaplex `updateV1` call
- This prevents any future metadata URI changes (The Plastic Swap defense)

**Changes:**
- Add a new `lockCertificateNFT(wallet, mintAddress)` function in `src/lib/metaplex.ts` that calls `updateV1` with `isMutable: false`
- Add a "Lock NFT (Permanent)" button in the certificate management UI that calls this function
- Show a clear warning that this action is irreversible

### 1.2 Metadata URI Signing Acknowledgment

The current architecture intentionally uses a mutable edge function URI (not IPFS) to support status updates and ownership transfers. This is documented and acceptable for COA use cases, but the plan should add:

- A visible "Metadata Source: AuthentiSeal API (Mutable)" indicator on the certificate detail page
- Documentation in the developer portal explaining why mutable metadata is used and the trust model

---

## Phase 2: NFC Replay Attack Protection

**File:** `src/hooks/useNFCScanner.ts`, `src/lib/solana.ts`

### Problem
The NFC Tag ID is read and hashed, but there is no freshness check. An attacker can record a valid NFC scan result and replay it later to authorize a fraudulent verification or transfer.

### Fix
- Add a **timestamp + nonce** to NFC verification payloads
- When an NFC tag is scanned for verification, the system should:
  1. Record the scan timestamp
  2. Generate a random nonce
  3. Include both in the verification request
  4. The backend should reject scans older than 5 minutes
- Store the nonce in a `used_nfc_nonces` table to prevent reuse

**Changes:**
- Create a new database table `nfc_verification_nonces` with columns: `id`, `nonce`, `scanned_at`, `used_at`, `certificate_id`
- Modify `useNFCScanner.ts` to generate a cryptographic nonce on each scan
- Modify the verification flow to validate nonce freshness server-side via an edge function

---

## Phase 3: Edge Function Auth Consistency

**Files:** `supabase/functions/verify-authenticity/index.ts`, `supabase/functions/collectai-identify/index.ts`, `supabase/functions/certificate-ai/index.ts`

### Problem
Three edge functions use the deprecated `getUser(token)` pattern instead of the recommended `getClaims(token)`. `getUser` makes a network round-trip to the auth server on every request, which is slower and less reliable.

### Fix
- Migrate all three functions from `supabase.auth.getUser(token)` to `supabase.auth.getClaims(token)`
- Extract user ID from `claimsData.claims.sub` instead of `userData.user.id`

---

## Phase 4: Public API Data Exposure Fixes

### 4.1 Remove issuer_id from verify-public response URL

**File:** `supabase/functions/verify-public/index.ts`

The `issuer_profile_url` field exposes the raw `issuer_id` UUID in the URL. Replace with a slug or obfuscated identifier.

**Change:** Remove `issuer_profile_url` from the public API response, or replace the raw UUID with a hashed value.

### 4.2 Harden nft-metadata hash lookup

**File:** `supabase/functions/nft-metadata/index.ts`

The fallback logic iterates all minted certificates (`LIMIT 100`) and compares hashes. This is:
- Slow (O(n) per request)
- Enables timing-based enumeration

**Fix:** Add a `metadata_hash` column to the certificates table, pre-computed at mint time, and do a direct database lookup instead of iterating.

---

## Phase 5: LP Deposit Verification Hardening

**File:** `supabase/functions/verify-lp-deposit/index.ts`

### 5.1 Network-Aware Treasury and RPC

The treasury wallet and RPC URL are hardcoded to devnet. These should read from environment variables and match the configured cluster.

**Changes:**
- Read `TREASURY_WALLET` from a secret/env var
- Read `SOLANA_RPC` from env var (or derive from `SOLANA_NETWORK`)
- Add a new secret `TREASURY_WALLET_ADDRESS`

### 5.2 Strict SPL Verification

The current code logs a warning but accepts unverified SPL deposits on devnet. Add a strict mode flag:
- On mainnet: reject deposits where the SPL transfer cannot be verified
- On devnet: allow with warning (current behavior)

---

## Phase 6: Items Not Applicable (Documented Rationale)

These items from the checklist do **not** apply to AuthentiSeal's current architecture:

| Item | Reason |
|------|--------|
| Token-2022 / Transfer Hooks | AuthentiSeal uses standard Metaplex NFTs, not Token-2022. No transfer hooks are implemented. Chain of custody is tracked off-chain via Supabase with on-chain anchoring via memo/NFT. |
| ExtraAccountMetaList | Not applicable -- no Token-2022 extensions used |
| Signer Privilege Propagation in hooks | Not applicable |
| init_if_needed / Anchor discriminators | AuthentiSeal does not deploy custom Solana programs. It uses existing programs (Memo, Metaplex). No on-chain program code to audit. |
| Compute Unit profiling for hooks | Not applicable |
| Trident fuzzing / Solana Verify | Not applicable -- no custom program bytecode deployed |

---

## Implementation Order

1. **Phase 3** - Edge function auth fix (quick win, low risk)
2. **Phase 4.2** - NFT metadata hash lookup optimization (security + performance)
3. **Phase 2** - NFC replay protection (new table + edge function)
4. **Phase 1** - NFT lock functionality (new UI + Metaplex call)
5. **Phase 5** - LP deposit hardening (env vars + strict mode)
6. **Phase 4.1** - Public API issuer_id cleanup (minor)

---

## Technical Details

### New Database Table (Phase 2)

```text
nfc_verification_nonces
+----------------+-----------+----------+
| column         | type      | nullable |
+----------------+-----------+----------+
| id             | uuid (PK) | no       |
| nonce          | text      | no       |
| certificate_id | uuid (FK) | no       |
| scanned_at     | timestamptz | no     |
| used_at        | timestamptz | yes    |
| created_at     | timestamptz | no     |
+----------------+-----------+----------+
```

### New Database Column (Phase 4.2)

Add `metadata_hash TEXT` to the `certificates` table, populated at mint time.

### New Secret (Phase 5)

`TREASURY_WALLET_ADDRESS` -- the production treasury wallet public key.

### Files Modified

- `src/lib/metaplex.ts` -- add `lockCertificateNFT` function
- `src/hooks/useNFCScanner.ts` -- add nonce generation
- `supabase/functions/verify-authenticity/index.ts` -- getClaims migration
- `supabase/functions/collectai-identify/index.ts` -- getClaims migration
- `supabase/functions/certificate-ai/index.ts` -- getClaims migration
- `supabase/functions/verify-public/index.ts` -- remove issuer_id exposure
- `supabase/functions/nft-metadata/index.ts` -- direct hash lookup
- `supabase/functions/verify-lp-deposit/index.ts` -- env-based config + strict SPL check
- New edge function or modification for NFC nonce validation

