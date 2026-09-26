'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isProcessing: boolean;
}

export default function QrScannerComponent({ onScanSuccess, isProcessing }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);

  useEffect(() => {
    const qrCodeId = 'reader';
    const html5QrCode = new Html5Qrcode(qrCodeId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isProcessing && isScanningRef.current) {
            onScanSuccess(decodedText);
          }
        },
        () => {
          // Silent frame error handling
        }
      )
      .then(() => {
        isScanningRef.current = true;
      })
      .catch((err) => {
        console.error('Camera access error:', err);
      });

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isScanningRef.current = false;
            scannerRef.current?.clear();
          })
          .catch((err) => console.error('Error stopping scanner:', err));
      }
    };
  }, [onScanSuccess, isProcessing]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800">
      <div id="reader" className="w-full aspect-square" />
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-sm font-semibold">
          Verifying Ticket...
        </div>
      )}
    </div>
  );
}