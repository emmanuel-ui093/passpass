'use client';

import { useEffect, useState, use } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface TicketData {
  ticket_code: string;
  buyer_name: string;
  quantity: number;
  total_price: number;
  status: string;
  events: {
    title: string;
    date: string;
    location: string;
  } | null;
  ticket_types: {
    name: string;
  } | null;
}

export default function TicketPassPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTicket() {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('tickets')
        .select(
          `
          ticket_code,
          buyer_name,
          quantity,
          total_price,
          status,
          events (title, date, location),
          ticket_types (name)
        `
        )
        .eq('ticket_code', code)
        .single();

      if (error || !data) {
        setError('Ticket pass not found.');
      } else {
        setTicket(data as unknown as TicketData);
      }
      setLoading(false);
    }

    if (code) fetchTicket();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-xs font-bold text-slate-400">Loading pass...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-rose-400 font-bold text-xs">{error}</p>
          <a href="/" className="text-xs text-indigo-400 underline">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4 text-center shadow-2xl">
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-1.5 px-3 rounded-full inline-block">
          ✓ PASS CONFIRMED & ISSUED
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 text-left relative overflow-hidden shadow-inner">
          <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                Pass Holder
              </p>
              <p className="text-sm font-black text-white">{ticket.buyer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                Category
              </p>
              <p className="text-xs font-bold text-indigo-400">
                {ticket.ticket_types?.name || 'General Admission'} (x{ticket.quantity})
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="relative p-3 bg-white rounded-2xl shadow-lg border-4 border-slate-800 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${ticket.ticket_code}`}
                alt="Ticket QR Code"
                className="w-36 h-36 rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-950 border-2 border-indigo-500 rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
                  <span className="text-[10px] font-black tracking-tighter text-indigo-400">
                    P<span className="text-white">P</span>
                  </span>
                </div>
              </div>
            </div>

            <p className="font-mono text-xs font-bold tracking-widest text-indigo-300">
              {ticket.ticket_code}
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-3 flex justify-between text-[11px] text-slate-400 font-semibold">
            <span>{ticket.events?.title || 'Event Pass'}</span>
            <span className="text-emerald-400 font-bold">STATUS: {ticket.status}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Save this link or bookmark this page to present your QR pass at the entrance gate.
        </p>
      </div>
    </div>
  );
}