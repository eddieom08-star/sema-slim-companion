# Clerk iOS SDK Setup Instructions

This document provides step-by-step instructions for completing the Clerk iOS SDK integration.

## Current Status

✅ **Completed (Automated):**
- Created Capacitor plugin bridge (`ClerkPlugin.swift`)
- Created TypeScript wrapper (`clerkNative.ts`)
- Set up plugin architecture
- **Uncommented Clerk code** in `ClerkPlugin.swift`
- **Updated AppDelegate.swift** with Clerk initialization
- **Configured Info.plist** with URL scheme
- All file-based configuration complete

⏳ **Remaining Steps (Manual in Xcode):**

The following 2 steps **must be completed in Xcode GUI** (cannot be automated):

---

## Step 1: Add Clerk iOS SDK via Swift Package Manager

**STATUS: ⏳ REQUIRED** - This step must be done manually in Xcode

Xcode should be open now. If not, run:
```bash
open ios/App/App.xcworkspace
```

Then:

1. In Xcode menu: **File → Add Package Dependencies...**

2. Enter package URL:
   ```
   https://github.com/clerk/clerk-ios
   ```

3. Click **"Add Package"**

4. Select **"Clerk"** in the package products list

5. Click **"Add Package"** to confirm

---

## Step 2: Add Associated Domains Capability

**STATUS: ⏳ REQUIRED** - This step must be done manually in Xcode

1. In Xcode, select the **"App"** target

2. Go to **"Signing & Capabilities"** tab

3. Click **"+ Capability"**

4. Search for and add **"Associated Domains"**

5. Click **"+"** under Associated Domains

6. Add these entries:
   ```
   webcredentials:complete-bullfrog-71.clerk.accounts.dev
   applinks:complete-bullfrog-71.clerk.accounts.dev
   ```

   **Note:** `webcredentials` is for password autofill, `applinks` is required for OAuth callbacks (Google, Apple, etc.)

---

## Step 3: Build and Test

**STATUS: Ready after completing Steps 1 & 2**

Once you've added the Swift Package and Associated Domains capability:

1. Clean build folder: **Product → Clean Build Folder** (Cmd+Shift+K)

2. Build the app: **Product → Build** (Cmd+B)
   - Build should now succeed with Clerk SDK imported
   - All Swift files are already configured

3. Run on simulator: **Product → Run** (Cmd+R)

4. Test the sign-in flow:
   - Click "Sign In" button in app
   - Native Clerk modal should slide up from bottom
   - Complete authentication
   - App should redirect to dashboard

---

## Verification

After completing these steps, you should see in Xcode console:

```
[ClerkPlugin] Initializing with key: pk_test_Y29tcGxldGUt...
[ClerkPlugin] Presenting sign-in UI
```

And the native Clerk sign-in UI should appear as a modal sheet.

---

## Troubleshooting

### Build Errors

- **"No such module 'Clerk'"**: Re-add the Swift package (Step 1)
- **"Cannot find 'AuthView' in scope"**: Ensure Clerk package is properly added
- **Associated domains error**: Verify domain matches your Clerk instance

### Runtime Issues

- **Sign-in modal doesn't appear**: Check AppDelegate initialization
- **401 errors**: Verify publishable key is correct
- **Redirect issues**: Verify URL scheme in Info.plist

---

## Additional Resources

- [Clerk iOS SDK Documentation](https://clerk.com/docs/ios/getting-started/quickstart)
- [Capacitor iOS Plugin Guide](https://capacitorjs.com/docs/plugins/ios)
