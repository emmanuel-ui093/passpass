'use client';

import { useState } from 'react';
import TicketModal from '../components/TicketModal';
import Navbar from '@/components/Navbar';

const MOCK_EVENTS = [
  {
    id: '1',
    title: 'SUG Grand Campus Rave & Awards',
    category: 'Campus',
    venue: 'Convocation Arena, Main Campus',
    city: 'Awka',
    date: 'Fri, Oct 10 • 8:00 PM',
    price: '₦2,000',
    organizer: 'SUG Social Director',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
  {
    id: '2',
    title: 'Midnight Shift: All-Black Club Party',
    category: 'Clubs',
    venue: 'Club Escape & Lounge',
    city: 'Lagos',
    date: 'Sat, Oct 11 • 11:00 PM',
    price: '₦5,000',
    organizer: 'Vibe Culture Ent',
    banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: '3',
    title: 'Afro-Concert Live 2026',
    category: 'Concerts',
    venue: 'Eko Energy City',
    city: 'Lagos',
    date: 'Sun, Nov 1 • 6:00 PM',
    price: '₦10,000',
    organizer: 'Echo Music Group',
    banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
  {
    id: '4',
    title: 'Departmental Dinner & Pool Turnup',
    category: 'Campus',
    venue: 'Golden Tulip Poolside',
    city: 'Enugu',
    date: 'Thu, Oct 22 • 5:00 PM',
    price: 'FREE',
    organizer: 'Nacos Excos',
    banner: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80',
    featured: false,
  },
];

const CATEGORIES = ['All', 'Campus', 'Clubs', 'Concerts', 'Parties'];

export default function EventDiscoveryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEvent, setActiveEvent] = useState<any>(null);

  const filteredEvents = MOCK_EVENTS.filter((event) => {
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Replaced old static header with Navbar */}
      <Navbar />

      {/* Main Discovery Feed */}
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
                    src={event.banner}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                    {event.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-black text-white border border-slate-700">
                    {event.price}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{event.date}</p>
                  <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-indigo-300 transition">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">📍 {event.venue} • {event.city}</p>
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