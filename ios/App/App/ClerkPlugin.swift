import Foundation
import Capacitor
import Clerk
import UIKit
import SwiftUI

/**
 * SwiftUI wrapper for Clerk's AuthView
 * Observes Clerk session state to auto-dismiss on successful authentication
 */
struct ClerkAuthView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var clerk = Clerk.shared
    let onAuthComplete: (Bool) -> Void

    // Track if we've already notified about auth completion
    @State private var hasNotifiedCompletion = false

    var body: some View {
        NavigationView {
            AuthView()
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Close") {
                            dismiss()
                            if !hasNotifiedCompletion {
                                onAuthComplete(clerk.session != nil)
                            }
                        }
                    }
                }
        }
        // Observe session changes - auto-dismiss when user signs in (e.g., after Google OAuth)
        .onChange(of: clerk.session != nil) { wasSignedIn, isSignedIn in
            if isSignedIn && !hasNotifiedCompletion {
                print("[ClerkAuthView] Session detected after OAuth, auto-dismissing")
                hasNotifiedCompletion = true
                // Small delay to let the UI update, then auto-dismiss
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    dismiss()
                    onAuthComplete(true)
                }
            }
        }
    }
}

/**
 * Capacitor plugin for Clerk iOS SDK
 * Provides native authentication UI for iOS
 */
@objc(ClerkPlugin)
public class ClerkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClerkPlugin"
    public let jsName = "ClerkPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentSignUp", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUser", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSignedIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        print("[ClerkPlugin] Plugin loaded successfully")

        Task { @MainActor in
            let signedIn = Clerk.shared.session != nil
            print("[ClerkPlugin] Clerk.shared state: \(signedIn ? "signed in" : "not signed in")")
        }
    }

    /**
     * Initialize Clerk with publishable key
     */
    @objc func initialize(_ call: CAPPluginCall) {
        guard let publishableKey = call.getString("publishableKey") else {
            call.reject("Missing publishable key")
            return
        }

        print("[ClerkPlugin] Initializing with key: \(String(publishableKey.prefix(20)))...")

        // Note: Actual Clerk SDK initialization will be done in AppDelegate
        // This method just validates the key is provided
        call.resolve([
            "success": true,
            "message": "Clerk initialized"
        ])
    }

    /**
     * Present native sign-in UI using Clerk's AuthView
     * Auto-dismisses and resolves when OAuth completes (e.g., Google sign-in)
     */
    @objc func presentSignIn(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Presenting sign-in UI")

        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else {
                call.reject("Unable to get view controller")
                return
            }

            // Track if we've already resolved the call (prevent double-resolution)
            var hasResolved = false

            // Create SwiftUI AuthView and wrap in hosting controller
            let authView = ClerkAuthView(onAuthComplete: { [weak self] wasSuccessful in
                // Prevent double-resolution if both dismiss and onChange fire
                guard !hasResolved else { return }
                hasResolved = true

                print("[ClerkPlugin] Auth completed - signed in: \(wasSuccessful)")

                call.resolve([
                    "success": wasSuccessful,
                    "message": wasSuccessful ? "Sign-in successful" : "Sign-in cancelled",
                    "isSignedIn": wasSuccessful
                ])

                // Notify JS layer that auth state changed
                if wasSuccessful {
                    self?.notifyListeners("authStateChanged", data: ["isSignedIn": true])
                }
            })

            let hostingController = UIHostingController(rootView: authView)
            viewController.present(hostingController, animated: true, completion: nil)
        }
    }

    /**
     * Present native sign-up UI (same as sign-in in Clerk)
     */
    @objc func presentSignUp(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Presenting sign-up UI")

        // Clerk's AuthView handles both sign-in and sign-up
        self.presentSignIn(call)
    }

    /**
     * Sign out current user
     */
    @objc func signOut(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Signing out")

        Task {
            do {
                try await Clerk.shared.signOut()
                print("[ClerkPlugin] Sign-out completed successfully")
                call.resolve([
                    "success": true,
                    "message": "Signed out successfully"
                ])
            } catch {
                print("[ClerkPlugin] Sign-out error: \(error)")
                call.reject("Sign-out failed: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Get current user information
     */
    @objc func getUser(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Getting user")

        Task { @MainActor in
            guard let user = Clerk.shared.user else {
                call.resolve([
                    "user": NSNull(),
                    "message": "No user signed in"
                ])
                return
            }

            // Convert user to dictionary
            let userData: [String: Any] = [
                "id": user.id,
                "emailAddress": user.emailAddresses.first?.emailAddress ?? "",
                "firstName": user.firstName ?? "",
                "lastName": user.lastName ?? "",
                "imageUrl": user.imageUrl
            ]

            call.resolve([
                "user": userData
            ])
        }
    }

    /**
     * Check if user is signed in
     */
    @objc func isSignedIn(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Checking if signed in")

        Task { @MainActor in
            let signedIn = Clerk.shared.session != nil
            print("[ClerkPlugin] User is \(signedIn ? "signed in" : "not signed in")")

            call.resolve([
                "isSignedIn": signedIn
            ])
        }
    }

    /**
     * Get session token for API authentication
     */
    @objc func getToken(_ call: CAPPluginCall) {
        print("[ClerkPlugin] Getting session token")

        Task { @MainActor in
            guard let session = Clerk.shared.session else {
                call.resolve([
                    "token": NSNull(),
                    "message": "No active session"
                ])
                return
            }

            do {
                // Get the session token from Clerk
                let tokenResource = try await session.getToken()

                guard let token = tokenResource else {
                    call.resolve([
                        "token": NSNull(),
                        "message": "No token available"
                    ])
                    return
                }

                print("[ClerkPlugin] Token retrieved successfully")

                call.resolve([
                    "token": token.jwt
                ])
            } catch {
                print("[ClerkPlugin] Failed to get token: \(error)")
                call.reject("Failed to get token: \(error.localizedDescription)")
            }
        }
    }
}
