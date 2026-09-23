'use client';

import { useState, useEffect } from 'react';
import TicketModal from '../components/TicketModal';
import Navbar from '@/components/Navbar';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CATEGORIES = ['All', 'Campus', 'Clubs', 'Concerts', 'Parties'];

export default function EventDiscoveryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real live events from Supabase
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error.message);
      } else if (data) {
        setEvents(data);
      }
      setLoading(false);
    }

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;
    const matchesSearch =
      (event.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.venue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.city || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Find turn-ups, campus shows & concerts 🔥
          </h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by event, campus, venue, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pl-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <svg
              className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Loading live events...
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No events found. Be the first to host one!
          </div>
        )}

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => (
            <article
              key={event.id}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={event.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                    {event.category || 'Event'}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-black text-white border border-slate-700">
                    {event.price ? `₦${event.price}` : 'FREE'}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{event.date}</p>
                  <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-indigo-300 transition">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">📍 {event.venue || event.location} {event.city ? `• ${event.city}` : ''}</p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => setActiveEvent(event)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  Get Ticket Pass
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Ticket Modal Overlay */}
      {activeEvent && (
        <TicketModal
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </div>
  );
}