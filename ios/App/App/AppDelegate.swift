import UIKit
import WebKit
import Security
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Detect fresh install — UserDefaults is wiped on uninstall, Keychain is NOT
        let defaults = UserDefaults.standard
        let hasLaunchedKey = "com.semaslim.hasLaunchedBefore"

        if !defaults.bool(forKey: hasLaunchedKey) {
            // First launch after install/reinstall
            // Clear Clerk Keychain items so user must sign in again
            // Scoped to generic passwords only (Clerk uses SimpleKeychain)
            let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword]
            SecItemDelete(query as CFDictionary)
            print("[AppDelegate] Fresh install — cleared Keychain generic passwords (Clerk auth reset)")

            // Clear all webview data (caches, service workers, etc.)
            let sem = DispatchSemaphore(value: 0)
            WKWebsiteDataStore.default().removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date.distantPast
            ) {
                sem.signal()
            }
            _ = sem.wait(timeout: .now() + 2.0)
            URLCache.shared.removeAllCachedResponses()
            print("[AppDelegate] Fresh install — cleared webview data")

            defaults.set(true, forKey: hasLaunchedKey)
        }

        // On EVERY launch: clear caches and service workers (not cookies/localStorage)
        // This ensures fresh JS/CSS is always loaded without breaking auth persistence
        let cacheTypes: Set<String> = [
            WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeOfflineWebApplicationCache,
            WKWebsiteDataTypeFetchCache,
            WKWebsiteDataTypeServiceWorkerRegistrations,
        ]
        let cacheSem = DispatchSemaphore(value: 0)
        WKWebsiteDataStore.default().removeData(ofTypes: cacheTypes, modifiedSince: Date.distantPast) {
            cacheSem.signal()
        }
        _ = cacheSem.wait(timeout: .now() + 2.0)
        URLCache.shared.removeAllCachedResponses()

        print("[AppDelegate] App launched — caches cleared")
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
