'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTicketModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [venue, setVenue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Event "${title}" submitted!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 text-white shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black">Host New Event 🔥</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-bold">Event Title</label>
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
            <label className="text-xs text-slate-400 font-bold">Ticket Price (₦ or FREE)</label>
            <input
              type="text"
              required
              placeholder="e.g. ₦2,000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">Venue & City</label>
            <input
              type="text"
              required
              placeholder="e.g. Convocation Arena, Awka"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Publish Event Pass
          </button>
        </form>
      </div>
    </div>
  );
}