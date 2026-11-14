import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, RefreshCw, XCircle } from 'lucide-react';
import Button from '../ui/Button';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel?: () => void;
}

export default function QRScanner({ onScanSuccess, onCancel }: QRScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scannerId = 'qr-reader-container';

    try {
      const scanner = new Html5QrcodeScanner(
        scannerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false,
      );

      scanner.render(
        (decodedText) => {
          scanner.clear();
          onScanSuccess(decodedText);
        },
        (_errorMessage) => {
          // Scanner frame decode errors are frequent and benign, ignore them
        },
      );

      scannerRef.current = scanner;
      setIsScannerReady(true);
    } catch (err: unknown) {
      console.error('Failed to initialize QR scanner:', err);
      setErrorMsg('Camera access unavailable or blocked. You can enter the code manually below.');
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.warn('QR scanner clear error:', e));
      }
    };
  }, [onScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-surface rounded-xl border border-gray-100 shadow-sm max-w-md mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary text-sm">Scan Bin QR Code</h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMsg ? (
        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 mb-3 w-full">
          {errorMsg}
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg bg-gray-900 aspect-square flex items-center justify-center relative">
          <div id="qr-reader-container" className="w-full h-full" />
          {!isScannerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-accent" />
              Initializing camera...
            </div>
          )}
        </div>
      )}

      {/* Manual Code Input fallback */}
      <form onSubmit={handleManualSubmit} className="mt-4 w-full pt-3 border-t border-border">
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Or Enter Bin Code / URL Manually
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. BIN-UUID or paste URL"
            className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" size="sm" disabled={!manualCode.trim()}>
            Use
          </Button>
        </div>
      </form>
    </div>
  );
}
