'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/utils/client';

interface TicketTierInput {
  name: string;
  price: number;
  capacity: number;
}

interface EventData {
  id?: string;
  title: string;
  date: string;
  location: string;
  totalRevenue: number;
  ticketsSold: number;
  totalCapacity: number;
}

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'events'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalRevenue: 1450000,
    totalTicketsSold: 380,
    activeEventsCount: 3,
  });

  // Mock initial events list with fallback
  const [events, setEvents] = useState<EventData[]>([
    {
      id: '1',
      title: 'SUG Grand Campus Rave',
      date: '2026-10-15',
      location: 'Paul University Convocation Arena',
      totalRevenue: 850000,
      ticketsSold: 220,
      totalCapacity: 300,
    },
    {
      id: '2',
      title: 'Tech & Innovators Summit',
      date: '2026-11-02',
      location: 'Engineering Auditorium',
      totalRevenue: 600000,
      ticketsSold: 160,
      totalCapacity: 200,
    },
  ]);

  // Form State for New Event Creation
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [tiers, setTiers] = useState<TicketTierInput[]>([
    { name: 'Regular Pass', price: 2000, capacity: 150 },
    { name: 'VIP Pass', price: 5000, capacity: 50 },
  ]);

  // Add / Remove dynamic tier rows
  const addTier = () => {
    setTiers([...tiers, { name: '', price: 0, capacity: 50 }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length === 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof TicketTierInput, value: string | number) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  // Submit New Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !location) return;

    setLoading(true);

    const calculatedCapacity = tiers.reduce((acc, t) => acc + Number(t.capacity), 0);

    try {
      // 1. Insert Event into Supabase
      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert([{ title, date, location }])
        .select()
        .single();

      if (!eventErr && newEvent) {
        // 2. Insert Associated Ticket Tiers
        const tierPayloads = tiers.map((t) => ({
          event_id: newEvent.id,
          name: t.name,
          price: t.price,
          capacity: t.capacity,
        }));

        await supabase.from('ticket_tiers').insert(tierPayloads);
      }

      // Local State Update
      const createdEvent: EventData = {
        id: Date.now().toString(),
        title,
        date,
        location,
        totalRevenue: 0,
        ticketsSold: 0,
        totalCapacity: calculatedCapacity,
      };

      setEvents([createdEvent, ...events]);
      setStats((prev) => ({
        ...prev,
        activeEventsCount: prev.activeEventsCount + 1,
      }));

      // Reset Form
      setTitle('');
      setDate('');
      setLocation('');
      setTiers([
        { name: 'Regular Pass', price: 2000, capacity: 150 },
        { name: 'VIP Pass', price: 5000, capacity: 50 },
      ]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-lg mx-auto font-sans space-y-6 pb-20">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 pt-2">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Host Control Center
          </span>
          <h1 className="text-xl font-black text-white">Organizer Dashboard</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1 shadow-lg shadow-indigo-600/20"
        >
          <span>+</span> Create Event
        </button>
      </header>

      {/* Analytics High-Level Summary Cards */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Revenue</span>
          <p className="text-sm font-black text-emerald-400 truncate">
            ₦{(stats.totalRevenue / 1000).toFixed(0)}k
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Sold</span>
          <p className="text-sm font-black text-indigo-400">{stats.totalTicketsSold}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Active</span>
          <p className="text-sm font-black text-amber-400">{stats.activeEventsCount}</p>
        </div>
      </section>

      {/* Events List Header */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">
            Your Hosted Events ({events.length})
          </h2>
        </div>

        <div className="space-y-3">
          {events.map((evt) => {
            const percentSold = Math.round((evt.ticketsSold / evt.totalCapacity) * 100) || 0;
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

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">
                      {evt.ticketsSold} / {evt.totalCapacity} Tickets Sold
                    </span>
                    <span className="text-emerald-400">₦{evt.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentSold}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                  <a
                    href="/scanner"
                    className="text-[11px] text-indigo-400 hover:underline font-bold flex items-center gap-1"
                  >
                    📷 Launch Gate Scanner →
                  </a>
                  <span className="text-[10px] text-slate-500 font-bold">{percentSold}% Sold Out</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CREATE EVENT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white">Create New Event</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Event Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Campus Cultural Night"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Venue Location
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Hall"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Ticket Tiers */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase text-indigo-400">
                    Ticket Tiers & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-[11px] font-bold text-indigo-400 hover:underline"
                  >
                    + Add Tier
                  </button>
                </div>

                {tiers.map((tier, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">Tier #{idx + 1}</span>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          className="text-[10px] text-rose-400 font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Tier Name"
                        value={tier.name}
                        onChange={(e) => updateTier(idx, 'name', e.target.value)}
                        className="col-span-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Price (₦)"
                        value={tier.price || ''}
                        onChange={(e) => updateTier(idx, 'price', Number(e.target.value))}
                        className="col-span-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Capacity"
                        value={tier.capacity || ''}
                        onChange={(e) => updateTier(idx, 'capacity', Number(e.target.value))}
                        className="col-span-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition mt-2"
              >
                {loading ? 'Publishing Event...' : 'Publish Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="pt-4 border-t border-slate-800 text-center">
        <a href="/" className="text-xs text-slate-400 hover:text-white transition font-medium">
          ← Back to Event Discovery
        </a>
      </footer>
    </main>
  );
}