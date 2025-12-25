# Clerk Native iOS Setup - Manual Steps Required

## ✅ Completed (Automated)

The following have been completed automatically:

1. ✅ Created `ClerkPlugin.swift` - Native Capacitor plugin bridge
2. ✅ Updated `AppDelegate.swift` - Added Clerk initialization placeholders
3. ✅ Configured `Info.plist` - URL scheme already present
4. ✅ Re-enabled ClerkNative in `main.tsx` - Plugin initialization restored

## ⏳ Manual Steps Required in Xcode

You must complete the following 2 steps in Xcode:

---

### Step 1: Add Clerk iOS SDK via Swift Package Manager

**⚠️ This step MUST be done in Xcode GUI - cannot be automated**

1. Open the Xcode workspace:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. In Xcode menu bar: **File → Add Package Dependencies...**

3. In the search bar, paste this URL:
   ```
   https://github.com/clerk/clerk-ios
   ```

4. Click **"Add Package"**

5. When prompted, select **"Clerk"** in the package products list

6. Click **"Add Package"** to confirm

7. Wait for Xcode to download and integrate the package

---

### Step 2: Add Associated Domains Capability

**⚠️ This step MUST be done in Xcode GUI - cannot be automated**

1. In Xcode project navigator, select the **"App"** target

2. Click the **"Signing & Capabilities"** tab at the top

3. Click the **"+ Capability"** button

4. Search for **"Associated Domains"** and double-click to add it

5. Under the Associated Domains section, click the **"+"** button

6. Add this domain:
   ```
   webcredentials:complete-bullfrog-71.clerk.accounts.dev
   ```

---

### Step 3: Uncomment Clerk Initialization in AppDelegate

After adding the Swift package, open `AppDelegate.swift` and uncomment these lines:

```swift
import Clerk  // <-- Uncomment this line
Clerk.configure(publishableKey: "pk_test_Y29tcGxldGUtYnVsbGZyb2ctNzEuY2xlcmsuYWNjb3VudHMuZGV2JA")  // <-- Uncomment this line
```

The full function should look like:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.

    import Clerk  // Now uncommented
    Clerk.configure(publishableKey: "pk_test_Y29tcGxldGUtYnVsbGZyb2ctNzEuY2xlcmsuYWNjb3VudHMuZGV2JA")  // Now uncommented

    print("[AppDelegate] App launched")
    return true
}
```

---

### Step 4: Update ClerkPlugin.swift with Native Implementation

After adding the Swift package, update `ios/App/App/ClerkPlugin.swift` to use the actual Clerk SDK methods. Replace the placeholder methods with real implementations.

---

### Step 5: Build and Test

1. Clean build folder: **Product → Clean Build Folder** (⌘⇧K)

2. Build the app: **Product → Build** (⌘B)
   - Build should succeed now that Clerk SDK is imported
   - Fix any import errors if they appear

3. Run on simulator: **Product → Run** (⌘R)

4. Test the sign-in flow:
   - App should load to landing page
   - Tap "Sign In" button
   - Native Clerk modal should slide up from bottom (iOS native UI)
   - Complete authentication
   - Should redirect to dashboard

---

## Expected Behavior

### Before Adding Swift Package
- App loads but shows: "Clerk iOS SDK not yet integrated"
- Web-based Clerk authentication works as fallback

### After Adding Swift Package
- Native Clerk sign-in modal appears (iOS native UI)
- Better user experience with native iOS authentication
- Seamless integration with iOS keychain
- Support for Face ID/Touch ID (when configured)

---

## Verification

After completing all steps, you should see in Xcode console:

```
[AppDelegate] App launched
[ClerkPlugin] Initializing with key: pk_test_Y29tcGxldGUt...
[ClerkPlugin] Presenting sign-in UI
```

And the native Clerk sign-in UI should appear as a modal sheet with iOS-native design.

---

## Troubleshooting

### Build Errors

**"No such module 'Clerk'"**
- Solution: Re-add the Swift package (Step 1)
- Verify the package was added to the App target

**"Cannot find 'AuthView' in scope"**
- Solution: Clean build folder and rebuild
- Verify Clerk package is properly imported

**"Associated domains error"**
- Solution: Verify domain exactly matches your Clerk instance
- Check for typos: `webcredentials:complete-bullfrog-71.clerk.accounts.dev`

### Runtime Issues

**Sign-in modal doesn't appear**
- Check AppDelegate initialization is uncommented
- Verify ClerkPlugin.swift has real implementations (not placeholders)
- Check console for error messages

**401 errors**
- Verify publishable key is correct in AppDelegate.swift
- Key: `pk_test_Y29tcGxldGUtYnVsbGZyb2ctNzEuY2xlcmsuYWNjb3VudHMuZGV2JA`

**Redirect issues after sign-in**
- Verify URL scheme in Info.plist: `clerk.com.semaslim.app`
- Check ClerkProvider configuration in main.tsx

---

## Additional Resources

- [Clerk iOS SDK Documentation](https://clerk.com/docs/quickstarts/ios)
- [Clerk iOS GitHub](https://github.com/clerk/clerk-ios)
- [Capacitor iOS Plugin Guide](https://capacitorjs.com/docs/plugins/ios)

---

## Current Status Summary

| Step | Status | Notes |
|------|--------|-------|
| Create ClerkPlugin.swift | ✅ Done | Bridge created with placeholder methods |
| Update AppDelegate.swift | ✅ Done | Initialization code added (commented out) |
| Configure Info.plist | ✅ Done | URL scheme already configured |
| Re-enable ClerkNative | ✅ Done | Initialization in main.tsx restored |
| **Add Clerk iOS SDK** | ⏳ **Manual** | **Must be done in Xcode** |
| **Add Associated Domains** | ⏳ **Manual** | **Must be done in Xcode** |
| Uncomment Clerk Init | ⏳ Pending | After Swift package is added |
| Update Plugin Implementation | ⏳ Pending | After Swift package is added |

**Next Action:** Open Xcode and complete Steps 1 & 2 above.
