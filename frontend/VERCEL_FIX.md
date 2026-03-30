# Vercel Deployment Fix - Capacitor Dependency Issue

## Problem
Vercel was failing to install dependencies due to peer dependency conflicts:
- `@codetrix-studio/capacitor-google-auth@^3.4.0-rc.4` requires `@capacitor/core@^6.0.0`
- Your project had `@capacitor/core@^8.3.0`
- This conflict caused `npm install` to fail on Vercel

## Root Cause
Capacitor is **mobile-only** and should never be deployed to Vercel (which is for web applications). The Capacitor Google Auth plugin only works in native mobile environments (Android/iOS), not in web browsers.

## Solution Applied

### 1. Removed Capacitor Dependencies from package.json
**Removed:**
- `@capacitor/android`
- `@capacitor/core`
- `@codetrix-studio/capacitor-google-auth`
- `@capacitor/cli`

**Kept:**
- `@react-oauth/google` - This works for web-based Google authentication

### 2. Updated Login & Register Pages
Replaced `Capacitor.isNativePlatform()` with runtime check:
```javascript
// Before (requires @capacitor/core)
import { Capacitor } from "@capacitor/core";
Capacitor.isNativePlatform() ? ...

// After (works without Capacitor installed)
(typeof window !== 'undefined' && !!window.Capacitor) ? ...
```

This allows the code to safely detect if running in a Capacitor environment without requiring the package to be installed.

### 3. Added `.vercelignore` File
Created `/frontend/.vercelignore` to exclude mobile-specific files from Vercel builds:
```
android/
ios/
capacitor.config.ts
node_modules/@capacitor/android
node_modules/@codetrix-studio/capacitor-google-auth
```

### 4. Updated `.gitignore`
Added mobile-specific folders to prevent them from being committed:
```
/android/
/ios/
capacitor.config.ts
```

## How It Works Now

### Web Deployment (Vercel)
- ✅ Uses `@react-oauth/google` for web-based Google sign-in
- ✅ No Capacitor dependencies to cause conflicts
- ✅ Builds successfully without peer dependency errors

### Mobile Build (Capacitor)
When building for mobile, you'll need to reinstall Capacitor:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @codetrix-studio/capacitor-google-auth
npx cap sync android
```

## Code Already Handles Both Environments

Your login/register pages use **dynamic imports** for Capacitor:
```javascript
const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
```

This means:
- On web: The import fails gracefully and you'd use web OAuth instead
- On mobile: The Capacitor plugin loads and works natively

## Next Steps

### For Vercel Deployment
1. Commit the changes:
   ```bash
   git add .
   git commit -m "fix: remove capacitor deps for vercel build"
   git push origin main
   ```

2. Vercel will automatically redeploy with the fixed dependencies

### For Mobile Development
When working on mobile features, create a separate setup script or manually install Capacitor:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android @codetrix-studio/capacitor-google-auth
npx cap sync
```

Consider using optional dependencies or environment-specific package.json files for better separation.

## Alternative Approach (Optional)

For better long-term maintenance, consider using **optionalDependencies** in package.json:

```json
{
  "optionalDependencies": {
    "@capacitor/core": "^8.3.0",
    "@capacitor/android": "^8.3.0",
    "@codetrix-studio/capacitor-google-auth": "^3.4.0-rc.4"
  }
}
```

Or use **peerDependencies** with proper fallbacks in your code.

## Summary

✅ **Fixed**: Vercel deployment will now succeed
✅ **Web Auth**: Still works via `@react-oauth/google`
✅ **Mobile Auth**: Requires separate Capacitor installation for development
✅ **No Conflicts**: Removed conflicting peer dependencies
