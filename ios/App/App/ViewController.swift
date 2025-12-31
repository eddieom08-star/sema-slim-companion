import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ClerkPlugin())
        print("[ViewController] ClerkPlugin registered with Capacitor bridge")
    }
}
