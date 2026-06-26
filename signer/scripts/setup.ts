/**
 * One-time devnet setup. Creates:
 *   1. an mpl-core collection with a PermanentTransferDelegate (so the platform can move
 *      cNFTs on a holder's behalf for the future invisible transfer — Phase 4), and
 *   2. a Bubblegum v2 merkle tree.
 *
 * Run once, then paste the printed addresses into the signer's env.
 *
 *   npm run setup
 */
import "dotenv/config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, generateSigner } from "@metaplex-foundation/umi";
import { createCollection } from "@metaplex-foundation/mpl-core";
import { createTreeV2 } from "@metaplex-foundation/mpl-bubblegum";
import bs58 from "bs58";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const COLLECTION_METADATA_URI =
  process.env.COLLECTION_METADATA_URI ||
  "https://authenti-seek.lovable.app/collection.json";

const umi = createUmi(required("SOLANA_RPC_URL"));
umi.use(
  keypairIdentity(
    umi.eddsa.createKeypairFromSecretKey(bs58.decode(required("PLATFORM_SECRET_KEY")))
  )
);

const collection = generateSigner(umi);
await createCollection(umi, {
  collection,
  name: "AuthentiSeal Certificates",
  uri: COLLECTION_METADATA_URI,
  plugins: [
    // REQUIRED for minting cNFTs into this core collection via Bubblegum v2.
    { type: "BubblegumV2" },
    // Lets the platform move cNFTs on a holder's behalf (Phase 4 invisible transfer).
    { type: "PermanentTransferDelegate", authority: { type: "UpdateAuthority" } },
    // Optional soulbound-until-sanctioned-transfer (platform can still move via the
    // transfer delegate above). Uncomment to freeze holder-initiated transfers:
    // { type: "PermanentFreezeDelegate", frozen: true, authority: { type: "UpdateAuthority" } },
  ],
}).sendAndConfirm(umi);

// Reuse an existing tree if one is already provisioned (avoids paying tree rent again).
let treeAddress = process.env.BUBBLEGUM_TREE_ADDRESS;
if (treeAddress) {
  console.log("Reusing existing BUBBLEGUM_TREE_ADDRESS=" + treeAddress);
} else {
  const merkleTree = generateSigner(umi);
  // createTreeV2 is async (it sizes the tree account on chain) — await before sending.
  // Bubblegum v2 requires a canopy; depth 14 + canopy 11 ≈ 16k cNFTs with a 3-node proof
  // (cheap rent, fully composable). Bump maxDepth/canopy later for higher capacity.
  const treeBuilder = await createTreeV2(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 11,
  });
  await treeBuilder.sendAndConfirm(umi);
  treeAddress = merkleTree.publicKey;
}

console.log("\n--- paste these into the signer env ---");
console.log("CORE_COLLECTION_ADDRESS=" + collection.publicKey);
console.log("BUBBLEGUM_TREE_ADDRESS=" + treeAddress);
