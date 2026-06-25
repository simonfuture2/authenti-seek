# Phase 0 Verification Plan

Run the checklist as a mix of static checks (grep/build) and a live Playwright pass against the running preview. No app code changes — this is verification only. If any item fails, I'll report it and propose a fix in a follow-up plan.

## 1. Static checks (shell, read-only)

- `rg -n "issuer|verifier" src/components/layout src/pages/LandingPage.tsx src/pages/issuer/CreateCOAPage.tsx` — confirm no user-facing "issuer"/"verifier" copy remains in nav, seal page, or landing hero (matches inside route paths like `/issuer/create` and DB column `issuer_id` are expected and OK).
- `rg -n "collectai\.lovable\.app|mycollectai\.com" src/lib/cross-app.ts supabase/functions/collectai-callback/index.ts` — confirm only `mycollectai.com` remains.
- `rg -n "/issuer/create|/issuer/certificates|/issuer/transfer|/verifier/scan|/verifier/search|/collection|/seal|/transfer|/verify" src/App.tsx` — confirm redirects + new aliases are wired.
- `bunx tsgo --noEmit` — TypeScript build clean, Supabase generated types resolve.

## 2. Live checks (Playwright against localhost dev server)

Single script under `/tmp/browser/phase0/` that:

1. Restores the injected Supabase session into localStorage, navigates to `/` while signed in → asserts redirect lands on `/collection` with no role-picker UI. Screenshot.
2. Goes to `/seal`, fills the minimum required fields, submits, and confirms the new certificate appears in `/collection`. Screenshot before + after.
3. Reloads `/collection` and asserts every row's owner matches the signed-in user (spot-check via visible "Sealed by" label or row count vs. a second query).
4. Visits `/issuer/create`, `/issuer/certificates`, `/issuer/transfer`, `/verifier/scan`, `/verifier/search` and asserts each ends on `/seal`, `/collection`, `/transfer`, `/verify`, `/verify` respectively.
5. Clears storage, visits `/verify` signed-out → asserts page renders (no auth redirect). Screenshot.
6. Captures the landing hero, top nav, and seal page screenshots; greps the rendered DOM text for `issuer`/`verifier` — must be zero matches.

## 3. Reporting

I'll post a pass/fail table for the 7 checklist items with screenshot evidence for the live ones and the exact grep/build output for the static ones. Anything failing gets a short root-cause note and I'll wait for approval before fixing.

## Out of scope

- No DB migrations, no edge function redeploys, no code edits.
- Won't touch `/issuer/*` source paths or `issuer_id` column — those are intentionally preserved.
