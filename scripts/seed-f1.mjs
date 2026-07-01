/**
 * Seed: Categoría "Pilotos de F1" — 20 pilotos (leyendas + actuales)
 * Inserta en Supabase y cachea todas las imágenes en Storage.
 *
 * Uso: node scripts/seed-f1.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan variables en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET   = 'character-images';
const TIMEOUT_MS = 90_000;
const DELAY_MS   = 2500;

// ── Helpers ──────────────────────────────────────────────────────────────────

const p = (seed, text) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;

async function fetchWithTimeout(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 800) throw new Error('imagen vacía');
    return buf;
  } finally { clearTimeout(timer); }
}

async function cacheImage(char) {
  if (!char.image_url) return null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`  ⏳ ${char.name} — descargando...`);
      const buf = await fetchWithTimeout(char.image_url);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${char.id}.jpg`, buf, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(error.message);

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(`${char.id}.jpg`);
      return publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 3) {
        console.log(`    ↻ Reintento ${attempt}/3 (${msg})`);
        await new Promise(r => setTimeout(r, 4000 * attempt));
      } else {
        console.log(`    ✗ Error: ${msg}`);
        return null;
      }
    }
  }
}

// ── Datos F1 ─────────────────────────────────────────────────────────────────

const CATEGORY = {
  id: 'cat-f1',
  name: 'Pilotos de F1',
  slug: 'f1',
  description: 'Los mejores pilotos de la Fórmula 1: leyendas y actuales',
  icon: '🏎️',
  active: true,
};

const CHARACTERS = [
  {
    id: 'f1-verstappen', name: 'Max Verstappen',
    universe_or_country: 'Países Bajos', profession_or_role: '4x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: true, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4001, 'Max Verstappen Formula 1 racing driver portrait, young Dutch man, short light brown hair, intense focused expression, Red Bull Racing, professional athlete photo, realistic portrait'),
  },
  {
    id: 'f1-hamilton', name: 'Lewis Hamilton',
    universe_or_country: 'Reino Unido', profession_or_role: '7x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: true, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4002, 'Lewis Hamilton Formula 1 champion portrait, British Black racing driver, short natural hair, confident expression, seven time world champion, professional athlete realistic portrait'),
  },
  {
    id: 'f1-leclerc', name: 'Charles Leclerc',
    universe_or_country: 'Mónaco', profession_or_role: 'Piloto Ferrari',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4003, 'Charles Leclerc Formula 1 driver portrait, young Monaco man, dark short hair, handsome charming smile, Ferrari red racing, realistic professional portrait'),
  },
  {
    id: 'f1-norris', name: 'Lando Norris',
    universe_or_country: 'Reino Unido', profession_or_role: 'Piloto McLaren',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: false, es_inteligente: false, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4004, 'Lando Norris Formula 1 driver portrait, young British man, wavy curly light brown hair, big fun smile, McLaren papaya orange, playful expression, realistic portrait'),
  },
  {
    id: 'f1-alonso', name: 'Fernando Alonso',
    universe_or_country: 'España', profession_or_role: '2x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: true, es_heroe: false, tiene_poderes: false, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4005, 'Fernando Alonso Formula 1 driver portrait, mature Spanish man, dark short hair, intense competitive piercing eyes, veteran racing champion, realistic portrait'),
  },
  {
    id: 'f1-russell', name: 'George Russell',
    universe_or_country: 'Reino Unido', profession_or_role: 'Piloto Mercedes',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: false, es_inteligente: true, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4006, 'George Russell Formula 1 driver portrait, tall young British man, short brown hair, confident professional expression, Mercedes Silver Arrows, realistic portrait'),
  },
  {
    id: 'f1-sainz', name: 'Carlos Sainz',
    universe_or_country: 'España', profession_or_role: 'Piloto Williams',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: false, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4007, 'Carlos Sainz Formula 1 driver portrait, young Spanish man, brown hair, friendly warm smile, smooth operator racing driver, realistic professional portrait'),
  },
  {
    id: 'f1-piastri', name: 'Oscar Piastri',
    universe_or_country: 'Australia', profession_or_role: 'Piloto McLaren',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: false, es_inteligente: true, es_joven: true, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4008, 'Oscar Piastri Formula 1 driver portrait, very young Australian man, short brown hair, calm composed expression, McLaren F1 driver, realistic portrait'),
  },
  {
    id: 'f1-perez', name: 'Sergio Pérez',
    universe_or_country: 'México', profession_or_role: 'Piloto Red Bull',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: false, es_guerrero: false, es_inteligente: false, es_joven: false, es_amigo_principal: true, es_animal: false, es_robot: false },
    image_url: p(4009, 'Sergio Perez Checo Formula 1 driver portrait, Mexican racing driver, dark hair, friendly smile, Red Bull Racing, Latin American athlete, realistic portrait'),
  },
  {
    id: 'f1-ricciardo', name: 'Daniel Ricciardo',
    universe_or_country: 'Australia', profession_or_role: 'Piloto RB / Red Bull',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: true, es_inteligente: false, es_joven: false, es_amigo_principal: true, es_animal: false, es_robot: false },
    image_url: p(4010, 'Daniel Ricciardo Formula 1 driver portrait, Australian racing driver, famous big wide smile, brown hair, charismatic cheerful expression, realistic portrait'),
  },
  {
    id: 'f1-senna', name: 'Ayrton Senna',
    universe_or_country: 'Brasil', profession_or_role: '3x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: true, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4011, 'Ayrton Senna legendary Formula 1 driver portrait, Brazilian racing legend, dark curly hair, intense passionate deep eyes, 1980s 1990s style, realistic portrait'),
  },
  {
    id: 'f1-schumacher', name: 'Michael Schumacher',
    universe_or_country: 'Alemania', profession_or_role: '7x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: true, es_heroe: true, tiene_poderes: true, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4012, 'Michael Schumacher Formula 1 seven time champion portrait, German racing legend, athletic build, intense determined expression, Ferrari red, realistic portrait'),
  },
  {
    id: 'f1-lauda', name: 'Niki Lauda',
    universe_or_country: 'Austria', profession_or_role: '3x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: false, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4013, 'Niki Lauda Formula 1 champion portrait, Austrian racing legend, distinctive red sponsor cap, facial burn scars on face, determined iron will expression, realistic portrait'),
  },
  {
    id: 'f1-prost', name: 'Alain Prost',
    universe_or_country: 'Francia', profession_or_role: '4x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: true, es_heroe: false, tiene_poderes: false, es_lider: true, es_gracioso: false, es_guerrero: false, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4014, 'Alain Prost Formula 1 champion portrait, French racing legend The Professor, curly dark hair, sharp calculating intelligent expression, four time world champion, realistic portrait'),
  },
  {
    id: 'f1-raikkonen', name: 'Kimi Räikkönen',
    universe_or_country: 'Finlandia', profession_or_role: '2007 Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: true, es_gracioso: true, es_guerrero: false, es_inteligente: false, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: true },
    image_url: p(4015, 'Kimi Raikkonen Iceman Formula 1 driver portrait, Finnish driver, blond light hair, famously calm cold emotionless stoic expression, 2007 world champion, realistic portrait'),
  },
  {
    id: 'f1-vettel', name: 'Sebastian Vettel',
    universe_or_country: 'Alemania', profession_or_role: '4x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: true, es_heroe: false, tiene_poderes: false, es_lider: true, es_gracioso: true, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4016, 'Sebastian Vettel Formula 1 champion portrait, German racing driver, light brown hair, focused competitive expression, four time world champion Red Bull Ferrari, realistic portrait'),
  },
  {
    id: 'f1-button', name: 'Jenson Button',
    universe_or_country: 'Reino Unido', profession_or_role: '2009 Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: true, es_gracioso: true, es_guerrero: false, es_inteligente: true, es_joven: false, es_amigo_principal: true, es_animal: false, es_robot: false },
    image_url: p(4017, 'Jenson Button Formula 1 champion portrait, British racing driver, brown hair, friendly warm charming smile, 2009 world champion Brawn GP, realistic portrait'),
  },
  {
    id: 'f1-hakkinen', name: 'Mika Häkkinen',
    universe_or_country: 'Finlandia', profession_or_role: '2x Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: false, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: true, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4018, 'Mika Hakkinen Flying Finn Formula 1 champion portrait, Finnish driver, blond hair, intense racing eyes, two time world champion McLaren silver, realistic portrait'),
  },
  {
    id: 'f1-mansell', name: 'Nigel Mansell',
    universe_or_country: 'Reino Unido', profession_or_role: '1992 Campeón del Mundo',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: true, tiene_poderes: false, es_lider: true, es_gracioso: false, es_guerrero: true, es_inteligente: false, es_joven: false, es_amigo_principal: false, es_animal: false, es_robot: false },
    image_url: p(4019, 'Nigel Mansell Formula 1 champion portrait, British racing driver, famous thick dark mustache, determined fierce expression, 1992 world champion Williams, realistic portrait'),
  },
  {
    id: 'f1-bottas', name: 'Valtteri Bottas',
    universe_or_country: 'Finlandia', profession_or_role: 'Piloto Sauber',
    is_real: true, gender: 'male', active: true,
    attributes: { es_villano: false, es_heroe: false, tiene_poderes: false, es_lider: false, es_gracioso: true, es_guerrero: false, es_inteligente: false, es_joven: false, es_amigo_principal: true, es_animal: false, es_robot: false },
    image_url: p(4020, 'Valtteri Bottas Formula 1 driver portrait, Finnish driver, blond short hair, calm composed expression, professional racing athlete, realistic portrait'),
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏎️  Seed: Pilotos de F1\n');

  // 1. Bucket
  await supabase.storage
    .createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 })
    .catch(() => {});
  console.log('✓ Bucket listo\n');

  // 2. Categoría
  const { error: catErr } = await supabase
    .from('categories')
    .upsert([CATEGORY], { onConflict: 'id' });
  if (catErr) {
    console.error('❌ Error al insertar categoría:', catErr.message);
    process.exit(1);
  }
  console.log(`✓ Categoría "${CATEGORY.name}" creada\n`);

  // 3. Personajes sin URL de Supabase (Pollinations por ahora)
  const charsToInsert = CHARACTERS.map(c => ({ ...c, category_id: CATEGORY.id }));
  const { error: charErr } = await supabase
    .from('characters')
    .upsert(charsToInsert, { onConflict: 'id' });
  if (charErr) {
    console.error('❌ Error al insertar personajes:', charErr.message);
    process.exit(1);
  }
  console.log(`✓ ${CHARACTERS.length} personajes insertados\n`);

  // 4. Cachear imágenes
  console.log('─'.repeat(50));
  console.log('⬇️  Cacheando imágenes en Supabase Storage...\n');

  let done = 0, errors = 0;

  for (let i = 0; i < CHARACTERS.length; i++) {
    const char = CHARACTERS[i];
    const publicUrl = await cacheImage(char);

    if (publicUrl) {
      await supabase.from('characters').update({ image_url: publicUrl }).eq('id', char.id);
      console.log(`  ✓ ${char.name}`);
      done++;
    } else {
      errors++;
    }

    if (i < CHARACTERS.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Completado');
  console.log(`   Guardadas : ${done}`);
  console.log(`   Errores   : ${errors}`);

  if (errors > 0) {
    console.log('\n↻ Ejecuta node scripts/cache-images.mjs para reintentar los errores.\n');
  } else {
    console.log('\n🎉 ¡Sala de Pilotos F1 lista para jugar!\n');
  }
}

main().catch(err => {
  console.error('\n❌ Error inesperado:', err.message);
  process.exit(1);
});
