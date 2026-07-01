/**
 * Actualiza la imagen de un personaje específico con un nuevo prompt de Pollinations AI
 * y la guarda en Supabase Storage.
 *
 * Uso: node scripts/fix-character-image.mjs "Krusty el payaso"
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase     = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET       = 'character-images';

// ── Prompts mejorados por personaje ──────────────────────────────────────────
const CUSTOM_PROMPTS = {
  'krusty': 'Krusty the Clown from The Simpsons TV show, official cartoon style, yellow skin, teal-green messy side hair bald on top, white face makeup, big red round nose, wide grin with white teeth, sky blue bow tie, lavender purple suit, cheerful happy expression, 2D animation flat color style, clean lines, white background',
};

function buildPollinationsUrl(prompt, seed = 42) {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux`;
}

async function fetchWithTimeout(url, timeoutMs = 90_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 800) throw new Error('imagen vacía');
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const searchName = process.argv[2];
  if (!searchName) {
    console.error('Uso: node scripts/fix-character-image.mjs "nombre del personaje"');
    process.exit(1);
  }

  console.log(`\n🔍 Buscando: "${searchName}"...\n`);

  const { data: characters, error } = await supabase
    .from('characters')
    .select('id, name, image_url')
    .ilike('name', `%${searchName}%`);

  if (error || !characters?.length) {
    console.error('❌ Personaje no encontrado:', error?.message ?? 'sin resultados');
    process.exit(1);
  }

  if (characters.length > 1) {
    console.log('Se encontraron varios personajes:');
    characters.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.id})`));
    console.log('\nAfina la búsqueda para que haya solo uno.');
    process.exit(0);
  }

  const char = characters[0];
  console.log(`✓ Encontrado: ${char.name} (id: ${char.id})`);
  console.log(`  URL actual: ${char.image_url?.slice(0, 80)}...\n`);

  // Elegir prompt personalizado o genérico
  const key = searchName.toLowerCase();
  let prompt = null;
  for (const [k, p] of Object.entries(CUSTOM_PROMPTS)) {
    if (key.includes(k)) { prompt = p; break; }
  }
  if (!prompt) {
    prompt = `${char.name}, cartoon character, official art style, clean 2D illustration, white background, detailed portrait`;
  }

  console.log(`📝 Prompt: "${prompt}"\n`);

  const newImageUrl = buildPollinationsUrl(prompt);
  console.log(`🌐 URL Pollinations: ${newImageUrl}\n`);

  console.log('⏳ Descargando imagen (puede tardar hasta 90 segundos)...');
  let buf;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      buf = await fetchWithTimeout(newImageUrl);
      console.log(`✓ Imagen descargada (${(buf.byteLength / 1024).toFixed(1)} KB)\n`);
      break;
    } catch (err) {
      console.log(`  ↻ Intento ${attempt}/3 fallido: ${err.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
      else { console.error('❌ No se pudo descargar la imagen.'); process.exit(1); }
    }
  }

  // Subir a Supabase Storage
  console.log('⬆️  Subiendo a Supabase Storage...');
  await supabase.storage
    .createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 })
    .catch(() => {});

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(`${char.id}.jpg`, buf, { contentType: 'image/jpeg', upsert: true });

  if (upErr) { console.error('❌ Error al subir:', upErr.message); process.exit(1); }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(`${char.id}.jpg`);

  await supabase.from('characters').update({ image_url: publicUrl }).eq('id', char.id);

  console.log(`✅ ¡Listo! Nueva URL: ${publicUrl}\n`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
