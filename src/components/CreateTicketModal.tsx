'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface TicketTierInput {
  name: string
  price: string
  quantity: string
}

// Sharp client-side canvas compressor
async function compressImageSharp(file: File, maxDimension = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Failed to get canvas context'))
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas compression failed'))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function CreateTicketModal({ isOpen, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [venue, setVenue] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [category, setCategory] = useState('Campus')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [ticketTiers, setTicketTiers] = useState<TicketTierInput[]>([
    { name: 'Early Bird', price: '2000', quantity: '100' },
    { name: 'Regular Pass', price: '3500', quantity: '300' },
  ])

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file.')
        return
      }
      setSelectedFile(file)
      setImagePreview(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleAddTier = () => {
    setTicketTiers([...ticketTiers, { name: 'VIP Pass', price: '7500', quantity: '50' }])
  }

  const handleRemoveTier = (index: number) => {
    if (ticketTiers.length <= 1) return
    setTicketTiers(ticketTiers.filter((_, i) => i !== index))
  }

  const handleTierChange = (index: number, field: keyof TicketTierInput, value: string) => {
    const updated = [...ticketTiers]
    updated[index][field] = value
    setTicketTiers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      // 1. Authenticate session
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to host an event.')
      }

      // 2. Sharp Image Compression & Storage Upload
      let bannerUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'

      if (selectedFile) {
        const compressedBlob = await compressImageSharp(selectedFile)
        const fileName = `${user.id}/${Date.now()}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('event-banners')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          console.warn('Storage upload warning:', uploadError.message)
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('event-banners')
            .getPublicUrl(fileName)
          bannerUrl = publicUrlData.publicUrl
        }
      }

      // 3. Insert Event with owner_id for RLS
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([
          {
            owner_id: user.id,
            title,
            venue,
            location: location || venue,
            category,
            description,
            banner: bannerUrl,
            start_date: startDate || new Date().toISOString(),
            status: 'PUBLISHED',
          },
        ])
        .select()
        .single()

      if (eventError) throw eventError

      // 4. Batch Insert Ticket Types
      if (newEvent) {
        const tiersToInsert = ticketTiers.map((tier) => {
          const qty = parseInt(tier.quantity.replace(/[^0-9]/g, ''), 10) || 100
          return {
            event_id: newEvent.id,
            name: tier.name.trim() || 'General Admission',
            price: parseFloat(tier.price.replace(/[^0-9.]/g, '')) || 0,
            total_quantity: qty,
            remaining_quantity: qty,
          }
        })

        const { error: tierError } = await supabase.from('ticket_types').insert(tiersToInsert)
        if (tierError) throw tierError
      }

      onClose()
      router.push('/organizer')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating event:', err)
      setErrorMsg(err.message || 'Failed to publish event.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black">Host New Event 🔥</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold p-1">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Event Title</label>
            <input
              type="text"
              required
              placeholder="e.g. SUG Grand Campus Rave"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Campus">Campus</option>
                <option value="Clubs">Clubs</option>
                <option value="Concerts">Concerts</option>
                <option value="Parties">Parties</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Banner Picture</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-3 h-32 w-full object-cover rounded-2xl border border-slate-800"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Venue</label>
              <input
                type="text"
                required
                placeholder="e.g. Convocation Arena"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Awka, Anambra"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-800 py-3 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-indigo-400 font-black uppercase tracking-wider">
                Ticket Categories & Pricing
              </label>
              <button
                type="button"
                onClick={handleAddTier}
                className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition"
              >
                + Add Category
              </button>
            </div>

            {ticketTiers.map((tier, index) => (
              <div key={index} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Category Name"
                    value={tier.name}
                    onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none flex-1"
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
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Price (₦)</span>
                    <input
                      type="text"
                      required
                      placeholder="0 for Free"
                      value={tier.price}
                      onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Quantity</span>
                    <input
                      type="text"
                      required
                      placeholder="Max available"
                      value={tier.quantity}
                      onChange={(e) => handleTierChange(index, 'quantity', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 text-white"
          >
            {loading ? 'Compressing & Publishing...' : 'Publish Event & Categories'}
          </button>
        </form>
      </div>
    </div>
  )
}