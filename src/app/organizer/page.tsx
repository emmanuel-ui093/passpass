// src/app/organizer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EventRow {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
}

interface EventStats {
  revenue: number;
  ticketsSold: number;
}

export default function OrganizerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [statsByEvent, setStatsByEvent] = useState<Record<string, EventStats>>({});

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data: myEvents } = await supabase
        .from('events')
        .select('id, title, date, location')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const list = myEvents ?? [];
      setEvents(list);

      if (list.length > 0) {
        const eventIds = list.map((e) => e.id);

        const { data: orders } = await supabase
          .from('orders')
          .select('event_id, total_amount, status')
          .in('event_id', eventIds)
          .eq('status', 'SUCCESS');

        const { data: tickets } = await supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', eventIds);

        const stats: Record<string, EventStats> = {};
        list.forEach((e) => (stats[e.id] = { revenue: 0, ticketsSold: 0 }));

        (orders ?? []).forEach((o) => {
          if (stats[o.event_id]) stats[o.event_id].revenue += Number(o.total_amount || 0);
        });
        (tickets ?? []).forEach((t) => {
          if (stats[t.event_id]) stats[t.event_id].ticketsSold += 1;
        });

        setStatsByEvent(stats);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Not logged in</h1>
        <Link href="/login?next=/organizer" className="text-indigo-400 font-bold text-sm">
          Log in
        </Link>
      </div>
    );
  }

  const totalRevenue = Object.values(statsByEvent).reduce((sum, s) => sum + s.revenue, 0);
  const totalTicketsSold = Object.values(statsByEvent).reduce((sum, s) => sum + s.ticketsSold, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-lg mx-auto font-sans space-y-6 pb-20">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 pt-2">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Host Control Center
          </span>
          <h1 className="text-xl font-black text-white">Organizer Dashboard</h1>
        </div>
        <Link
          href="/organizer/create-event"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1 shadow-lg shadow-indigo-600/20"
        >
          <span>+</span> Create Event
        </Link>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading your events...</div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Revenue</span>
              <p className="text-sm font-black text-emerald-400 truncate">
                ₦{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Sold</span>
              <p className="text-sm font-black text-indigo-400">{totalTicketsSold}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Events</span>
              <p className="text-sm font-black text-amber-400">{events.length}</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              Your Hosted Events ({events.length})
            </h2>

            {events.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-400">
                You haven't created any events yet.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => {
                  const stats = statsByEvent[evt.id] ?? { revenue: 0, ticketsSold: 0 };
                  return (
                    <div
                      key={evt.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-white">{evt.title}</h3>
                          <p className="text-[11px] text-slate-400">{evt.location}</p>
                        </div>
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">
                          {evt.date}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">{stats.ticketsSold} tickets sold</span>
                        <span className="text-emerald-400">₦{stats.revenue.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                        <Link
                          href={`/organizer/scan?eventId=${evt.id}`}
                          className="text-[11px] text-indigo-400 hover:underline font-bold flex items-center gap-1"
                        >
                          📷 Launch Gate Scanner →
                        </Link>
                        <Link
                          href={`/organizer/orders?eventId=${evt.id}`}
                          className="text-[11px] text-slate-400 hover:text-white font-bold"
                        >
                          View orders →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="pt-4 border-t border-slate-800 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-white transition font-medium">
          ← Back to Event Discovery
        </Link>
      </footer>
    </main>
  );
}