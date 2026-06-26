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
    { type: "PermanentTransferDelegate", authority: { type: "UpdateAuthority" } },
    // Optional soulbound-until-sanctioned-transfer (platform can still move via the
    // transfer delegate above). Uncomment to freeze holder-initiated transfers:
    // { type: "PermanentFreezeDelegate", frozen: true, authority: { type: "UpdateAuthority" } },
  ],
}).sendAndConfirm(umi);

const merkleTree = generateSigner(umi);
// createTreeV2 is async (it sizes the tree account on chain) — await before sending.
const treeBuilder = await createTreeV2(umi, {
  merkleTree,
  maxDepth: 20,
  maxBufferSize: 64,
});
await treeBuilder.sendAndConfirm(umi);

console.log("\n--- paste these into the signer env ---");
console.log("CORE_COLLECTION_ADDRESS=" + collection.publicKey);
console.log("BUBBLEGUM_TREE_ADDRESS=" + merkleTree.publicKey);
