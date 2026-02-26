

## Plan: POST Callback to CollectAI After Certificate Creation

### Overview
After a certificate is created from a CollectAI deep link, AuthentiSeal needs to POST back to the `callback_url` from the decoded JWT with a signed response JWT containing the certificate details.

### Step 1: Update `verify-collectai-jwt` edge function
Extract `callback_url` and `card_id` from the decoded JWT payload and return them alongside existing card data.

**File:** `supabase/functions/verify-collectai-jwt/index.ts`
- Add `callbackUrl: payload.callback_url || null` and `cardId: payload.card_id || null` to the returned `cardData` object

### Step 2: Create `collectai-callback` edge function
**New file:** `supabase/functions/collectai-callback/index.ts`
- Accepts POST with `{ callback_url, card_id, serial_number }`
- Signs a JWT using `AUTHENTISEAL_SHARED_SECRET` with payload: `{ source: "authentiseal", card_id, serial_number, iat, exp }`
- Uses Web Crypto API (HMAC-SHA256) to sign — mirrors the existing verification logic but in reverse
- POSTs to `callback_url` with body: `{ token, card_id, serial_number }`
- Validates `callback_url` is a trusted domain (e.g., `collectai.lovable.app` or its Supabase functions URL) before sending
- Returns success/failure status
- Add `[functions.collectai-callback] verify_jwt = false` to `supabase/config.toml`

### Step 3: Update `CreateCOAPage.tsx` to store and use callback data
- Store `callbackUrl` and `cardId` from the JWT verification response in component state
- After certificate creation succeeds (line ~414, after `setCreatedCert(result)`), call the `collectai-callback` edge function with `callback_url`, `card_id`, and the certificate's `serial_number`
- Show a toast on success: "CollectAI has been notified"
- On failure, show a warning toast but don't block the user — the certificate is already created

### Technical Details
- JWT signing in the edge function uses `crypto.subtle.importKey` + `crypto.subtle.sign` (HMAC-SHA256), then base64url-encodes the result
- The callback URL is validated against an allowlist to prevent SSRF
- The callback is fire-and-forget from the user's perspective — certificate creation is not gated on it
- Token expiry set to 5 minutes to prevent replay

