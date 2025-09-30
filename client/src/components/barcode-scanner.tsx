import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
}

export function BarcodeScanner({ onScanSuccess, onScanError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const startScanning = async () => {
    try {
      setCameraError(null);
      const scanner = new Html5Qrcode("barcode-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 }, // Wider for linear barcodes
        },
        (decodedText) => {
          // Successfully scanned
          onScanSuccess(decodedText);
          stopScanning();
          toast({
            title: "Barcode scanned!",
            description: `Found barcode: ${decodedText}`,
          });
        },
        (errorMessage) => {
          // Scanning error (not critical, just no barcode found)
          // console.log("Scanning...", errorMessage);
        }
      );

      setIsScanning(true);
    } catch (err) {
      const error = err as Error;
      setCameraError(error.message || "Failed to access camera");
      if (onScanError) {
        onScanError(error.message);
      }
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(console.error);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Barcode Scanner</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scanner Display */}
          <div 
            id="barcode-reader" 
            className={`w-full ${isScanning ? 'border-2 border-primary rounded-lg overflow-hidden' : ''}`}
            style={{ minHeight: isScanning ? '300px' : '0' }}
          />

          {/* Camera Error */}
          {cameraError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {cameraError}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                className="w-full"
                data-testid="button-start-scan"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="w-full"
                data-testid="button-stop-scan"
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Scanning
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">How to scan:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Allow camera access when prompted</li>
              <li>Point camera at barcode</li>
              <li>Keep barcode centered in the frame</li>
              <li>Scanner will automatically detect the barcode</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
