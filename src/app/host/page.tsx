'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HostPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setChecking(false);
    });
  }, []);

  const handleHost = async () => {
    setError('');

    if (!loggedIn) {
      router.push('/signup?next=/host');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/organizer/become', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      // The event-creation form lives here (built next)
      router.push('/organizer');
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-center">
        <h1 className="text-xl font-black text-white">Host an event</h1>
        <p className="text-sm text-slate-400">
          Create your event, set ticket types and prices, and start selling in minutes.
        </p>

        {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

        <button
          onClick={handleHost}
          disabled={checking || loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-sm rounded-xl transition"
        >
          {loading ? 'Setting up your dashboard...' : 'Get started'}
        </button>
      </div>
    </div>
  );
}