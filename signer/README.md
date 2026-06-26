# AuthentiSeal Signer Service

A tiny always-on Node service that holds the **platform keypair** and does the two things
Lovable cannot: provision managed wallets and **mint compressed NFTs** with **permanent
metadata + image on Arweave**, paid for by the platform.

It is called only by the Supabase `mint-coa` edge function, authenticated with a shared
secret. End users never see it.

> Phase 3 = **devnet end-to-end**. Mainnet is Phase 5.

## What it does

- `GET /health` → `{ ok: true }`
- `POST /mint` (header `x-signer-secret`) — body `{ userId, image (base64 PNG), metadata }`:
  1. lazily provisions the user's managed wallet (`getOrCreateManagedWallet`),
  2. uploads the image to Arweave (Irys),
  3. uploads the metadata JSON (with the permanent image URI) to Arweave,
  4. mints a cNFT to the managed wallet inside the platform collection,
  5. returns `{ assetId, address, signature, metadataUri, imageUri }`.

The platform keypair is fee payer + tree authority + collection authority + delegate. The
collection carries a `PermanentTransferDelegate`, so the platform can move cNFTs on a
holder's behalf later (Phase 4 invisible transfer). The managed wallet's own secret is
encrypted (AES-256-GCM) and stored as a dormant safety net — it is not used for mint/transfer.

## Prerequisites (manual, one-time)

1. **DAS-capable RPC** (cNFTs require it): a Helius or Triton **devnet** endpoint + API key.
2. **Platform keypair**: `solana-keygen new`, then fund it:
   ```bash
   solana config set --url <your devnet RPC>
   solana airdrop 2
   ```
   Convert its secret key to base58 for `PLATFORM_SECRET_KEY` (e.g. with a small script that
   reads `~/.config/solana/id.json` and `bs58.encode`s the byte array).
3. **Encryption key**: `openssl rand -base64 32` → `WALLET_ENCRYPTION_KEY`.
4. **Shared secret**: any high-entropy string → `SIGNER_SHARED_SECRET` (also set in Supabase).
5. **Supabase service role key**: from the Supabase dashboard → `SUPABASE_SERVICE_ROLE_KEY`.

## Setup (run once, devnet)

```bash
cp .env.example .env        # fill PLATFORM_SECRET_KEY, SOLANA_RPC_URL, WALLET_ENCRYPTION_KEY,
                            # SIGNER_SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run setup               # creates the mpl-core collection + Bubblegum tree
```

Paste the two printed lines into `.env` (and your host's secrets):

```
CORE_COLLECTION_ADDRESS=...
BUBBLEGUM_TREE_ADDRESS=...
```

## Run locally

```bash
npm run dev                 # tsx watch
curl localhost:8080/health  # -> {"ok":true}
```

Smoke-test a mint (a 1x1 PNG works as the image):

```bash
curl -s localhost:8080/mint \
  -H "content-type: application/json" \
  -H "x-signer-secret: $SIGNER_SHARED_SECRET" \
  -d '{
    "userId": "<an auth.users id with a profiles row>",
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "metadata": { "name": "Test COA", "symbol": "ASEAL", "description": "smoke test" }
  }'
```

Verify the returned `assetId` resolves via your DAS RPC (`getAsset`) and that `metadataUri`
+ `imageUri` open in a browser.

## Deploy (Railway / Fly / Render)

The included `Dockerfile` runs `src/server.ts` via `tsx` (no build step). Set these env vars
as host secrets:

```
PLATFORM_SECRET_KEY, SOLANA_RPC_URL, WALLET_ENCRYPTION_KEY, SIGNER_SHARED_SECRET,
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORE_COLLECTION_ADDRESS, BUBBLEGUM_TREE_ADDRESS, PORT
```

Record the deployed URL — it becomes `SIGNER_URL` in the Supabase project secrets (alongside
`SIGNER_SHARED_SECRET`) for the `mint-coa` edge function.
