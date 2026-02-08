# AuthentiSeal — Android Build, Signing & Publishing Guide

This guide covers everything needed to build, sign, and publish AuthentiSeal to **Google Play Store** and the **Solana dApp Store**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup (One-time)](#2-project-setup-one-time)
3. [Create Your Upload Keystore](#3-create-your-upload-keystore)
4. [Configure Gradle for Signing](#4-configure-gradle-for-signing)
5. [Build the Release APK / AAB](#5-build-the-release-apk--aab)
6. [Google Play App Signing](#6-google-play-app-signing)
7. [Publish to Google Play Store](#7-publish-to-google-play-store)
8. [Publish to Solana dApp Store](#8-publish-to-solana-dapp-store)
9. [Production Checklist](#9-production-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Android Studio** | Latest | [developer.android.com/studio](https://developer.android.com/studio) |
| **Java JDK** | 17+ | Bundled with Android Studio |
| **Android SDK** | API 34 (target), API 24 (min) | Via Android Studio SDK Manager |
| **Capacitor CLI** | 8.x | Already in project dependencies |

### Android Studio SDK Setup

Open Android Studio → Settings → SDK Manager and install:
- **SDK Platforms**: Android 14.0 (API 34)
- **SDK Tools**: Android SDK Build-Tools 34, Android SDK Command-line Tools, Android SDK Platform-Tools

---

## 2. Project Setup (One-time)

```bash
# 1. Clone / pull the project from GitHub
git clone <your-repo-url>
cd authenti-seal

# 2. Install dependencies
npm install

# 3. Build the web app
npm run build

# 4. Add the Android platform
npx cap add android

# 5. Sync the web build into native project
npx cap sync android
```

### Important: Production vs Development

The `capacitor.config.json` currently has a `server.url` for hot-reload during development. **Before building a release**, you MUST temporarily remove or comment out the server block so the app loads from the local `dist/` bundle:

```jsonc
{
  "appId": "app.authentiseal.coa",
  "appName": "AuthentiSeal",
  "webDir": "dist",
  // REMOVE or comment out for production builds:
  // "server": {
  //   "url": "https://...",
  //   "cleartext": true
  // },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  }
}
```

Then run `npx cap sync android` again after the change.

---

## 3. Create Your Upload Keystore

Google Play uses **Play App Signing** — you sign with an **upload key**, and Google re-signs with the actual app signing key. This means if you lose your upload key, you can contact Google to reset it (unlike traditional signing).

### Generate the Upload Keystore

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore authentiseal-upload.keystore \
  -alias authentiseal-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=AuthentiSeal, OU=Mobile, O=AuthentiSeal, L=City, ST=State, C=US"
```

You'll be prompted to create a password. **Save this password securely** — you'll need it for every release.

### ⚠️ Critical: Keystore Security

- **NEVER** commit the keystore file to version control
- Store it in a secure location (password manager, encrypted drive)
- Keep a backup — losing the keystore means you can't update your app
- Add to `.gitignore`:
  ```
  *.keystore
  *.jks
  keystore.properties
  ```

### For Solana dApp Store

Create a **separate** keystore for the Solana dApp Store (they require a different signing key than Google Play):

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore authentiseal-dapp-store.keystore \
  -alias authentiseal-dapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=AuthentiSeal, OU=Mobile, O=AuthentiSeal, L=City, ST=State, C=US"
```

---

## 4. Configure Gradle for Signing

### Step 4a: Create `keystore.properties`

In the `android/` directory, create `keystore.properties`:

```properties
# Google Play Upload Key
storeFile=../authentiseal-upload.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=authentiseal-upload
keyPassword=YOUR_KEY_PASSWORD
```

### Step 4b: Update `android/app/build.gradle`

Add the signing config **inside** the `android { }` block:

```gradle
// Load keystore properties
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'] ?: 'release.keystore')
            storePassword keystoreProperties['storePassword'] ?: ''
            keyAlias keystoreProperties['keyAlias'] ?: ''
            keyPassword keystoreProperties['keyPassword'] ?: ''
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 4c: Add ProGuard rules (optional but recommended)

Create `android/app/proguard-rules.pro`:

```proguard
# Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }

# WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

---

## 5. Build the Release APK / AAB

### Build an AAB (for Google Play — recommended)

Google Play requires Android App Bundle (`.aab`) format:

```bash
# From project root
npm run build                    # Build web assets
npx cap sync android             # Sync to native project

cd android
./gradlew bundleRelease          # Build signed AAB
```

**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

### Build an APK (for Solana dApp Store)

The Solana dApp Store requires a standard APK:

```bash
cd android
./gradlew assembleRelease        # Build signed APK
```

**Output**: `android/app/build/outputs/apk/release/app-release.apk`

### Verify the Signature

```bash
# For AAB
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab

# For APK
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. Google Play App Signing

Google Play App Signing is **mandatory for new apps**. Here's how it works:

### How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│   You (Dev)     │         │   Google Play     │         │   User Device  │
│                 │         │                   │         │                │
│ Sign with       │──AAB──▶ │ Re-signs with     │──APK──▶ │ Installs app   │
│ UPLOAD KEY      │         │ APP SIGNING KEY   │         │ signed by      │
│                 │         │ (managed by Google)│        │ Google's key   │
└─────────────────┘         └──────────────────┘         └────────────────┘
```

### Setup Steps

1. **Go to** [Google Play Console](https://play.google.com/console)
2. **Create your app** → Enter app details
3. **Navigate to**: Setup → App signing
4. **Choose**: "Let Google manage and protect your app signing key" (recommended)
5. **Upload your AAB** — Google will extract the upload key certificate automatically

### Benefits

- ✅ If you lose your upload key, Google can reset it
- ✅ Google optimizes APK delivery for each device
- ✅ Key is stored in Google's secure infrastructure
- ✅ Supports automatic key rotation

---

## 7. Publish to Google Play Store

### Step-by-step

1. **Create Developer Account**: [play.google.com/console](https://play.google.com/console) ($25 one-time fee)

2. **Create App**:
   - App name: **AuthentiSeal**
   - Default language: English
   - App type: App
   - Free or Paid: Your choice
   - Category: Business / Utilities

3. **Store Listing**:
   - Short description: "Blockchain Certificates of Authenticity for Physical Products"
   - Full description: Use the description from `dapp-store/config.yaml`
   - Screenshots: At least 2 phone screenshots (1080×1920)
   - Feature graphic: 1024×500
   - App icon: 512×512 (already at `dapp-store/media/icon-512.png`)

4. **Content Rating**: Complete the IARC questionnaire

5. **Target Audience**: Select appropriate age groups

6. **App Access**: If app requires login, provide test credentials

7. **Upload AAB**:
   - Go to: Release → Production → Create new release
   - Upload your `.aab` file
   - Add release notes
   - Review and roll out

### Required Permissions Declaration

In Play Console, declare why your app uses these permissions:
- **INTERNET**: Core functionality — blockchain verification
- **CAMERA**: QR code scanning for certificate verification
- **NFC**: NFC tag reading for physical product authentication

---

## 8. Publish to Solana dApp Store

Refer to the existing `dapp-store/README.md` for full Solana dApp Store instructions. Summary:

```bash
# 1. Install CLI
npm install --save-dev @solana-mobile/dapp-store-cli

# 2. Copy APK to dapp-store folder
cp android/app/build/outputs/apk/release/app-release.apk \
   dapp-store/files/authentiseal-v1.0.0.apk

# 3. Update dapp-store/config.yaml with your email & wallet address

# 4. Create Publisher NFT (first time)
npx dapp-store create publisher -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com

# 5. Create App NFT (first time)
npx dapp-store create app -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com

# 6. Create Release NFT
npx dapp-store create release -k /path/to/keypair.json -u https://api.mainnet-beta.solana.com

# 7. Submit for review
npx dapp-store publish submit \
  -k /path/to/keypair.json \
  -u https://api.mainnet-beta.solana.com \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

**Important**: Use a **different keystore** for the Solana dApp Store APK than your Google Play upload key.

---

## 9. Production Checklist

### Before Building Release

- [ ] Remove `server.url` from `capacitor.config.json` (or comment out)
- [ ] Set `webContentsDebuggingEnabled: false` in Capacitor config
- [ ] Verify app connects to **Mainnet** (not Devnet) for Solana
- [ ] Update `VITE_SUPABASE_URL` if using production Supabase
- [ ] Test all features on a physical Android device
- [ ] Verify QR scanning and NFC work on device
- [ ] Verify wallet connections (Phantom, Solflare) work via deep links

### Store Assets Needed

| Asset | Dimensions | Where |
|-------|-----------|-------|
| App icon | 512×512 PNG | Both stores |
| Feature banner (Play) | 1024×500 PNG | Google Play |
| Feature banner (dApp) | 1200×600 PNG | Solana dApp Store |
| Phone screenshots | 1080×1920 PNG | Both stores (2-8) |
| 7" tablet screenshots | 1200×1920 PNG | Google Play (optional) |
| 10" tablet screenshots | 1600×2560 PNG | Google Play (optional) |

### Version Bumping

For each new release:
1. Update `version_code` and `version_name` in `dapp-store/config.yaml`
2. Update `versionCode` and `versionName` in `android/app/build.gradle`
3. Rebuild and re-sign

---

## 10. Troubleshooting

### Build Fails with "SDK not found"

Set `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Android/Sdk    # Linux
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
```

### "Keystore was tampered with, or password was incorrect"

Double-check the password in `keystore.properties`. Passwords are case-sensitive.

### APK is too large

The app uses Solana/WalletConnect libraries (~4MB). This is expected. Consider:
- Enabling ProGuard/R8 minification (already configured above)
- Using App Bundles (AAB) for Google Play — Google serves optimized APKs per device

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

You're trying to install a release signed with a different key over an existing debug install. Uninstall the debug version first:
```bash
adb uninstall app.authentiseal.coa
```

### Camera/NFC not working on device

Make sure permissions are declared in `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

---

## Quick Reference Commands

```bash
# Development (hot-reload on device)
npx cap run android

# Production build for Google Play
npm run build && npx cap sync android && cd android && ./gradlew bundleRelease

# Production build for Solana dApp Store
npm run build && npx cap sync android && cd android && ./gradlew assembleRelease

# Check signing
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

---

**Need help?** Check these resources:
- [Android App Signing docs](https://developer.android.com/studio/publish/app-signing)
- [Capacitor Android docs](https://capacitorjs.com/docs/android)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Solana dApp Store docs](https://docs.solanamobile.com/dapp-publishing/intro)
- [Lovable Mobile Blog](https://lovable.dev/blog/mobile-app-with-lovable)
