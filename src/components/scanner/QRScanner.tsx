import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw, Keyboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Try to enumerate cameras, but don't block scanner if this fails
    // Some mobile browsers support getUserMedia but not enumerateDevices
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setHasPermission(true);
        } else {
          // No cameras enumerated, but we can still try facingMode
          setHasPermission(true);
        }
      })
      .catch(() => {
        // getCameras failed, but we can still attempt to start with facingMode
        setHasPermission(true);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (!containerRef.current) return;

    // Stop any existing scanner first
    await stopScanner();

    try {
      const scanner = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      // Use facingMode constraint instead of camera ID for better mobile compatibility
      // Camera IDs can be stale or cause NotReadableError on many Android devices
      const cameraConfig = cameras.length > 1 && currentCameraIndex > 0
        ? { deviceId: { exact: cameras[currentCameraIndex].id } }
        : { facingMode: "environment" };

      const qrboxSize = Math.min(
        containerRef.current.clientWidth * 0.7,
        250
      );

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      console.warn("QR Scanner camera error:", errorMessage);

      // If using facingMode failed, try with specific camera ID as fallback
      if (cameras.length > 0 && !scannerRef.current) {
        try {
          const fallbackScanner = new Html5Qrcode("qr-reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
          scannerRef.current = fallbackScanner;

          const qrboxSize = Math.min(
            (containerRef.current?.clientWidth ?? 300) * 0.7,
            250
          );

          await fallbackScanner.start(
            cameras[0].id,
            {
              fps: 10,
              qrbox: { width: qrboxSize, height: qrboxSize },
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );

          setIsScanning(true);
          return;
        } catch {
          // Fallback also failed
        }
      }

      // All attempts failed — fall back to manual input
      setHasPermission(false);
      onError?.(errorMessage);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    onScan(decodedText);
  };

  const handleManualSubmit = () => {
    const trimmed = manualInput.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualInput("");
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    await stopScanner();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    setTimeout(() => {
      startScanner();
    }, 100);
  };

  // Manual input section (shared between camera-denied and fallback)
  const ManualInputSection = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Keyboard className="h-4 w-4" />
        <span>Enter serial number or certificate ID manually</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Serial number or certificate ID..."
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          className="flex-1"
        />
        <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (hasPermission === false) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-muted/30 border border-border p-8 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <CameraOff className="h-7 w-7 text-destructive" />
          </div>
          <p className="font-medium mb-1">Camera unavailable</p>
          <p className="text-sm text-muted-foreground mb-4">
            Camera access was denied or isn't available on this device.
            <br />
            You can enter details manually below instead.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHasPermission(null);
              Html5Qrcode.getCameras()
                .then((devices) => {
                  if (devices && devices.length > 0) {
                    setCameras(devices);
                    setHasPermission(true);
                  } else {
                    setHasPermission(false);
                  }
                })
                .catch(() => setHasPermission(false));
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Camera
          </Button>
        </div>
        <ManualInputSection />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative aspect-square rounded-xl overflow-hidden bg-black/90 border border-border"
      >
        {!isScanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <p className="text-muted-foreground text-center text-sm mb-4">
              Ready to scan QR code
            </p>
            <Button onClick={startScanner} className="gap-2">
              <Camera className="h-4 w-4" />
              Start Scanning
            </Button>
          </div>
        ) : (
          <>
            <div id="qr-reader" className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-pulse top-1/2" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isScanning && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={stopScanner} className="flex-1 gap-2">
            <CameraOff className="h-4 w-4" />
            Stop
          </Button>
          {cameras.length > 1 && (
            <Button variant="outline" onClick={switchCamera} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Switch Camera
            </Button>
          )}
        </div>
      )}

      {/* Manual input toggle & form */}
      {!isScanning && (
        <div className="space-y-3">
          {!showManualInput ? (
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 inline-link"
            >
              Or enter serial number manually →
            </button>
          ) : (
            <ManualInputSection />
          )}
        </div>
      )}
    </div>
  );
}
