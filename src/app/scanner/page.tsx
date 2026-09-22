'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../lib/utils/client';

interface ScanResult {
  code: string;
  status: 'valid' | 'already_used' | 'invalid';
  attendeeName?: string;
  tierName?: string;
  checkedInAt?: string;
}

export default function GateScannerPage() {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanStats, setScanStats] = useState({ checkedIn: 142, total: 300 });
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize Camera QR Scanner on Mount
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        handleValidation(decodedText);
      },
      (errorMessage) => {
        // Scanner searching for code
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch((error) => console.error('Failed to clear scanner:', error));
    };
  }, []);

  // Validate Ticket Logic (Supabase integration + Mock Fallback)
  // Inside src/app/scanner/page.tsx

const handleValidation = async (codeToVerify: string) => {
  if (!codeToVerify.trim() || loading) return;

  setLoading(true);
  setScanResult(null);

  try {
    // Invoke the atomic Supabase RPC function
    const { data, error } = await supabase.rpc('check_in_ticket', {
      p_ticket_code: codeToVerify.trim(),
    });

    if (error || !data) {
      setScanResult({
        code: codeToVerify,
        status: 'invalid',
      });
    } else {
      setScanResult({
        code: codeToVerify,
        status: data.status, // 'valid' | 'already_used' | 'invalid'
        attendeeName: data.attendee_name,
        tierName: data.tier_name,
        checkedInAt: data.checked_in_at,
      });

      if (data.status === 'valid') {
        setScanStats((prev) => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
      }
    }
  } catch (err) {
    setScanResult({ code: codeToVerify, status: 'invalid' });
  } finally {
    setLoading(false);
    setManualCode('');
  }
};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto p-4 font-sans">
      {/* Header & Gate Stats */}
      <header className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gate Control</span>
            <h1 className="text-lg font-black text-white">SUG Grand Campus Rave</h1>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Checked In</span>
            <span className="text-sm font-black text-emerald-400">{scanStats.checkedIn} / {scanStats.total}</span>
          </div>
        </div>
      </header>

      {/* Validation Banner Overlay */}
      {scanResult && (
        <div
          className={`p-5 rounded-2xl text-center space-y-2 border-2 animate-in zoom-in-95 duration-150 ${
            scanResult.status === 'valid'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : scanResult.status === 'already_used'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-rose-500/20 border-rose-500 text-rose-300'
          }`}
        >
          {scanResult.status === 'valid' && (
            <>
              <div className="w-12 h-12 bg-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                ✓
              </div>
              <h2 className="text-xl font-black text-white">ENTRY ALLOWED</h2>
              <p className="text-sm font-bold text-slate-100">{scanResult.attendeeName}</p>
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-400">{scanResult.tierName}</p>
            </>
          )}

          {scanResult.status === 'already_used' && (
            <>
              <div className="w-12 h-12 bg-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                ⚠️
              </div>
              <h2 className="text-xl font-black text-white">ALREADY CHECKED IN</h2>
              <p className="text-xs text-slate-200">Used at {scanResult.checkedInAt}</p>
              <p className="text-xs font-bold text-amber-300">{scanResult.attendeeName}</p>
            </>
          )}

          {scanResult.status === 'invalid' && (
            <>
              <div className="w-12 h-12 bg-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                ✕
              </div>
              <h2 className="text-xl font-black text-white">INVALID TICKET</h2>
              <p className="text-xs text-rose-200">Code "{scanResult.code}" not found in system</p>
            </>
          )}

          <button
            onClick={() => setScanResult(null)}
            className="mt-3 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700"
          >
            Scan Next Ticket
          </button>
        </div>
      )}

      {/* Camera Viewfinder */}
      {!scanResult && (
        <div className="space-y-4 my-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2 relative">
            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden"></div>
            <p className="text-center text-[11px] text-slate-400 py-2">
              Point camera at attendee's phone screen
            </p>
          </div>

          {/* Manual Code Entry Fallback */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="block text-[10px] font-bold uppercase text-slate-400">
              Dim light / Broken screen? Enter Code Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. PASS-A1B2C3"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 uppercase"
              />
              <button
                onClick={() => handleValidation(manualCode)}
                disabled={loading || !manualCode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
              >
                {loading ? '...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="pt-4 border-t border-slate-800 text-center">
        <a href="/" className="text-xs text-slate-400 hover:text-white transition font-medium">
          ← Return to Event Discovery
        </a>
      </footer>
    </main>
  );
}