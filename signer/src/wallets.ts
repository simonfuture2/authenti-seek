import crypto from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const KEY = Buffer.from(env.WALLET_ENCRYPTION_KEY, "base64"); // 32 bytes
if (KEY.length !== 32) {
  throw new Error("WALLET_ENCRYPTION_KEY must decode to 32 bytes (base64).");
}

/** AES-256-GCM → base64(iv | authTag | ciphertext). */
function encrypt(secret: Uint8Array): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(secret)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

/**
 * Inverse of {@link encrypt}. Unused this phase — the managed-wallet secret is a dormant
 * safety net; mint/transfer go through the collection's PermanentTransferDelegate, not
 * this key. Needed for Phase 4 (export / direct-sign transfer).
 */
export function decrypt(blob: string): Uint8Array {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return new Uint8Array(Buffer.concat([decipher.update(ct), decipher.final()]));
}

/**
 * Return the user's managed-wallet address, creating it on first call. The leaf owner of
 * minted cNFTs. The platform never needs this wallet's key for normal operations.
 */
export async function getOrCreateManagedWallet(userId: string): Promise<string> {
  const { data, error } = await db
    .from("managed_wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`managed_wallets lookup failed: ${error.message}`);
  if (data?.address) return data.address;

  const kp = Keypair.generate();
  const address = kp.publicKey.toBase58();

  const { error: insertError } = await db.from("managed_wallets").insert({
    user_id: userId,
    address,
    encrypted_secret: encrypt(kp.secretKey),
  });
  if (insertError) throw new Error(`managed_wallets insert failed: ${insertError.message}`);

  // Mirror the public key onto profiles for client-side display. The profiles row is keyed
  // by user_id (the auth.users id); this is a best-effort mirror, so don't fail the mint on it.
  const { error: profileError } = await db
    .from("profiles")
    .update({ managed_wallet_address: address })
    .eq("user_id", userId);
  if (profileError) {
    console.warn(`profiles managed_wallet_address mirror failed: ${profileError.message}`);
  }

  return address;
}
