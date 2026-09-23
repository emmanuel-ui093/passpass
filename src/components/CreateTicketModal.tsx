'use client';

import { useState, useRef } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface TicketTierInput {
  name: string;
  price: string;
  quantity: string;
}

export default function CreateTicketModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Campus');
  const [loading, setLoading] = useState(false);

  // Dynamic Ticket Tiers State (Default starts with Early Bird & Regular)
  const [ticketTiers, setTicketTiers] = useState<TicketTierInput[]>([
    { name: 'Early Bird', price: '2000', quantity: '100' },
    { name: 'Regular Pass', price: '3500', quantity: '300' },
  ]);

  // Image Upload State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Add a new tier input row
  const handleAddTier = () => {
    setTicketTiers([
      ...ticketTiers,
      { name: 'VIP Pass', price: '7500', quantity: '50' },
    ]);
  };

  // Remove a tier input row
  const handleRemoveTier = (index: number) => {
    if (ticketTiers.length <= 1) {
      alert('Your event must have at least one ticket tier.');
      return;
    }
    setTicketTiers(ticketTiers.filter((_, i) => i !== index));
  };

  // Update specific field in a tier row
  const handleTierChange = (
    index: number,
    field: keyof TicketTierInput,
    value: string
  ) => {
    const updated = [...ticketTiers];
    updated[index][field] = value;
    setTicketTiers(updated);
  };

  // Helper: Convert file to Base64
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

    // Primary display price on event card (lowest tier price)
    const basePrice = Math.min(
      ...ticketTiers.map(
        (t) => parseFloat(t.price.replace(/[^0-9.]/g, '')) || 0
      )
    );

    const finalBanner =
      imagePreview ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80';

    // 1. Insert Event into Supabase
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert([
        {
          title,
          price: basePrice,
          location: venue,
          date: date || 'Upcoming',
          category,
          banner: finalBanner,
        },
      ])
      .select()
      .single();

    if (eventError) {
      console.error('Supabase Event Error:', eventError);
      alert(`Error publishing event: ${eventError.message}`);
      setLoading(false);
      return;
    }

    // 2. Batch insert all custom ticket tiers into ticket_types
    if (newEvent) {
      const tiersToInsert = ticketTiers.map((tier) => ({
        event_id: newEvent.id,
        name: tier.name.trim() || 'General Admission',
        price: parseFloat(tier.price.replace(/[^0-9.]/g, '')) || 0,
        quantity: parseInt(tier.quantity.replace(/[^0-9]/g, ''), 10) || 100,
        sold: 0,
      }));

      const { error: tierError } = await supabase
        .from('ticket_types')
        .insert(tiersToInsert);

      if (tierError) {
        console.error('Ticket Tier Insert Error:', tierError);
        alert(`Warning: Event created, but tiers failed: ${tierError.message}`);
      }
    }

    setLoading(false);
    alert('Event and ticket categories published successfully!');

    // Reset Form
    setTitle('');
    setVenue('');
    setDate('');
    setImagePreview(null);
    onClose();

    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black">Host New Event 🔥</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Banner Upload */}
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
                  Drag & drop photo, or{' '}
                  <span className="text-indigo-400 underline">browse</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-32">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC TICKET CATEGORIES / TIERS SECTION */}
          <div className="border-t border-b border-slate-800 py-3 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-indigo-400 font-black uppercase tracking-wider">
                Ticket Categories & Pricing
              </label>
              <button
                type="button"
                onClick={handleAddTier}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition"
              >
                + Add Category
              </button>
            </div>

            <div className="space-y-2.5">
              {ticketTiers.map((tier, index) => (
                <div
                  key={index}
                  className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Category (e.g. VIP, Early Bird)"
                      value={tier.name}
                      onChange={(e) =>
                        handleTierChange(index, 'name', e.target.value)
                      }
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                    />
                    {ticketTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(index)}
                        className="text-slate-500 hover:text-rose-400 text-xs font-bold px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">
                        Price (₦)
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Price (0 for Free)"
                        value={tier.price}
                        onChange={(e) =>
                          handleTierChange(index, 'price', e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">
                        Quantity
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Max available"
                        value={tier.quantity}
                        onChange={(e) =>
                          handleTierChange(index, 'quantity', e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Venue & Location */}
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
              placeholder="e.g. Fri, Oct 24 • 8:00 PM"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 text-white"
          >
            {loading ? 'Publishing Event...' : 'Publish Event & Categories'}
          </button>
        </form>
      </div>
    </div>
  );
}