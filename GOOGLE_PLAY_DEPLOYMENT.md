# Google Play Store Deployment Guide

## ✅ Completed Steps
- [x] Google Play Developer Account (you need to create)
- [x] Android Signing Key Generated: `my-release-key.keystore`

## 📋 Remaining Steps

### Step 1: Create & Configure Your App on Google Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - **App name**: "MY LIFE & MY CASHFLOW AFFIRMATIONS"
   - **Default language**: English
   - **App category**: Lifestyle/Books & Reference
   - **App type**: Free
4. Accept declarations and create

### Step 2: Set Up App Signing
1. In Google Play Console → App signing → Google Play App Signing
2. Let Google manage app signing (recommended)
3. Download the SHA-1 fingerprint (you'll need it)

### Step 3: Create a Release Build

Run this command to build a signed APK:

```bash
npm run build:android
```

Or if using EAS:

```bash
npx eas build --platform android --release
```

### Step 4: Generate App Bundle (AAB) for Google Play

```bash
npm run bundle:android
```

The app bundle will be created in the `dist/` directory.

### Step 5: Create Store Listings

In Google Play Console, fill in:
- **App title**: MY LIFE & MY CASHFLOW AFFIRMATIONS
- **Short description**: "Daily affirmations to transform your mindset and empower your financial growth"
- **Full description**: 
  - "Discover daily affirmations designed to help you build a positive mindset around money and personal growth."
  - "Each month brings new affirmations tailored to help you overcome limiting beliefs and embrace abundance."
  - "Features: Monthly affirmations, offline access, booklet downloads"
- **Category**: Lifestyle
- **Content rating**: General audiences

### Step 6: Add Screenshots & Icon

Required for Google Play:
- **Icon**: 512×512 PNG (we have this at `assets/images/icon.png`)
- **Feature graphic**: 1024×500 PNG
- **Screenshots** (at least 2, up to 8):
  - Library screen showcasing booklets
  - Affirmation display screen
  - Menu and navigation
- **Video thumbnail** (optional)

### Step 7: Add Version Details

- **Version number**: 1.0.0
- **Release notes**: "Initial release - Daily affirmations booklets available"
- **Content rating**: General audiences
- **Privacy policy URL**: (if available)

### Step 8: Upload to Google Play

1. Go to Release management → Production
2. Click "Create new release"
3. Upload your signed AAB file
4. Review all details and submit for review
5. Google Play typically reviews within 24-48 hours

## 🔑 Important Files

- **Keystore**: `my-release-key.keystore` (Keep this safe! Don't commit to git)
- **Package ID**: `com.mylifemycashflow`
- **App ID**: Found in `app.json`

## 📝 Pricing & Distribution

- Set pricing (Free recommended initially)
- Select countries for distribution
- Set content rating questionnaire answers
- Complete privacy policy if required

## ⚠️ Important Notes

1. **Store Keystore File**: Save `my-release-key.keystore` in a safe location outside of git
2. **Keep Credentials Safe**: Never commit keystore or credentials to version control
3. **Version Management**: Update version in `app.json` for subsequent releases
4. **Testing**: Use internal testing track first before release to production

## Next Steps

1. Create Google Play Developer account
2. Run build command: `npm run build:android`
3. Upload to Google Play Console
4. Submit for review

