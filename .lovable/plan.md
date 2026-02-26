

## Plan: JWT Verification & Certificate Pre-fill from CollectAI

### Overview
CollectAI will send users to AuthentiSeal's `/issuer/create` route with a signed JWT in the URL. AuthentiSeal needs to:
1. Create an edge function to verify the JWT and return the decoded card data
2. Add an `AUTHENTISEAL_SHARED_SECRET` secret for JWT verification
3. Update `CreateCOAPage` to detect the JWT token from URL params, call the edge function to verify it, and pre-fill the certificate form

### Step 1: Add the `AUTHENTISEAL_SHARED_SECRET` secret
- Use the secrets tool to request the shared secret used to sign/verify JWTs between CollectAI and AuthentiSeal
- This must match the secret CollectAI uses to sign JWTs

### Step 2: Create `verify-collectai-jwt` edge function
New file: `supabase/functions/verify-collectai-jwt/index.ts`
- Accepts POST with `{ token: string }`
- Verifies the JWT using `AUTHENTISEAL_SHARED_SECRET` via the Web Crypto API (HMAC SHA-256)
- Extracts payload: `{ cardName, cardDescription, cardCategory, cardImage, userEmail, grade, serialNumber }`
- Returns the decoded payload if valid, 401 if invalid/expired
- Includes standard CORS headers

### Step 3: Update `CreateCOAPage` to detect and consume the JWT
- Read `?token=` query param from URL using `useSearchParams`
- On mount, if `token` is present, call the `verify-collectai-jwt` edge function
- On success, pre-fill the form fields:
  - `product_name` ← `cardName`
  - `product_description` ← `cardDescription`
  - `product_category` ← map `cardCategory` to existing categories
  - `serial_number` ← `serialNumber` (if provided)
  - `productImages` ← `[cardImage]` (if provided)
- Show a toast/banner: "Pre-filled from CollectAI"
- On failure (invalid/expired JWT), show an error toast and let user fill manually

### Step 4: Update `cross-app.ts` with a new deep link helper
- Add a `createCOAUrl(token: string)` helper to `ECOSYSTEM_APPS.authentiseal` that builds the deep link URL: `https://authenti-seek.lovable.app/issuer/create?token=<jwt>&ref=collectai`

### Technical Details
- JWT verification uses `crypto.subtle.importKey` + `crypto.subtle.verify` (HMAC-SHA256) in the edge function — no external dependencies needed
- The JWT payload is base64url-decoded and parsed server-side; the frontend never touches the secret
- Token expiry (`exp` claim) is validated to prevent replay attacks
- The edge function is public (`verify_jwt = false` in config.toml) since it does its own JWT validation

