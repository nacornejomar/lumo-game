'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/gameUtils';
import { CATEGORY_RING } from '@/data/characters';
import type { Character, Category } from '@/types';

const ADMIN_KEY = 'lumo_admin_2024';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'characters' | 'categories'>('characters');
  const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
  const [message, setMessage] = useState('');

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
        supabase.from('characters').select('*').order('universe_or_country').order('name'),
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

  const toggleCharacter = async (char: Character) => {
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase();
    await supabase.from('characters').update({ active: !char.active }).eq('id', char.id);
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, active: !c.active } : c));
    setMessage(`"${char.name}" ${!char.active ? 'activado' : 'desactivado'}`);
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
      setMessage('Personaje actualizado');
    } else {
      const id = `char-${Date.now()}`;
      await supabase.from('characters').insert({ id, ...charData });
      await loadData();
      setMessage('Personaje creado');
    }
    setEditingChar(null);
  };

  // ── Login ─────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, #faf8f5 0%, #f5f0ff 60%, #fff5f0 100%)' }}
      >
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

  // ── Panel ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto bg-lumo-bg">
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => router.push('/')} className="text-lumo-muted hover:text-lumo-primary text-sm font-body transition-colors">
          ← Juego
        </button>
        <h1 className="font-display font-bold text-2xl text-lumo-primary">Panel Admin</h1>
        <div className="flex-1" />
        <button onClick={loadData} disabled={isLoading} className="lumo-btn lumo-btn-outline text-xs px-3 py-1.5">
          {isLoading ? '...' : '🔄 Recargar'}
        </button>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm font-body text-emerald-700 animate-slide-up bg-emerald-50 border border-emerald-200">
          ✓ {message}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['characters', 'categories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg font-display text-sm transition-all"
            style={{
              background: activeTab === tab ? '#7854d4' : 'transparent',
              border: `1px solid ${activeTab === tab ? '#7854d4' : '#ddd6f8'}`,
              color: activeTab === tab ? 'white' : '#8878b8',
            }}
          >
            {tab === 'characters' ? '🎭 Personajes' : '📂 Categorías'}
          </button>
        ))}
        <button
          onClick={() => setEditingChar({ active: true, is_real: false, gender: 'unknown', attributes: {}, category_id: categories[0]?.id ?? '' })}
          className="lumo-btn lumo-btn-gold ml-auto text-xs px-3 py-1.5"
        >
          + Nuevo Personaje
        </button>
      </div>

      {activeTab === 'characters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {characters.map(char => {
            const ring = CATEGORY_RING[char.category_id] ?? { ring: '#7854d4', bg: '#1e1640', label: '#e8e0ff', glow: '' };
            const initials = getInitials(char.name);
            return (
              <div
                key={char.id}
                className="lumo-card rounded-xl p-3 flex items-center gap-3 transition-all"
                style={{ opacity: char.active ? 1 : 0.5, borderColor: `${ring.ring}40` }}
              >
                <div
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-display font-bold text-xs"
                  style={{ background: ring.bg, color: ring.label, border: `2px solid ${ring.ring}` }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm truncate text-lumo-text">{char.name}</p>
                  <p className="text-xs text-lumo-muted truncate font-body">{char.universe_or_country}</p>
                  <p className="text-xs text-lumo-muted opacity-60 font-body">{char.profession_or_role}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditingChar(char)} className="text-xs px-2 py-0.5 rounded border border-lumo-border text-lumo-muted hover:bg-lumo-card transition-colors font-body">
                    Editar
                  </button>
                  <button
                    onClick={() => toggleCharacter(char)}
                    className={`text-xs px-2 py-0.5 rounded font-body transition-colors ${char.active ? 'text-red-500 border border-red-200 hover:bg-red-50' : 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}
                  >
                    {char.active ? 'Ocultar' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map(cat => {
            const ring = CATEGORY_RING[cat.id] ?? { ring: '#7854d4', glow: '', bg: '#1e1640', label: '#e8e0ff' };
            return (
              <div
                key={cat.id}
                className="lumo-card rounded-xl p-4 transition-all"
                style={{ opacity: cat.active ? 1 : 0.5, borderColor: `${ring.ring}40` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-lumo-text">{cat.name}</p>
                    <p className="text-xs text-lumo-muted font-body">{cat.description}</p>
                    <p className="text-xs mt-0.5 font-body" style={{ color: ring.ring }}>
                      {characters.filter(c => c.category_id === cat.id).length} personajes
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-body ${cat.active ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                    {cat.active ? 'Activo' : 'Oculto'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,22,64,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="lumo-card w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-lumo-primary mb-4">
              {editingChar.id ? 'Editar Personaje' : 'Nuevo Personaje'}
            </h3>
            <div className="space-y-3">
              {[
                ['Nombre', 'name', 'text'],
                ['Universo / País', 'universe_or_country', 'text'],
                ['Profesión / Rol', 'profession_or_role', 'text'],
                ['URL de imagen', 'image_url', 'url'],
              ].map(([label, field, type]) => (
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
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-lumo-muted font-body mb-1">Género</label>
                <select
                  className="lumo-input w-full text-sm"
                  value={editingChar.gender ?? 'unknown'}
                  onChange={e => setEditingChar(prev => ({ ...prev!, gender: e.target.value as Character['gender'] }))}
                >
                  {['male', 'female', 'other', 'unknown'].map(g => <option key={g} value={g}>{g}</option>)}
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
                  <span className="text-xs text-lumo-muted font-body">Activo</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveCharacter} className="lumo-btn lumo-btn-primary flex-1 text-sm">Guardar</button>
              <button onClick={() => setEditingChar(null)} className="lumo-btn lumo-btn-outline flex-1 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
