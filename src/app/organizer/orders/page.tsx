// src/app/organizer/orders/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface EventRow {
  id: string;
  title: string;
}

interface OrderRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface TicketRow {
  id: string;
  order_id: string;
  holder_name: string;
  holder_email: string;
  checked_in_at: string | null;
}

function OrdersAndAttendees() {
  const searchParams = useSearchParams();
  const selectedEventId = searchParams.get('eventId');

  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [activeEventId, setActiveEventId] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [activeTab, setActiveTab] = useState<'attendees' | 'orders'>('attendees');
  const [search, setSearch] = useState('');

  // Load the organizer's own events once
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('events')
        .select('id, title')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const myEvents = data ?? [];
      setEvents(myEvents);
      setActiveEventId(selectedEventId || myEvents[0]?.id || '');
      setLoading(false);
    });
  }, [selectedEventId]);

  // Load orders + tickets whenever the active event changes
  useEffect(() => {
    if (!activeEventId) {
      setOrders([]);
      setTickets([]);
      return;
    }

    const supabase = createClient();

    supabase
      .from('orders')
      .select('id, buyer_name, buyer_email, buyer_phone, total_amount, status, created_at')
      .eq('event_id', activeEventId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data ?? []));

    supabase
      .from('tickets')
      .select('id, order_id, holder_name, holder_email, checked_in_at')
      .eq('event_id', activeEventId)
      .order('id', { ascending: true })
      .then(({ data }) => setTickets(data ?? []));
  }, [activeEventId]);

  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold mb-2">Not logged in</h1>
        <Link href="/login?next=/organizer/orders" className="text-indigo-400 font-bold text-sm">
          Log in
        </Link>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredTickets = tickets.filter(
    (t) =>
      (t.holder_name || '').toLowerCase().includes(q) ||
      (t.holder_email || '').toLowerCase().includes(q)
  );
  const filteredOrders = orders.filter(
    (o) =>
      (o.buyer_name || '').toLowerCase().includes(q) ||
      (o.buyer_email || '').toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
  );

  const paidOrders = orders.filter((o) => o.status === 'SUCCESS');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const checkedInCount = tickets.filter((t) => t.checked_in_at).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-3xl mx-auto space-y-6 pb-16">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 pt-2">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Orders & Attendees
          </span>
          <h1 className="text-xl font-black text-white">Your ticket sales</h1>
        </div>
        <Link href="/organizer" className="text-xs text-slate-400 hover:text-white font-bold">
          ← Dashboard
        </Link>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : events.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-400">
          You haven't created any events yet.
        </div>
      ) : (
        <>
          {/* Event picker */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-bold">Event</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setActiveEventId(ev.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    ev.id === activeEventId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <section className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Revenue</span>
              <p className="text-sm font-black text-emerald-400 truncate">
                ₦{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Tickets</span>
              <p className="text-sm font-black text-indigo-400">{tickets.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Checked in</span>
              <p className="text-sm font-black text-amber-400">
                {checkedInCount}/{tickets.length}
              </p>
            </div>
          </section>

          {/* Search */}
          <input
            type="text"
            placeholder="Search name, email, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('attendees')}
              className={`pb-2.5 px-4 text-xs font-bold transition ${
                activeTab === 'attendees'
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Attendees ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2.5 px-4 text-xs font-bold transition ${
                activeTab === 'orders'
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Orders ({orders.length})
            </button>
          </div>

          {activeTab === 'attendees' && (
            <div className="space-y-2">
              {filteredTickets.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-400">
                  No attendees found.
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{t.holder_name || 'Guest'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.holder_email}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${
                        t.checked_in_at
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.checked_in_at ? 'CHECKED IN' : 'NOT YET'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-2">
              {filteredOrders.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-400">
                  No orders found.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{order.buyer_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{order.buyer_email}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{order.id.slice(0, 8)}...</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span
                        className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          order.status === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : order.status === 'FAILED'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="text-xs font-bold text-white">
                        ₦{Number(order.total_amount).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OrganizerOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <OrdersAndAttendees />
    </Suspense>
  );
}