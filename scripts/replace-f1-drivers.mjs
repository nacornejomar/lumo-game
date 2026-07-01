/**
 * Elimina 5 pilotos F1 antiguos y los reemplaza por 5 actuales.
 * Uso: node scripts/replace-f1-drivers.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');

const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);
const BUCKET   = 'character-images';
const TIMEOUT  = 90_000;
const DELAY    = 2500;

const p = (seed, text) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;

// ── Pilotos a eliminar ───────────────────────────────────────────────────────
const REMOVE_IDS = ['f1-lauda', 'f1-raikkonen', 'f1-button', 'f1-hakkinen', 'f1-mansell'];

// ── Pilotos a añadir ─────────────────────────────────────────────────────────
const NEW_DRIVERS = [
  {
    id: 'f1-antonelli', name: 'Kimi Antonelli',
    category_id: 'cat-f1',
    universe_or_country: 'Italia', profession_or_role: 'Piloto Mercedes',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: false, es_inteligente: true, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4021, 'Kimi Antonelli very young Italian Formula 1 driver portrait, teenage boy face, dark short hair, fresh face, Mercedes F1 team, youngest driver realistic portrait'),
  },
  {
    id: 'f1-colapinto', name: 'Franco Colapinto',
    category_id: 'cat-f1',
    universe_or_country: 'Argentina', profession_or_role: 'Piloto Alpine',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: true, es_inteligente: false, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4022, 'Franco Colapinto young Argentine Formula 1 driver portrait, South American racing driver, dark hair, charismatic friendly smile, Williams Alpine F1, realistic portrait'),
  },
  {
    id: 'f1-gasly', name: 'Pierre Gasly',
    category_id: 'cat-f1',
    universe_or_country: 'Francia', profession_or_role: 'Piloto Alpine',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4023, 'Pierre Gasly French Formula 1 driver portrait, young French man, brown short hair, determined focused expression, Alpine F1 team, realistic portrait'),
  },
  {
    id: 'f1-hulkenberg', name: 'Nico Hülkenberg',
    category_id: 'cat-f1',
    universe_or_country: 'Alemania', profession_or_role: 'Piloto Haas',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: false, es_inteligente: true, es_joven: false, es_amigo_principal: true, es_animal: false, es_robot: false },
    image_url: p(4024, 'Nico Hulkenberg The Hulk German Formula 1 driver portrait, mature German man, shaved head short hair, veteran driver friendly expression, Haas Sauber F1, realistic portrait'),
  },
  {
    id: 'f1-ocon', name: 'Esteban Ocon',
    category_id: 'cat-f1',
    universe_or_country: 'Francia', profession_or_role: 'Piloto Haas',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: true, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: true, es_inteligente: false, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4025, 'Esteban Ocon French Formula 1 driver portrait, young French man, dark short hair, serious competitive expression, Alpine Haas F1 team, realistic portrait'),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 800) throw new Error('imagen vacía');
    return buf;
  } finally { clearTimeout(timer); }
}

async function cacheImage(char) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buf = await fetchWithTimeout(char.image_url);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${char.id}.jpg`, buf, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(error.message);
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(`${char.id}.jpg`);
      return publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 4000 * attempt)); }
      else { console.log(`    ✗ ${msg}`); return null; }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔄  Reemplazo de pilotos F1\n');

  // 1. Eliminar personajes antiguos
  console.log('🗑️  Eliminando pilotos antiguos...');
  const { error: delErr } = await supabase
    .from('characters')
    .delete()
    .in('id', REMOVE_IDS);
  if (delErr) { console.error('❌', delErr.message); process.exit(1); }

  // Eliminar imágenes del Storage
  const storageFiles = REMOVE_IDS.map(id => `${id}.jpg`);
  await supabase.storage.from(BUCKET).remove(storageFiles);
  console.log(`  ✓ Eliminados: ${REMOVE_IDS.join(', ')}\n`);

  // 2. Insertar nuevos pilotos
  console.log('➕  Insertando nuevos pilotos...');
  const { error: insErr } = await supabase
    .from('characters')
    .upsert(NEW_DRIVERS, { onConflict: 'id' });
  if (insErr) { console.error('❌', insErr.message); process.exit(1); }
  console.log(`  ✓ ${NEW_DRIVERS.length} pilotos insertados\n`);

  // 3. Cachear imágenes
  console.log('─'.repeat(50));
  console.log('⬇️  Cacheando imágenes...\n');

  let done = 0, errors = 0;
  for (let i = 0; i < NEW_DRIVERS.length; i++) {
    const char = NEW_DRIVERS[i];
    console.log(`  ⏳ ${char.name}...`);
    const url = await cacheImage(char);
    if (url) {
      await supabase.from('characters').update({ image_url: url }).eq('id', char.id);
      console.log(`  ✓ ${char.name}`);
      done++;
    } else {
      errors++;
    }
    if (i < NEW_DRIVERS.length - 1) await new Promise(r => setTimeout(r, DELAY));
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Completado');
  console.log(`   Guardadas : ${done}`);
  console.log(`   Errores   : ${errors}`);
  if (errors === 0) console.log('\n🎉 ¡Sala F1 actualizada!\n');
  else console.log('\n↻ Ejecuta node scripts/cache-images.mjs para reintentar.\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
