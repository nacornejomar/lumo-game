'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/gameUtils';
import { CATEGORY_RING } from '@/data/characters';
import { AI_ATTRIBUTES } from '@/lib/aiLogic';
import type { Character, Category } from '@/types';

const ADMIN_KEY = 'lumo_admin_2024';
const DEFAULT_RING = { ring: '#7854d4', glow: '', bg: '#1e1640', label: '#e8e0ff' };
type Tab = 'characters' | 'categories';

interface CacheProgress {
  total: number;
  done: number;
  errors: number;
  current: string;
  finished: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [message, setMessage] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [cacheProgress, setCacheProgress] = useState<CacheProgress | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    if (saved === 'true') setIsAuthed(true);
  }, []);

  useEffect(() => {
    if (isAuthed) loadData();
  }, [isAuthed]);

  const handleLogin = () => {
    if (password === 'lumo2024admin') {
      setIsAuthed(true);
      sessionStorage.setItem(ADMIN_KEY, 'true');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { createClientSupabase } = await import('@/lib/supabase');
      const supabase = createClientSupabase();
      const [charsRes, catsRes] = await Promise.all([
        supabase.from('characters').select('*').order('category_id').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);
      setCharacters((charsRes.data ?? []) as Character[]);
      setCategories((catsRes.data ?? []) as Category[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  // ── Image caching ─────────────────────────────────────────────────────────

  const cacheAllImages = async (onlyMissing = false) => {
    const targets = onlyMissing
      ? characters.filter(c => !c.image_url || c.image_url.includes('pollinations.ai'))
      : characters.filter(c => c.image_url);

    if (targets.length === 0) { showMsg('No hay imágenes para procesar'); return; }

    setCacheProgress({ total: targets.length, done: 0, errors: 0, current: '', finished: false });

    let done = 0;
    let errors = 0;

    for (const char of targets) {
      setCacheProgress(p => ({ ...p!, current: char.name }));
      try {
        const res = await fetch('/api/admin/cache-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ charId: char.id, imageUrl: char.image_url }),
        });
        const data = await res.json();
        if (data.success) {
          done++;
          // Update local state with new URL
          setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, image_url: data.publicUrl } : c));
        } else {
          errors++;
          console.warn(`Error cacheando ${char.name}:`, data.error);
        }
      } catch {
        errors++;
      }
      setCacheProgress(p => ({ ...p!, done: done + errors, errors }));
    }

    setCacheProgress(p => ({ ...p!, finished: true, current: '', done: done + errors }));
    showMsg(`Imágenes guardadas: ${done} exitosas, ${errors} fallidas`);
    await loadData();
  };

  // ── Characters ────────────────────────────────────────────────────────────

  const toggleCharacter = async (char: Character) => {
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase();
    await supabase.from('characters').update({ active: !char.active }).eq('id', char.id);
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, active: !c.active } : c));
    showMsg(`"${char.name}" ${!char.active ? 'activado' : 'desactivado'}`);
  };

  const saveCharacter = async () => {
    if (!editingChar?.name || !editingChar?.category_id) return;
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase();
    const charData = {
      name: editingChar.name,
      image_url: editingChar.image_url ?? null,
      category_id: editingChar.category_id,
      universe_or_country: editingChar.universe_or_country ?? '',
      profession_or_role: editingChar.profession_or_role ?? '',
      is_real: editingChar.is_real ?? false,
      gender: editingChar.gender ?? 'unknown',
      attributes: editingChar.attributes ?? {},
      active: editingChar.active ?? true,
    };
    if (editingChar.id) {
      await supabase.from('characters').update(charData).eq('id', editingChar.id);
      setCharacters(prev => prev.map(c => c.id === editingChar.id ? { ...c, ...charData } : c));
      showMsg('Personaje actualizado');
    } else {
      const id = `char-${Date.now()}`;
      await supabase.from('characters').insert({ id, ...charData });
      await loadData();
      showMsg('Personaje creado');
    }
    setEditingChar(null);
  };

  const setCharAttr = (key: string, value: boolean) => {
    setEditingChar(prev => ({
      ...prev!,
      attributes: { ...(prev?.attributes as Record<string, unknown> ?? {}), [key]: value },
    }));
  };

  // ── Categories ────────────────────────────────────────────────────────────

  const toggleCategory = async (cat: Category) => {
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase();
    await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id);
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
    showMsg(`"${cat.name}" ${!cat.active ? 'activada' : 'desactivada'}`);
  };

  const saveCategory = async () => {
    if (!editingCat?.name) return;
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase();
    const slug = editingCat.slug || editingCat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const catData = {
      name: editingCat.name,
      slug,
      description: editingCat.description ?? '',
      icon: editingCat.icon ?? '🎭',
      active: editingCat.active ?? true,
    };
    if (editingCat.id) {
      await supabase.from('categories').update(catData).eq('id', editingCat.id);
      setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...catData } : c));
      showMsg('Categoría actualizada');
    } else {
      const id = `cat-${slug}-${Date.now()}`;
      await supabase.from('categories').insert({ id, ...catData });
      await loadData();
      showMsg('Categoría creada — ahora puedes agregar personajes');
    }
    setEditingCat(null);
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--wood-deep)' }}>
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="text-center">
            <h1 className="lumo-logo text-4xl mb-1">Lumo</h1>
            <p className="text-lumo-muted text-sm font-body">Panel de Administración</p>
          </div>
          <div className="lumo-card rounded-2xl p-5 flex flex-col gap-3">
            <input
              type="password"
              className="lumo-input w-full"
              placeholder="Contraseña de administrador"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin} className="lumo-btn lumo-btn-primary w-full">Entrar</button>
          </div>
          <button onClick={() => router.push('/')} className="text-xs text-lumo-muted opacity-40 hover:opacity-70 text-center transition-opacity font-body">
            Volver al juego
          </button>
        </div>
      </main>
    );
  }

  // ── Panel ─────────────────────────────────────────────────────────────────
  const visibleChars = filterCat ? characters.filter(c => c.category_id === filterCat) : characters;

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto" style={{ background: 'var(--wood-deep)' }}>
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => router.push('/')} className="text-lumo-muted hover:text-lumo-primary text-sm font-body transition-colors">
          ← Juego
        </button>
        <h1 className="font-display font-bold text-2xl text-lumo-primary">Panel Admin</h1>
        <div className="flex-1" />
        <button
          onClick={() => cacheAllImages(true)}
          disabled={!!cacheProgress && !cacheProgress.finished}
          className="lumo-btn lumo-btn-outline text-xs px-3 py-1.5"
          title="Descarga las imágenes de Pollinations AI y las guarda en Supabase Storage"
        >
          🖼️ Guardar imágenes
        </button>
        <button onClick={loadData} disabled={isLoading} className="lumo-btn lumo-btn-outline text-xs px-3 py-1.5">
          {isLoading ? '...' : '🔄 Recargar'}
        </button>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm font-body animate-slide-up" style={{ background: '#1a3b1a', color: '#6ee87a', border: '1px solid #2a5a2a' }}>
          ✓ {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['characters', 'categories'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg font-display text-sm transition-all"
            style={{
              background: activeTab === tab ? 'var(--gold)' : 'transparent',
              border: `1px solid ${activeTab === tab ? 'var(--gold)' : 'var(--border)'}`,
              color: activeTab === tab ? 'var(--wood-deep)' : 'var(--muted)',
            }}
          >
            {tab === 'characters' ? `🎭 Personajes (${characters.length})` : `📂 Categorías (${categories.length})`}
          </button>
        ))}

        {activeTab === 'characters' && (
          <button
            onClick={() => setEditingChar({ active: true, is_real: false, gender: 'unknown', attributes: {}, category_id: categories[0]?.id ?? '' })}
            className="lumo-btn lumo-btn-primary ml-auto text-xs px-3 py-1.5"
          >
            + Nuevo Personaje
          </button>
        )}
        {activeTab === 'categories' && (
          <button
            onClick={() => setEditingCat({ active: true })}
            className="lumo-btn lumo-btn-primary ml-auto text-xs px-3 py-1.5"
          >
            + Nueva Categoría
          </button>
        )}
      </div>

      {/* ── Characters Tab ── */}
      {activeTab === 'characters' && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setFilterCat('')}
              className="text-xs px-3 py-1 rounded-full font-body transition-all"
              style={{ background: !filterCat ? 'var(--gold)' : 'transparent', color: !filterCat ? 'var(--wood-deep)' : 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
                className="text-xs px-3 py-1 rounded-full font-body transition-all"
                style={{ background: filterCat === cat.id ? 'var(--gold)' : 'transparent', color: filterCat === cat.id ? 'var(--wood-deep)' : 'var(--muted)', border: '1px solid var(--border)' }}
              >
                {cat.icon} {cat.name} ({characters.filter(c => c.category_id === cat.id).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleChars.map(char => {
              const ring = CATEGORY_RING[char.category_id] ?? DEFAULT_RING;
              return (
                <div
                  key={char.id}
                  className="lumo-card rounded-xl p-3 flex items-center gap-3 transition-all"
                  style={{ opacity: char.active ? 1 : 0.45, borderColor: `${ring.ring}40` }}
                >
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-display font-bold text-xs"
                    style={{ background: ring.bg, color: ring.label, border: `2px solid ${ring.ring}` }}
                  >
                    {getInitials(char.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate text-lumo-text">{char.name}</p>
                    <p className="text-xs text-lumo-muted truncate font-body">{char.profession_or_role}</p>
                    <p className="text-xs font-body mt-0.5" style={{ color: ring.ring, opacity: 0.8 }}>
                      {Object.keys(char.attributes as object ?? {}).filter(k => (char.attributes as Record<string, unknown>)[k]).length} atributos
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => setEditingChar(char)} className="text-xs px-2 py-0.5 rounded border border-lumo-border text-lumo-muted hover:bg-lumo-card transition-colors font-body">
                      Editar
                    </button>
                    <button
                      onClick={() => toggleCharacter(char)}
                      className={`text-xs px-2 py-0.5 rounded font-body transition-colors ${char.active ? 'text-red-400 border border-red-800' : 'text-green-400 border border-green-800'}`}
                    >
                      {char.active ? 'Ocultar' : 'Activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Categories Tab ── */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map(cat => {
            const ring = CATEGORY_RING[cat.id] ?? DEFAULT_RING;
            const charCount = characters.filter(c => c.category_id === cat.id).length;
            return (
              <div
                key={cat.id}
                className="lumo-card rounded-xl p-4 transition-all"
                style={{ opacity: cat.active ? 1 : 0.5, borderColor: `${ring.ring}40` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lumo-text">{cat.name}</p>
                    <p className="text-xs text-lumo-muted font-body truncate">{cat.description}</p>
                    <p className="text-xs mt-0.5 font-body" style={{ color: ring.ring }}>
                      {charCount} personaje{charCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <button
                      onClick={() => setEditingCat(cat)}
                      className="text-xs px-2 py-0.5 rounded border border-lumo-border text-lumo-muted hover:bg-lumo-card transition-colors font-body"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-2 py-0.5 rounded font-body transition-colors ${cat.active ? 'text-red-400 border border-red-800' : 'text-green-400 border border-green-800'}`}
                    >
                      {cat.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Character Edit Modal ── */}
      {editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="lumo-card w-full max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-lumo-primary mb-4">
              {editingChar.id ? 'Editar Personaje' : 'Nuevo Personaje'}
            </h3>

            <div className="space-y-3">
              {([
                ['Nombre', 'name', 'text'],
                ['Universo / Saga', 'universe_or_country', 'text'],
                ['Profesión / Rol', 'profession_or_role', 'text'],
                ['URL de imagen', 'image_url', 'url'],
              ] as [string, string, string][]).map(([label, field, type]) => (
                <div key={field}>
                  <label className="block text-xs text-lumo-muted font-body mb-1">{label}</label>
                  <input
                    type={type}
                    className="lumo-input w-full text-sm"
                    value={(editingChar as Record<string, unknown>)[field] as string ?? ''}
                    onChange={e => setEditingChar(prev => ({ ...prev!, [field]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Categoría</label>
                <select
                  className="lumo-input w-full text-sm"
                  value={editingChar.category_id ?? ''}
                  onChange={e => setEditingChar(prev => ({ ...prev!, category_id: e.target.value }))}
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Género</label>
                <select
                  className="lumo-input w-full text-sm"
                  value={editingChar.gender ?? 'unknown'}
                  onChange={e => setEditingChar(prev => ({ ...prev!, gender: e.target.value as Character['gender'] }))}
                >
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                  <option value="other">Otro</option>
                  <option value="unknown">Sin especificar</option>
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingChar.is_real ?? false}
                    onChange={e => setEditingChar(prev => ({ ...prev!, is_real: e.target.checked }))} />
                  <span className="text-xs text-lumo-muted font-body">Persona real</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingChar.active ?? true}
                    onChange={e => setEditingChar(prev => ({ ...prev!, active: e.target.checked }))} />
                  <span className="text-xs text-lumo-muted font-body">Activo en el juego</span>
                </label>
              </div>

              {/* Attributes for AI */}
              <div>
                <p className="text-xs text-lumo-muted font-body mb-2 mt-1">
                  <span className="text-lumo-primary font-bold">Atributos para la IA</span>
                  <span className="ml-1 opacity-60">— definen cómo responde la IA</span>
                </p>
                <div className="grid grid-cols-1 gap-1.5 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {Object.entries(AI_ATTRIBUTES).map(([key, label]) => {
                    const attrs = (editingChar.attributes ?? {}) as Record<string, unknown>;
                    const val = attrs[key];
                    const isSet = key in attrs;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCharAttr(key, true)}
                            className="text-xs px-2 py-0.5 rounded font-body transition-all"
                            style={{
                              background: isSet && val === true ? '#1a4a1a' : 'transparent',
                              color: isSet && val === true ? '#6ee87a' : 'var(--muted)',
                              border: `1px solid ${isSet && val === true ? '#2a7a2a' : 'var(--border)'}`,
                            }}
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setCharAttr(key, false)}
                            className="text-xs px-2 py-0.5 rounded font-body transition-all"
                            style={{
                              background: isSet && val === false ? '#4a1a1a' : 'transparent',
                              color: isSet && val === false ? '#e87a6e' : 'var(--muted)',
                              border: `1px solid ${isSet && val === false ? '#7a2a2a' : 'var(--border)'}`,
                            }}
                          >
                            No
                          </button>
                        </div>
                        <span className="text-xs font-body text-lumo-muted">{label}</span>
                        {!isSet && <span className="text-xs opacity-30 font-body ml-auto">sin definir</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={saveCharacter} className="lumo-btn lumo-btn-primary flex-1 text-sm">Guardar</button>
              <button onClick={() => setEditingChar(null)} className="lumo-btn lumo-btn-outline flex-1 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Cache Progress Modal ── */}
      {cacheProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="lumo-card w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-lg text-lumo-primary">
              {cacheProgress.finished ? '✓ Imágenes guardadas' : '🖼️ Guardando imágenes…'}
            </h3>

            {/* Progress bar */}
            <div className="w-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', height: '10px' }}>
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round((cacheProgress.done / cacheProgress.total) * 100)}%`,
                  background: cacheProgress.errors > 0 ? 'linear-gradient(90deg, #c8953a, #e87a6e)' : 'linear-gradient(90deg, #c8953a, #e8b84a)',
                }}
              />
            </div>

            <div className="text-sm font-body space-y-1">
              <p className="text-lumo-muted">
                <span className="text-lumo-primary font-bold">{cacheProgress.done}</span> / {cacheProgress.total} procesadas
                {cacheProgress.errors > 0 && <span className="text-red-400 ml-2">({cacheProgress.errors} fallidas)</span>}
              </p>
              {!cacheProgress.finished && cacheProgress.current && (
                <p className="text-xs text-lumo-muted opacity-70 truncate">↳ {cacheProgress.current}</p>
              )}
              {!cacheProgress.finished && (
                <p className="text-xs text-lumo-muted opacity-50 mt-1">
                  Pollinations AI genera imágenes bajo demanda — puede tomar hasta 1 minuto por imagen.
                </p>
              )}
            </div>

            {cacheProgress.finished && (
              <button
                onClick={() => setCacheProgress(null)}
                className="lumo-btn lumo-btn-primary w-full text-sm"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Category Edit Modal ── */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="lumo-card w-full max-w-sm rounded-2xl p-5">
            <h3 className="font-display font-bold text-lg text-lumo-primary mb-4">
              {editingCat.id ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Nombre</label>
                <input
                  type="text"
                  className="lumo-input w-full text-sm"
                  placeholder="ej. Dragon Ball Z"
                  value={editingCat.name ?? ''}
                  onChange={e => setEditingCat(prev => ({ ...prev!, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Descripción corta</label>
                <input
                  type="text"
                  className="lumo-input w-full text-sm"
                  placeholder="ej. Los guerreros más fuertes del universo"
                  value={editingCat.description ?? ''}
                  onChange={e => setEditingCat(prev => ({ ...prev!, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Emoji / Ícono</label>
                <input
                  type="text"
                  className="lumo-input w-full text-sm"
                  placeholder="ej. 🐉"
                  value={editingCat.icon ?? ''}
                  onChange={e => setEditingCat(prev => ({ ...prev!, icon: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Slug (URL)</label>
                <input
                  type="text"
                  className="lumo-input w-full text-sm"
                  placeholder="ej. dragon-ball (se genera automático)"
                  value={editingCat.slug ?? ''}
                  onChange={e => setEditingCat(prev => ({ ...prev!, slug: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editingCat.active ?? true}
                  onChange={e => setEditingCat(prev => ({ ...prev!, active: e.target.checked }))} />
                <span className="text-xs text-lumo-muted font-body">Visible en el juego</span>
              </label>

              {!editingCat.id && (
                <p className="text-xs font-body rounded-lg p-2" style={{ background: 'rgba(200,149,58,0.1)', color: 'var(--gold)', border: '1px solid rgba(200,149,58,0.2)' }}>
                  Después de crear la categoría, ve a la pestaña Personajes y agrega al menos 12 personajes con sus atributos para que la IA funcione bien.
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={saveCategory} className="lumo-btn lumo-btn-primary flex-1 text-sm">Guardar</button>
              <button onClick={() => setEditingCat(null)} className="lumo-btn lumo-btn-outline flex-1 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
