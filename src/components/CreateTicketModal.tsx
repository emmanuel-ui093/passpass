'use client';

import { useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTicketModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Campus');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Direct initialization using environment variables
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Parse price value
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;

    // Send new event directly to Supabase
    const { error } = await supabase.from('events').insert([
      {
        title,
        price: numericPrice,
        location: venue,
        date: date || 'Upcoming',
        category,
        banner:
          banner.trim() !== ''
            ? banner
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('Supabase Insert Error:', error);
      alert(`Error publishing event: ${error.message}`);
    } else {
      alert('Event published successfully!');
      // Clear form
      setTitle('');
      setPrice('');
      setVenue('');
      setDate('');
      setBanner('');
      onClose();

      // Refresh to pull the newly inserted row from Supabase
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black">Host New Event 🔥</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-bold">
              Event Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SUG All-Night Rave"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Campus">Campus</option>
              <option value="Clubs">Clubs</option>
              <option value="Concerts">Concerts</option>
              <option value="Parties">Parties</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">
              Banner Picture URL
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Paste an image web URL (leave blank for default event picture)
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">
              Ticket Price (₦)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2000 or 0 for Free"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">
              Venue & City
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Convocation Arena, Awka"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">
              Date & Time
            </label>
            <input
              type="text"
              placeholder="e.g. Fri, Oct 10 • 8:00 PM"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 text-white"
          >
            {loading ? 'Publishing Event...' : 'Publish Event Pass'}
          </button>
        </form>
      </div>
    </div>
  );
}