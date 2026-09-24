'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ResultStatus = 'success' | 'already_used' | 'invalid' | 'wrong_event' | 'error';

interface ScanResult {
  status: ResultStatus;
  message: string;
  holder?: string;
}

interface EventRow {
  id: string;
  title: string;
  date?: string;
}

const RESULT_STYLES: Record<ResultStatus, { bg: string; icon: string; title: string }> = {
  success: { bg: 'bg-emerald-600', icon: '\u2713', title: 'VALID' },
  already_used: { bg: 'bg-amber-500', icon: '!', title: 'ALREADY USED' },
  invalid: { bg: 'bg-red-600', icon: '\u2715', title: 'INVALID' },
  wrong_event: { bg: 'bg-red-600', icon: '\u2715', title: 'WRONG EVENT' },
  error: { bg: 'bg-slate-700', icon: '!', title: 'ERROR' },
};

const RESULT_VISIBLE_MS = 2500;
const DUPLICATE_WINDOW_MS = 4000;

export default function ScanPage() {
  const [passcode, setPasscode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [gateError, setGateError] = useState('');

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState('');

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [admitted, setAdmitted] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef('');
  const passcodeRef = useRef('');

  // Keep refs in sync so the camera callback always sees current values
  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);
  useEffect(() => {
    passcodeRef.current = passcode;
  }, [passcode]);

  // Restore passcode for this browser session
  useEffect(() => {
    const saved = sessionStorage.getItem('checkin_passcode');
    if (saved) {
      setPasscode(saved);
      passcodeRef.current = saved;
      setUnlocked(true);
    }
  }, []);

  // Load events (only the columns we need, no banners)
  useEffect(() => {
    if (!unlocked) return;
    supabase
      .from('events')
      .select('id, title, date')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error('Could not load events:', error.message);
          return;
        }
        setEvents((data as EventRow[]) ?? []);
      });
  }, [unlocked]);

  // Stop camera when leaving the page
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, []);

  const showResult = (r: ScanResult) => {
    setResult(r);
    if (r.status === 'success') {
      setAdmitted((n) => n + 1);
      navigator.vibrate?.(120);
    } else {
      setRejected((n) => n + 1);
      navigator.vibrate?.([200, 100, 200]);
    }
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(dismissResult, RESULT_VISIBLE_MS);
  };

  const dismissResult = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setResult(null);
    busyRef.current = false;
  };

  const lockAgain = (msg: string) => {
    sessionStorage.removeItem('checkin_passcode');
    stopScanner();
    setUnlocked(false);
    setGateError(msg);
    busyRef.current = false;
  };

  const submitCode = async (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current) return;

    if (!eventIdRef.current) {
      busyRef.current = true;
      showResult({ status: 'error', message: 'Pick an event first.' });
      return;
    }

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.at < DUPLICATE_WINDOW_MS) return;

    busyRef.current = true;
    lastScanRef.current = { code, at: now };

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-checkin-passcode': passcodeRef.current,
        },
        body: JSON.stringify({ code, eventId: eventIdRef.current }),
      });

      if (res.status === 401) {
        lockAgain('Wrong passcode. Try again.');
        return;
      }

      const data = await res.json();
      showResult({
        status: (data.status as ResultStatus) ?? 'error',
        message: data.message ?? 'Something went wrong.',
        holder: data.holder,
      });
    } catch {
      lastScanRef.current = null; // allow an immediate retry
      showResult({ status: 'error', message: 'Network error. Scan again.' });
    }
  };

  const startScanner = async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        (decodedText: string) => {
          submitCode(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      scannerRef.current = null;
      setCameraError(
        'Could not open the camera. Allow camera access in your browser settings, and make sure no other app is using it.'
      );
    }
  };

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        // already stopped
      }
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    sessionStorage.setItem('checkin_passcode', passcode.trim());
    passcodeRef.current = passcode.trim();
    setGateError('');
    setUnlocked(true);
  };

  // ---------- Passcode gate ----------
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4"
        >
          <div>
            <h1 className="text-lg font-black text-white">Door check-in</h1>
            <p className="text-xs text-slate-400 mt-1">Enter the organizer passcode to start scanning.</p>
          </div>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {gateError && <p className="text-xs text-red-400 font-semibold">{gateError}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
          >
            Unlock scanner
          </button>
        </form>
      </div>
    );
  }

  // ---------- Scanner ----------
  const style = result ? RESULT_STYLES[result.status] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-10">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white">Door check-in</h1>
          <div className="flex gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              In: {admitted}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20">
              Rejected: {rejected}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 font-bold">Event</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select the event you're scanning for</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
                {ev.date ? ` - ${ev.date}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <div
            id="qr-reader"
            className="w-full overflow-hidden rounded-2xl bg-black border border-slate-800 min-h-[280px]"
          />
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs pointer-events-none">
              Camera is off
            </div>
          )}
        </div>

        {cameraError && <p className="text-xs text-red-400 font-semibold">{cameraError}</p>}

        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition ${
            scanning
              ? 'bg-slate-800 hover:bg-slate-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
          }`}
        >
          {scanning ? 'Stop camera' : 'Start scanning'}
        </button>

        {/* Manual fallback */}
        <div className="pt-2 space-y-2">
          <p className="text-[11px] text-slate-400 font-bold">Can't scan? Type the ticket code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ticket code"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                submitCode(manualCode);
                setManualCode('');
              }}
              className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
            >
              Check
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen result */}
      {result && style && (
        <button
          onClick={dismissResult}
          className={`fixed inset-0 z-50 ${style.bg} text-white flex flex-col items-center justify-center text-center p-6`}
        >
          <div className="text-8xl font-black leading-none mb-4">{style.icon}</div>
          <div className="text-3xl font-black tracking-tight">{style.title}</div>
          {result.holder && <div className="text-xl font-bold mt-3">{result.holder}</div>}
          <div className="text-sm font-medium mt-2 opacity-90 max-w-xs">{result.message}</div>
          <div className="text-xs mt-8 opacity-70">Tap to scan next</div>
        </button>
      )}
    </div>
  );
}