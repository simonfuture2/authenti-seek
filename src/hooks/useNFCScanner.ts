import { useState, useCallback, useEffect } from "react";

interface NFCScanResult {
  serialNumber: string;
  message?: string;
}

interface UseNFCScannerReturn {
  isSupported: boolean;
  isScanning: boolean;
  error: string | null;
  lastScannedId: string | null;
  startScan: () => Promise<string | null>;
  stopScan: () => void;
}

// Extend Window to include NDEFReader for Web NFC API
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReader;
  }
  
  interface NDEFReader {
    scan: () => Promise<void>;
    addEventListener: (event: string, callback: (event: NDEFReadingEvent) => void) => void;
    removeEventListener: (event: string, callback: (event: NDEFReadingEvent) => void) => void;
  }
  
  interface NDEFReadingEvent {
    serialNumber: string;
    message?: {
      records: Array<{
        recordType: string;
        data?: ArrayBuffer;
        toText?: () => string;
      }>;
    };
  }
}

/**
 * Hook for scanning NFC tags using the Web NFC API.
 * 
 * Browser support:
 * - Chrome for Android 89+ (requires HTTPS)
 * - Samsung Internet 15+
 * - Not supported: iOS Safari, Desktop browsers
 * 
 * @returns NFC scanning utilities and state
 */
export function useNFCScanner(): UseNFCScannerReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [reader, setReader] = useState<NDEFReader | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Check for NFC support on mount
  useEffect(() => {
    const checkSupport = () => {
      if ("NDEFReader" in window) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
      }
    };
    
    checkSupport();
  }, []);

  const startScan = useCallback(async (): Promise<string | null> => {
    setError(null);
    setLastScannedId(null);

    if (!isSupported) {
      setError("NFC is not supported on this device/browser. Please use Chrome on Android.");
      return null;
    }

    // Check if we're on HTTPS (required for Web NFC)
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("NFC requires a secure connection (HTTPS).");
      return null;
    }

    try {
      setIsScanning(true);
      
      const NDEFReaderClass = window.NDEFReader;
      if (!NDEFReaderClass) {
        throw new Error("NDEFReader not available");
      }
      
      const ndefReader = new NDEFReaderClass();
      setReader(ndefReader);

      const controller = new AbortController();
      setAbortController(controller);

      return new Promise((resolve, reject) => {
        const handleReading = (event: NDEFReadingEvent) => {
          const serialNumber = event.serialNumber || "";
          
          // Try to get readable text from the tag
          let tagContent = serialNumber;
          if (event.message?.records) {
            for (const record of event.message.records) {
              if (record.recordType === "text" && record.toText) {
                tagContent = record.toText();
                break;
              }
            }
          }
          
          // Format the serial number (remove colons if present, uppercase)
          const formattedId = tagContent
            .replace(/:/g, "")
            .toUpperCase()
            .trim();
          
          setLastScannedId(formattedId);
          setIsScanning(false);
          
          // Cleanup
          ndefReader.removeEventListener("reading", handleReading);
          
          resolve(formattedId);
        };

        const handleError = () => {
          setError("Failed to read NFC tag. Please try again.");
          setIsScanning(false);
          reject(new Error("NFC read error"));
        };

        ndefReader.addEventListener("reading", handleReading);
        ndefReader.addEventListener("readingerror", handleError);

        // Start scanning
        ndefReader.scan().catch((err: Error) => {
          setIsScanning(false);
          
          if (err.name === "NotAllowedError") {
            setError("NFC permission denied. Please allow NFC access.");
          } else if (err.name === "NotSupportedError") {
            setError("NFC is not supported on this device.");
          } else {
            setError(`NFC error: ${err.message}`);
          }
          
          reject(err);
        });

        // Set a timeout for the scan
        setTimeout(() => {
          if (isScanning) {
            setIsScanning(false);
            setError("Scan timed out. Please try again.");
            resolve(null);
          }
        }, 30000); // 30 second timeout
      });
    } catch (err) {
      setIsScanning(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to start NFC scan";
      setError(errorMessage);
      return null;
    }
  }, [isSupported, isScanning]);

  const stopScan = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setReader(null);
    setIsScanning(false);
  }, [abortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return {
    isSupported,
    isScanning,
    error,
    lastScannedId,
    startScan,
    stopScan,
  };
}

/**
 * Format NFC tag ID for display
 */
export function formatNFCTagId(tagId: string): string {
  // Format as XX:XX:XX:XX:XX:XX:XX pattern
  const clean = tagId.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  const pairs = clean.match(/.{1,2}/g) || [];
  return pairs.join(":");
}

/**
 * Normalize NFC tag ID for comparison (remove formatting)
 */
export function normalizeNFCTagId(tagId: string): string {
  return tagId.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
}
