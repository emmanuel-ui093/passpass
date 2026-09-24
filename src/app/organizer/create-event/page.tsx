'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { uploadCompressedBanner } from '@/lib/uploadBanner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    location: '',
    startDate: '',
    endDate: '',
    ticketPrice: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let bannerUrl: string | null = null;

      // 1. Compress & Upload image to Storage if selected
      if (selectedFile) {
        bannerUrl = await uploadCompressedBanner(selectedFile);
      }

      // 2. Insert event record with small URL string into events table
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([
          {
            title: form.title,
            description: form.description,
            venue: form.venue,
            location: form.location,
            banner_url: bannerUrl,
            start_date: form.startDate,
            end_date: form.endDate,
            status: 'PUBLISHED',
          },
        ])
        .select()
        .single();

      if (eventError) throw eventError;

      // 3. Create default Ticket Type for the event
      const { error: ticketTypeError } = await supabase
        .from('ticket_types')
        .insert([
          {
            event_id: newEvent.id,
            name: 'General Admission',
            price: parseFloat(form.ticketPrice) || 0,
            total_quantity: 100,
            remaining_quantity: 100,
          },
        ]);

      if (ticketTypeError) throw ticketTypeError;

      alert('Event created successfully!');
      router.push('/');
    } catch (err: any) {
      console.error('Event creation error:', err);
      alert(`Failed to create event: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Event Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Banner Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-3 h-40 w-full object-cover rounded-xl border border-slate-800"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Venue Name</label>
            <input
              type="text"
              required
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Ticket Price (NGN)</label>
            <input
              type="number"
              required
              placeholder="0 for Free"
              value={form.ticketPrice}
              onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Start Date & Time</label>
          <input
            type="datetime-local"
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/30"
        >
          {loading ? 'Compressing Image & Publishing...' : 'Publish Event'}
        </button>
      </form>
    </div>
  );
}