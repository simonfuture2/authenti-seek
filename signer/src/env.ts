import "dotenv/config";

/** Read a required env var or throw at startup (fail fast, not mid-request). */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Read an env var that is only required at request time (setup script doesn't need them). */
function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const env = {
  PLATFORM_SECRET_KEY: required("PLATFORM_SECRET_KEY"),
  SOLANA_RPC_URL: required("SOLANA_RPC_URL"),
  WALLET_ENCRYPTION_KEY: required("WALLET_ENCRYPTION_KEY"),
  SIGNER_SHARED_SECRET: required("SIGNER_SHARED_SECRET"),
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Optional at import time so the setup script (which mints them) can run first.
  CORE_COLLECTION_ADDRESS: optional("CORE_COLLECTION_ADDRESS"),
  BUBBLEGUM_TREE_ADDRESS: optional("BUBBLEGUM_TREE_ADDRESS"),
  PORT: Number(process.env.PORT) || 8080,
};

/** Mint-time addresses, validated lazily so `npm run setup` can create them. */
export function mintAddresses() {
  if (!env.CORE_COLLECTION_ADDRESS || !env.BUBBLEGUM_TREE_ADDRESS) {
    throw new Error(
      "CORE_COLLECTION_ADDRESS and BUBBLEGUM_TREE_ADDRESS must be set (run `npm run setup` first)."
    );
  }
  return {
    collection: env.CORE_COLLECTION_ADDRESS,
    tree: env.BUBBLEGUM_TREE_ADDRESS,
  };
}
