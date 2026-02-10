

# Asset LP - Certificate Floor Value Backing

## Overview

Add an "Asset LP" feature that lets issuers back their certificates with a SOL + stablecoin (USDC/USDT) pair, establishing a verifiable floor value. The initial implementation uses a treasury wallet with database tracking, designed for a future upgrade to on-chain escrow.

## How It Works

When an issuer sets a floor value (e.g. $100) for a certificate:
- They deposit 50% in SOL and 50% in USDC or USDT
- The SOL portion can appreciate, growing the certificate's backed value
- The stablecoin portion protects against SOL downside, preserving at least 50% of floor value
- Issuers can make incremental deposits over time to increase the floor

## Architecture

**Phase 1 (this implementation):** Tokens are transferred to a designated project treasury wallet. Deposits are verified on-chain via the existing `purchase-credits` pattern (verify Solana transaction signature), then recorded in the database. The real-time SOL price ticker is used to show live backed value.

**Phase 2 (future):** Migrate to PDA-based on-chain escrow where funds are locked per-certificate in a Solana program.

## Technical Plan

### 1. Database Migration

**New table: `asset_lp_deposits`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| certificate_id | uuid (FK) | Links to certificates |
| depositor_id | uuid | Auth user who deposited |
| deposit_type | enum (`sol`, `usdc`, `usdt`) | Token deposited |
| amount_token | numeric | Raw token amount (SOL or stablecoins) |
| amount_usd_at_deposit | numeric | USD equivalent at time of deposit |
| solana_signature | text | On-chain tx proof |
| status | enum (`pending`, `confirmed`, `failed`) | Verification status |
| created_at | timestamptz | Deposit timestamp |

**New table: `asset_lp_summary`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| certificate_id | uuid (FK, unique) | One summary per cert |
| total_sol | numeric | Total SOL deposited |
| total_usdc | numeric | Total USDC deposited |
| total_usdt | numeric | Total USDT deposited |
| floor_value_usd | numeric | Original floor target |
| is_active | boolean | Whether LP is active |
| created_at / updated_at | timestamptz | Timestamps |

**RLS Policies:**
- Issuers can SELECT/INSERT/UPDATE their own certificate LP data
- Public can SELECT summary for active certificates (read-only, via the certificates_public pattern)

**New enum types:** `lp_deposit_type` (sol, usdc, usdt) and `lp_deposit_status` (pending, confirmed, failed)

### 2. Backend Function: `verify-lp-deposit`

A new edge function that:
1. Receives: certificate_id, solana_signature, deposit_type, expected_amount
2. Fetches the transaction from Solana RPC
3. Verifies the transfer went to the treasury wallet (existing `9WzDXwBb...` address)
4. For SPL tokens (USDC/USDT), verifies the correct token mint and amount
5. Records the confirmed deposit in `asset_lp_deposits`
6. Updates the `asset_lp_summary` aggregates
7. Creates a metadata version entry for audit trail

Token mint addresses (Solana mainnet):
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

### 3. New React Hook: `useAssetLP`

Located at `src/hooks/useAssetLP.ts`:
- `getLPSummary(certificateId)` - fetch current LP backing for a certificate
- `depositToLP(certificateId, depositType, amount, signature)` - submit a verified deposit
- `getLPHistory(certificateId)` - fetch all deposits for a certificate
- Uses `useSolPrice` hook to calculate live backed value (SOL portion dynamically priced)

### 4. New UI Component: `AssetLPPanel`

Located at `src/components/certificate/AssetLPPanel.tsx`:

**For the certificate detail dialog (CertificatesPage):**
- Shows current backed value with live SOL price updates
- Breakdown: SOL portion (dynamic) + stablecoin portion (stable)
- Visual progress bar toward floor value target
- "Add Liquidity" button opening a deposit modal

**Deposit Modal (`AssetLPDepositModal.tsx`):**
- Set or view the floor value target
- Choose deposit type (SOL / USDC / USDT)
- Enter amount (auto-calculates the USD equivalent)
- Wallet sends the transaction, then the app verifies it
- Shows confirmation with explorer link

### 5. Public Display

- On the public verification page and certificate preview, show the "Floor Value Backed" badge
- Display the live backed value (SOL at current price + stablecoins)
- This adds trust signal for verifiers and buyers

### 6. Files to Create/Modify

**New files:**
- `src/hooks/useAssetLP.ts` - Data fetching and deposit hook
- `src/components/certificate/AssetLPPanel.tsx` - LP summary display
- `src/components/certificate/AssetLPDepositModal.tsx` - Deposit flow UI
- `supabase/functions/verify-lp-deposit/index.ts` - On-chain deposit verification

**Modified files:**
- `src/pages/issuer/CertificatesPage.tsx` - Add LP panel to certificate detail dialog
- `src/components/certificate/CertificatePreview.tsx` - Show backed value badge
- `src/pages/PublicVerifyPage.tsx` - Display LP backing info publicly

### 7. Security Considerations

- All deposits verified on-chain before recording (same pattern as credit purchases)
- RLS ensures only certificate issuers can manage their own LP
- Treasury wallet address validated server-side
- SPL token mints validated against known addresses
- Transaction signature uniqueness enforced (prevent replay)

