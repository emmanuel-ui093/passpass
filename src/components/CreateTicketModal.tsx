'use client';

import { useState, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);

  // Image Upload State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper: Convert file to Base64 Data URL for instant rendering & storage
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Parse price value
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;

    // Use uploaded image or fallback default
    const finalBanner =
      imagePreview ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80';

    // Send new event to Supabase
    const { error } = await supabase.from('events').insert([
      {
        title,
        price: numericPrice,
        location: venue,
        date: date || 'Upcoming',
        category,
        banner: finalBanner,
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
      setImagePreview(null);
      onClose();

      // Refresh to pull newly inserted event from Supabase
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
          {/* Event Title */}
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

          {/* Category */}
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

          {/* Drag & Drop / Camera / Photo Library Picker */}
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">
              Banner Picture
            </label>

            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 text-lg">
                  📷
                </div>
                <div className="text-xs text-slate-300 font-semibold">
                  Drag & drop photo here, or{' '}
                  <span className="text-indigo-400 underline">click to choose</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Select from Gallery or snap a photo with Camera
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 group h-36">
                <img
                  src={imagePreview}
                  alt="Banner Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1.5 bg-rose-600/80 text-white rounded-lg text-xs font-bold hover:bg-rose-600"
                  >
                    Remove
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Price */}
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

          {/* Venue */}
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

          {/* Date & Time */}
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