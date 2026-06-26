import Fastify from "fastify";
import { publicKey, createGenericFile } from "@metaplex-foundation/umi";
import {
  mintV2,
  parseLeafFromMintV2Transaction,
} from "@metaplex-foundation/mpl-bubblegum";
import bs58 from "bs58";
import { env, mintAddresses } from "./env.js";
import { umi } from "./umi.js";
import { getOrCreateManagedWallet } from "./wallets.js";

interface MintBody {
  userId: string;
  /** base64-encoded PNG of the rendered COA image. */
  image: string;
  metadata: {
    name: string;
    symbol?: string;
    description?: string;
    external_url?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
    [key: string]: unknown;
  };
}

const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

// Auth: only the mint-coa edge function (which holds SIGNER_SHARED_SECRET) may call us.
app.addHook("onRequest", async (req, reply) => {
  if (req.routeOptions.url === "/health") return;
  if (req.headers["x-signer-secret"] !== env.SIGNER_SHARED_SECRET) {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

app.get("/health", async () => ({ ok: true }));

app.post("/mint", async (req, reply) => {
  const { userId, image, metadata } = (req.body ?? {}) as Partial<MintBody>;

  if (!userId || !image || !metadata?.name) {
    return reply.code(400).send({ error: "userId, image, and metadata.name are required" });
  }

  const { collection, tree } = mintAddresses();
  const owner = await getOrCreateManagedWallet(userId);

  // 1. Upload the COA image to Arweave.
  const file = createGenericFile(
    new Uint8Array(Buffer.from(image, "base64")),
    "coa.png",
    { contentType: "image/png" }
  );
  const [imageUri] = await umi.uploader.upload([file]);

  // 2. Upload the metadata JSON (with the permanent image URI) to Arweave.
  const uri = await umi.uploader.uploadJson({ ...metadata, image: imageUri });

  // 3. Mint the cNFT to the user's managed wallet, into the platform collection.
  const collectionPk = publicKey(collection);
  const { signature } = await mintV2(umi, {
    leafOwner: publicKey(owner),
    merkleTree: publicKey(tree),
    coreCollection: collectionPk,
    metadata: {
      name: metadata.name.slice(0, 32),
      uri,
      sellerFeeBasisPoints: 0,
      collection: collectionPk,
      creators: [],
    },
  }).sendAndConfirm(umi);

  // 4. Derive the asset id from the minted leaf. The mint is confirmed, but the RPC may
  //    not serve the transaction back immediately — retry the fetch until it's queryable.
  let leaf;
  for (let attempt = 0; ; attempt++) {
    try {
      leaf = await parseLeafFromMintV2Transaction(umi, signature);
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt >= 12 || !/Could not get transaction/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return {
    assetId: leaf.id,
    address: owner,
    signature: bs58.encode(signature),
    metadataUri: uri,
    imageUri,
  };
});

app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);
  const message = error instanceof Error ? error.message : "mint failed";
  reply.code(500).send({ error: message });
});

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then((addr) => app.log.info(`signer listening on ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
