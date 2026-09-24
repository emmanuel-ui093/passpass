import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Canvas-based image compression utility
export async function compressImage(
  file: File, 
  maxWidth = 1200, 
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context'));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => reject(err);
  });
}

// Uploads compressed image to Supabase Storage and returns the public CDN URL
export async function uploadCompressedBanner(file: File): Promise<string> {
  const compressedBlob = await compressImage(file);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const filePath = `banners/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('event-banners')
    .upload(filePath, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Banner upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('event-banners')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}