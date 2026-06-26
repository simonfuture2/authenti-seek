import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import bs58 from "bs58";
import { env } from "./env.js";

/**
 * Shared umi instance, signing as the platform keypair (fee payer + tree/collection
 * authority + delegate). The Irys uploader pays Arweave costs from the platform's SOL.
 */
export const umi = createUmi(env.SOLANA_RPC_URL)
  .use(mplBubblegum())
  .use(mplCore())
  .use(irysUploader());

umi.use(
  keypairIdentity(
    umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.PLATFORM_SECRET_KEY))
  )
);
