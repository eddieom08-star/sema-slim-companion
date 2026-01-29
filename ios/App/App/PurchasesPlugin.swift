import Foundation
import Capacitor
import RevenueCat
import StoreKit

/**
 * Capacitor plugin for RevenueCat iOS SDK
 * Provides native in-app purchase functionality with StoreKit 2
 */
@objc(PurchasesPlugin)
public class PurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurchasesPlugin"
    public let jsName = "PurchasesPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCustomerInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOfferings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncPurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkTrialEligibility", returnType: CAPPluginReturnPromise)
    ]

    private var isConfigured = false

    public override func load() {
        print("[PurchasesPlugin] Plugin loaded")
    }

    /**
     * Configure RevenueCat with API key
     */
    @objc func configure(_ call: CAPPluginCall) {
        guard let apiKey = call.getString("apiKey") else {
            call.reject("Missing RevenueCat API key")
            return
        }

        let userId = call.getString("userId")

        print("[PurchasesPlugin] Configuring with API key: \(String(apiKey.prefix(10)))...")

        Purchases.logLevel = .debug

        if let userId = userId {
            Purchases.configure(withAPIKey: apiKey, appUserID: userId)
        } else {
            Purchases.configure(withAPIKey: apiKey)
        }

        isConfigured = true

        // Set up customer info listener
        Purchases.shared.delegate = self

        call.resolve([
            "success": true,
            "message": "RevenueCat configured successfully"
        ])
    }

    /**
     * Login user to RevenueCat
     */
    @objc func login(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured. Call configure() first.")
            return
        }

        guard let userId = call.getString("userId") else {
            call.reject("Missing userId")
            return
        }

        print("[PurchasesPlugin] Logging in user: \(userId)")

        Task {
            do {
                let (customerInfo, created) = try await Purchases.shared.logIn(userId)
                print("[PurchasesPlugin] Login successful. Created: \(created)")

                call.resolve([
                    "success": true,
                    "created": created,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])
            } catch {
                print("[PurchasesPlugin] Login error: \(error)")
                call.reject("Login failed: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Logout user from RevenueCat
     */
    @objc func logout(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        print("[PurchasesPlugin] Logging out")

        Task {
            do {
                let customerInfo = try await Purchases.shared.logOut()
                call.resolve([
                    "success": true,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])
            } catch {
                print("[PurchasesPlugin] Logout error: \(error)")
                call.reject("Logout failed: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Get current customer info (entitlements)
     */
    @objc func getCustomerInfo(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        print("[PurchasesPlugin] Getting customer info")

        Task {
            do {
                let customerInfo = try await Purchases.shared.customerInfo()
                call.resolve([
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])
            } catch {
                print("[PurchasesPlugin] Get customer info error: \(error)")
                call.reject("Failed to get customer info: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Get available offerings (products)
     */
    @objc func getOfferings(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        print("[PurchasesPlugin] Getting offerings")

        Task {
            do {
                let offerings = try await Purchases.shared.offerings()
                var result: [String: Any] = [:]

                if let current = offerings.current {
                    result["current"] = self.offeringToDict(current)
                }

                var allOfferings: [[String: Any]] = []
                for (_, offering) in offerings.all {
                    allOfferings.append(self.offeringToDict(offering))
                }
                result["all"] = allOfferings

                call.resolve(result)
            } catch {
                print("[PurchasesPlugin] Get offerings error: \(error)")
                call.reject("Failed to get offerings: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Purchase a product
     */
    @objc func purchase(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        let offeringId = call.getString("offeringId")

        print("[PurchasesPlugin] Purchasing product: \(productId)")

        Task {
            do {
                // Get the package from offerings if offeringId provided
                var packageToPurchase: Package?

                if let offeringId = offeringId {
                    let offerings = try await Purchases.shared.offerings()
                    if let offering = offerings.all[offeringId] {
                        packageToPurchase = offering.availablePackages.first { $0.storeProduct.productIdentifier == productId }
                    }
                }

                // If no package found, try to get product directly
                if packageToPurchase == nil {
                    let offerings = try await Purchases.shared.offerings()
                    for (_, offering) in offerings.all {
                        if let pkg = offering.availablePackages.first(where: { $0.storeProduct.productIdentifier == productId }) {
                            packageToPurchase = pkg
                            break
                        }
                    }
                }

                guard let package = packageToPurchase else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let (_, customerInfo, userCancelled) = try await Purchases.shared.purchase(package: package)

                if userCancelled {
                    call.resolve([
                        "success": false,
                        "cancelled": true,
                        "message": "Purchase cancelled by user"
                    ])
                    return
                }

                print("[PurchasesPlugin] Purchase successful")

                call.resolve([
                    "success": true,
                    "cancelled": false,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])

                // Notify JS layer
                self.notifyListeners("purchaseCompleted", data: [
                    "productId": productId,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])

            } catch {
                print("[PurchasesPlugin] Purchase error: \(error)")

                if let purchasesError = error as? RevenueCat.ErrorCode {
                    switch purchasesError {
                    case .purchaseCancelledError:
                        call.resolve([
                            "success": false,
                            "cancelled": true,
                            "message": "Purchase cancelled"
                        ])
                    default:
                        call.reject("Purchase failed: \(error.localizedDescription)")
                    }
                } else {
                    call.reject("Purchase failed: \(error.localizedDescription)")
                }
            }
        }
    }

    /**
     * Restore previous purchases
     */
    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        print("[PurchasesPlugin] Restoring purchases")

        Task {
            do {
                let customerInfo = try await Purchases.shared.restorePurchases()
                print("[PurchasesPlugin] Restore successful")

                call.resolve([
                    "success": true,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])
            } catch {
                print("[PurchasesPlugin] Restore error: \(error)")
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Sync purchases with RevenueCat (useful after web purchases)
     */
    @objc func syncPurchases(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        print("[PurchasesPlugin] Syncing purchases")

        Task {
            do {
                let customerInfo = try await Purchases.shared.syncPurchases()
                print("[PurchasesPlugin] Sync successful")

                call.resolve([
                    "success": true,
                    "customerInfo": self.customerInfoToDict(customerInfo)
                ])
            } catch {
                print("[PurchasesPlugin] Sync error: \(error)")
                call.reject("Sync failed: \(error.localizedDescription)")
            }
        }
    }

    /**
     * Check trial eligibility for products
     */
    @objc func checkTrialEligibility(_ call: CAPPluginCall) {
        guard isConfigured else {
            call.reject("RevenueCat not configured")
            return
        }

        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds array")
            return
        }

        print("[PurchasesPlugin] Checking trial eligibility for: \(productIds)")

        Task {
            do {
                let eligibility = await Purchases.shared.checkTrialOrIntroDiscountEligibility(productIdentifiers: productIds)

                var result: [String: String] = [:]
                for (productId, status) in eligibility {
                    switch status.status {
                    case .eligible:
                        result[productId] = "eligible"
                    case .ineligible:
                        result[productId] = "ineligible"
                    case .noIntroOfferExists:
                        result[productId] = "no_intro_offer"
                    case .unknown:
                        result[productId] = "unknown"
                    @unknown default:
                        result[productId] = "unknown"
                    }
                }

                call.resolve([
                    "eligibility": result
                ])
            }
        }
    }

    // MARK: - Helper Methods

    private func customerInfoToDict(_ info: CustomerInfo) -> [String: Any] {
        var entitlements: [String: Any] = [:]

        for (id, entitlement) in info.entitlements.all {
            entitlements[id] = [
                "isActive": entitlement.isActive,
                "willRenew": entitlement.willRenew,
                "productIdentifier": entitlement.productIdentifier,
                "expirationDate": entitlement.expirationDate?.iso8601String ?? NSNull(),
                "isSandbox": entitlement.isSandbox
            ]
        }

        var activeSubscriptions: [String] = []
        for productId in info.activeSubscriptions {
            activeSubscriptions.append(productId)
        }

        return [
            "originalAppUserId": info.originalAppUserId,
            "entitlements": entitlements,
            "activeSubscriptions": activeSubscriptions,
            "firstSeen": info.firstSeen.iso8601String,
            "latestExpirationDate": info.latestExpirationDate?.iso8601String ?? NSNull()
        ]
    }

    private func offeringToDict(_ offering: Offering) -> [String: Any] {
        var packages: [[String: Any]] = []

        for package in offering.availablePackages {
            packages.append([
                "identifier": package.identifier,
                "packageType": package.packageType.rawValue,
                "product": [
                    "identifier": package.storeProduct.productIdentifier,
                    "title": package.storeProduct.localizedTitle,
                    "description": package.storeProduct.localizedDescription,
                    "price": package.storeProduct.price as NSNumber,
                    "priceString": package.storeProduct.localizedPriceString,
                    "currencyCode": package.storeProduct.currencyCode ?? "USD"
                ]
            ])
        }

        return [
            "identifier": offering.identifier,
            "serverDescription": offering.serverDescription,
            "packages": packages
        ]
    }
}

// MARK: - PurchasesDelegate

extension PurchasesPlugin: PurchasesDelegate {
    public func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        print("[PurchasesPlugin] Customer info updated")

        notifyListeners("customerInfoUpdated", data: [
            "customerInfo": customerInfoToDict(customerInfo)
        ])
    }
}

// MARK: - Date Extension

extension Date {
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: self)
    }
}
