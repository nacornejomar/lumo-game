import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Vercel: allow up to 60s for image generation

export async function POST(req: NextRequest) {
  try {
    const { charId, imageUrl } = await req.json();
    if (!charId || !imageUrl) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const { createServerSupabase } = await import('@/lib/supabase');
    const supabase = createServerSupabase();

    // Create bucket if it doesn't exist yet
    await supabase.storage
      .createBucket('character-images', { public: true, fileSizeLimit: 5 * 1024 * 1024 })
      .catch(() => { /* already exists — ignore */ });

    // Fetch the image (Pollinations AI can take up to 45s on first generation)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);
    let imgRes: Response;
    try {
      imgRes = await fetch(imageUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!imgRes.ok) {
      return NextResponse.json({ error: `Imagen no disponible (${imgRes.status})` }, { status: 502 });
    }

    const buffer = await imgRes.arrayBuffer();
    if (buffer.byteLength < 1000) {
      return NextResponse.json({ error: 'Imagen demasiado pequeña — posiblemente error de generación' }, { status: 502 });
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(`${charId}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get permanent public URL
    const { data: { publicUrl } } = supabase.storage
      .from('character-images')
      .getPublicUrl(`${charId}.jpg`);

    // Update character record
    await supabase.from('characters').update({ image_url: publicUrl }).eq('id', charId);

    return NextResponse.json({ success: true, publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
