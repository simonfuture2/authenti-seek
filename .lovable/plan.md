

# Add WalletConnect Recommended Option for Mobile/Tablet

## Overview

This plan adds a prominent, recommended "Use WalletConnect" section specifically for mobile and tablet users. WalletConnect is the most reliable cross-wallet mobile flow because it uses a standardized QR code protocol that works with any compatible wallet app, avoiding the inconsistencies of deep linking.

## What Will Change

### User Experience Improvements

1. **Prominent Recommended Section for Mobile Users**
   - On touch devices (iPad, iPhone, Android), a new highlighted section will appear at the top of the wallet modal
   - The section will be visually distinct with a gradient border and "Recommended" badge
   - Clear instructions explaining why WalletConnect is the best choice for mobile

2. **Step-by-Step Instructions**
   - Before showing the QR code: Brief explanation of what will happen
   - After QR appears: Clear numbered steps (1. Open wallet app, 2. Find scan option, 3. Scan QR)
   - Mention that most Solana wallets support WalletConnect (Phantom, Solflare, etc.)

3. **Improved QR Code View**
   - Larger, more prominent QR code
   - Better loading state with clearer messaging
   - "Copy to clipboard" button as fallback for manual pasting
   - Retry button if QR generation fails

---

## Technical Details

### File Changes

**`src/components/wallet/CustomWalletModal.tsx`**

1. **Add new state for clipboard copying**
   ```typescript
   const [copiedUri, setCopiedUri] = useState(false);
   ```

2. **Create a dedicated WalletConnect button component**
   - Render at the top of the modal when `isTouch` is true
   - Uses the Solana gradient styling for prominence
   - Includes a "Recommended for mobile" badge

3. **Filter WalletConnect from the "otherWallets" list on mobile**
   - Extract WalletConnect wallet adapter from the list
   - Display it separately in the recommended section
   - Only show in "More Options" on desktop

4. **Enhanced QR code view with instructions**
   - Add numbered step instructions
   - Add a "Copy URI" button using clipboard API
   - Add wallet compatibility note (Phantom, Solflare, etc.)

5. **Import additional icons**
   - `QrCode` icon from lucide-react for the recommended button
   - `Copy` and `Check` icons for the copy button

### UI Layout (Mobile/Tablet)

```text
+------------------------------------------+
| [←] [Wallet Icon] Connect Wallet         |
+------------------------------------------+
|                                          |
| ╔════════════════════════════════════╗   |
| ║  📱 RECOMMENDED FOR MOBILE         ║   |
| ║                                    ║   |
| ║  [QR Icon] Use WalletConnect       ║   |
| ║  Works with any Solana wallet app  ║   |
| ║                                    ║   |
| ╚════════════════════════════════════╝   |
|                                          |
| ── OR OPEN DIRECTLY ──                   |
|                                          |
| [Phantom]         Open in app            |
| [Solflare]        Open in app            |
|                                          |
| New to Solana? Get Phantom               |
+------------------------------------------+
```

### QR Code View (After Clicking WalletConnect)

```text
+------------------------------------------+
| [←] [Wallet Icon] Scan QR Code           |
+------------------------------------------+
|                                          |
|        ┌─────────────────┐               |
|        │                 │               |
|        │    [QR CODE]    │               |
|        │                 │               |
|        └─────────────────┘               |
|                                          |
|  How to connect:                         |
|  1. Open your wallet app                 |
|  2. Tap the scan/WalletConnect button    |
|  3. Scan this QR code                    |
|                                          |
|  [Copy Link] ← for manual pasting        |
|                                          |
|  Works with: Phantom, Solflare & more    |
+------------------------------------------+
```

### Code Changes Summary

| Location | Change |
|----------|--------|
| Lines 1-15 | Add `QrCode`, `Copy`, `Check` imports from lucide-react |
| Lines 53-58 | Add `copiedUri` state |
| Lines 65-81 | Extract WalletConnect adapter separately via `useMemo` |
| Lines 188-250 | Add recommended WalletConnect section for touch devices |
| Lines 213-240 | Enhance QR view with instructions and copy button |

### Copy URI Handler

```typescript
const handleCopyUri = useCallback(() => {
  if (walletConnectUri) {
    navigator.clipboard.writeText(walletConnectUri);
    setCopiedUri(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedUri(false), 2000);
  }
}, [walletConnectUri]);
```

## Why This Approach

1. **WalletConnect is Universal** - Unlike deep links which require specific wallet apps and can fail on iOS due to security restrictions, WalletConnect uses a standardized protocol
2. **No App Detection Needed** - Works regardless of which wallet the user has installed
3. **Better User Control** - User chooses which wallet to use in their own app
4. **Fallback Options** - Deep links to Phantom/Solflare remain as "OR OPEN DIRECTLY" alternatives

## Dependencies

- `VITE_WALLETCONNECT_PROJECT_ID` secret is already configured
- `qrcode.react` package is already installed
- WalletConnect adapter is already set up in `SolanaContext.tsx`

