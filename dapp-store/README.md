# AuthentiSeal - Solana dApp Store Publishing

This folder contains everything needed to publish AuthentiSeal to the Solana dApp Store.

## Quick Start

### 1. Install the dApp Store CLI

```bash
npm install --save-dev @solana-mobile/dapp-store-cli
```

### 2. Prepare Your Assets

Place the following in the `media/` folder:
- `icon-512.png` - App icon (512x512 PNG)
- `banner-1200x600.png` - Feature banner (1200x600 PNG)
- `screenshot-*.png` - App screenshots (1080x1920 recommended)

### 3. Build & Sign Your APK

```bash
# From project root
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

The signed APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Important**: Sign with a NEW keystore (not your Google Play keystore).

### 4. Copy APK to Publishing Folder

```bash
cp android/app/build/outputs/apk/release/app-release.apk dapp-store/files/authentiseal-v1.0.0.apk
```

### 5. Update config.yaml

Fill in the required fields:
- `publisher.email` - Your contact email
- `publisher.address` - Your Solana wallet address (for Publisher NFT)

### 6. Validate Configuration

```bash
npx dapp-store validate -b /path/to/android/sdk/build-tools/34.0.0
```

### 7. Create Publisher NFT (First Time Only)

```bash
npx dapp-store create publisher -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com
```

### 8. Create App NFT (First Time Only)

```bash
npx dapp-store create app -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com
```

### 9. Create Release NFT

```bash
npx dapp-store create release -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com
```

### 10. Submit for Review

```bash
npx dapp-store publish submit \
  -k /path/to/keypair.json \
  -u https://api.mainnet-beta.solana.com \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

## Folder Structure

```
dapp-store/
├── config.yaml          # Publishing configuration
├── README.md            # This file
├── media/               # Assets for store listing
│   ├── icon-512.png
│   ├── banner-1200x600.png
│   └── screenshot-*.png
└── files/               # APK files
    └── authentiseal-v1.0.0.apk
```

## Resources

- [Solana dApp Store Docs](https://docs.solanamobile.com/dapp-publishing/intro)
- [Publishing Checklist](https://docs.solanamobile.com/dapp-publishing/checklist)
- [Publisher Policy](https://docs.solanamobile.com/dapp-publishing/publisher-policy)
- [Solana Mobile Discord](https://discord.gg/solanamobile)

## Tips

1. **Use a Dedicated Wallet**: Create a new wallet specifically for dApp Store publishing.
2. **Keep Your Keystore Safe**: If you lose your APK signing keystore, you cannot update your app.
3. **Test on Devnet First**: Use `-u https://api.devnet.solana.com` for testing.
4. **Fund Your Wallet**: You'll need ~0.02 SOL for minting the NFTs on mainnet.
