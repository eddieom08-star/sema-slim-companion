import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ClerkPlugin())
        bridge?.registerPluginInstance(PurchasesPlugin())
        print("[ViewController] ClerkPlugin and PurchasesPlugin registered with Capacitor bridge")
    }
}
