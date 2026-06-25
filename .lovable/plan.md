## Refactor: Two-Role (Issuer/Verifier) → Collector-Centric Model

### Goal
Every signed-in user becomes a **Collector** who can seal graded cards and manage their own certificates. The grading company (PSA, TAG, BGS, etc.) is captured as metadata on each certificate — not as a user role. `/verify` stays fully public. **Solana, NFT minting, and on-chain code are untouched in this phase.**

---

### Conceptual model change

```text
Before                                 After
──────                                 ─────
auth.users ──┬─ role: 'issuer'         auth.users ── (all users are Collectors)
             └─ role: 'verifier'                       │
                                                       └─ certificates.grading_authority
issuer/* routes (gated)                                   = "PSA" | "TAG" | "BGS" | ...
verifier/* routes (gated)
public /verify                          /collector/* routes (any signed-in user)
                                        public /verify (unchanged)
```

The `user_roles` table and `app_role` enum stay in place for now (used by RLS policies and the `has_role` security-definer function); we just stop assigning `'verifier'` and treat every new signup as `'issuer'` internally (re-labeled "collector" in the UI) so no migrations or RLS rewrites are needed in phase 1. A follow-up phase can rename the enum value and collapse policies.

---

### Phase 1 scope (this plan)

1. **Auth & signup UX** — remove the role chooser. Single signup form creates a Collector account.
2. **Routing** — add `/collector/*` aliases for current `/issuer/*` routes; keep `/issuer/*` working as redirects so existing links don't break. Remove the `/verifier/*` dashboard surfaces from the nav (the underlying "scan / search / history / report" features move into the Collector dashboard since every collector needs them). Public `/verify` stays as-is.
3. **Layout** — consolidate `IssuerDashboardLayout` + `VerifierDashboardLayout` into a single `CollectorDashboardLayout` with merged navigation: Create, My Certificates, Transfer, Scan, Search, History, Report, Analytics, Settings.
4. **Copy/labels** — replace user-facing "Issuer" / "Verifier" wording with "Collector" / "Verify". Internal variable names can stay for this phase to keep the diff small.
5. **Grading authority field** — surface a `grading_authority` selector on the Create COA form (PSA / TAG / BGS / SGC / CGC / Other). Stored as plain text on the certificate. **No schema change required if we reuse an existing free-text column** — to confirm, I'll check `certificates` schema before writing the migration. If a new column is needed, that becomes a follow-up step.
6. **AuthContext** — keep `role` in context but default everything to `'issuer'` on signup; expose a `isCollector` boolean so downstream code reads cleanly. `requiredRole` guards on `/issuer/*` routes become "must be signed in" guards.
7. **Landing page & marketing copy** — update positioning from "Issuers and Verifiers" to "Collectors who seal their graded cards." Keep the rest of the landing structure intact.

### Explicitly out of scope (phase 1)
- Any Solana, Metaplex, minting, or on-chain transaction code (`src/lib/solana.ts`, `src/lib/metaplex.ts`, `src/hooks/useNFTMinting.ts`, `src/hooks/useSolanaTransaction.ts`, on-chain memo/audit logic).
- Database migrations to rename the `app_role` enum or collapse RLS policies.
- Edge-function changes (`verify-public`, `nft-metadata`, etc.).
- CollectAI cross-app JWT/callback flow (already shipped, untouched).
- URL renames beyond adding `/collector/*` aliases (we won't break `/issuer/*` deep links yet).

---

### Files I'll touch (phase 1)

**Auth & context**
- `src/components/auth/AuthForms.tsx` — drop role chooser; single "Create Collector Account" form.
- `src/contexts/AuthContext.tsx` — auto-assign `'issuer'` role on signup; add `isCollector` helper; remove role-selection signature change (keep backward-compatible).
- `src/pages/AuthPage.tsx` — copy update.

**Routing & layout**
- `src/App.tsx` — add `/collector/*` routes pointing at existing page components; replace `requiredRole` guards with auth-only guards; keep `/issuer/*` and `/verifier/*` as redirects/aliases; drop the verifier-role gate.
- `src/components/layout/IssuerDashboardLayout.tsx` → rename to `CollectorDashboardLayout.tsx` with merged nav (or add new file and delete old in a follow-up commit).
- `src/components/layout/VerifierDashboardLayout.tsx` — delete after merge.
- `src/components/layout/MobileBottomNav.tsx` — update default items for the unified collector nav (no behavioural change; just labels).
- All page files that import the layouts:
  - `src/pages/issuer/CreateCOAPage.tsx`
  - `src/pages/issuer/CertificatesPage.tsx`
  - `src/pages/issuer/TransferCOAPage.tsx`
  - `src/pages/issuer/AnalyticsPage.tsx`
  - `src/pages/verifier/ScanQRPage.tsx`
  - `src/pages/verifier/SearchPage.tsx`
  - `src/pages/verifier/HistoryPage.tsx`
  - `src/pages/verifier/ReportFakePage.tsx`

**Create COA form — grading authority**
- `src/pages/issuer/CreateCOAPage.tsx` — add Grading Authority dropdown (PSA / TAG / BGS / SGC / CGC / Other + free-text when Other). Will check the `certificates` schema first; if no suitable column exists, I'll surface that as a one-line follow-up migration before writing code.
- `src/components/certificate/CertificatePreview.tsx` — render the grading authority on the certificate face.

**Marketing & static copy**
- `src/pages/LandingPage.tsx` — collector-first positioning, remove "issuer vs verifier" sections.
- `src/pages/DevelopersPage.tsx`, `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx` — update terminology where user-facing.
- `src/pages/SettingsPage.tsx` — drop role display.

**Untouched (explicit)**
- `src/lib/solana.ts`, `src/lib/metaplex.ts`, `src/hooks/useNFTMinting.ts`, `src/hooks/useSolanaTransaction.ts`, `src/components/certificate/OnChainVerification.tsx`, `src/components/certificate/AssetLPPanel.tsx`, `src/components/certificate/AssetLPDepositModal.tsx`, `src/components/wallet/*`, all `src/contexts/SolanaContext.tsx`, all `supabase/functions/*`, all DB migrations.

---

### Open questions before I touch code

1. **Verifier features placement** — should "Scan QR / Search / History / Report Fake" live inside the signed-in Collector dashboard, OR should Scan/Search become *public* tools available to anyone (with History/Report still requiring auth)? The latter feels more aligned with "anyone can verify a card."
2. **Existing verifier-only accounts** — there may be live accounts with `role = 'verifier'`. Do you want them auto-upgraded to collector access in this phase, or left untouched and routed to `/verify` only?
3. **Grading authority column** — confirm I should add a new `grading_authority` text column on `certificates` (small migration) versus reusing an existing free-text field like `issuer_name`. I'd recommend a dedicated column for clean filtering/analytics later.