'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayerIdFromStorage, getPlayerNameFromStorage, savePlayerName } from '@/lib/gameUtils';
import { SEED_CATEGORIES, CATEGORY_RING } from '@/data/characters';

type Mode = null | 'join' | 'ai' | 'random';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<Mode>(null);
  const [selectedCat, setSelectedCat] = useState('cat-hp');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getPlayerNameFromStorage();
    if (saved) setName(saved);
  }, []);

  const requireName = () => {
    if (!name.trim()) { setError('Ingresa tu nombre para jugar'); return false; }
    savePlayerName(name.trim());
    setError('');
    return true;
  };

  const handleCreatePrivate = () => {
    if (!requireName()) return;
    router.push('/room/create');
  };

  const handleJoin = async () => {
    if (!requireName()) return;
    if (!roomCode.trim()) { setError('Ingresa el código de sala'); return; }
    const code = roomCode.trim().toUpperCase();
    setIsBusy(true);
    try {
      const playerId = getPlayerIdFromStorage();
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al unirse');
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse a la sala');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartAI = async () => {
    if (!requireName()) return;
    setIsBusy(true);
    try {
      const playerId = getPlayerIdFromStorage();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), playerId, categoryId: selectedCat, vsAI: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error');
      const { code } = await res.json();
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear partida');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRandom = () => {
    if (!requireName()) return;
    router.push(`/matchmaking?cat=${selectedCat}&name=${encodeURIComponent(name.trim())}`);
  };

  const activeCategories = SEED_CATEGORIES.filter(c => c.active);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--wood-deep)' }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(200,149,58,0.4), transparent)', top: '-10%', left: '-10%' }} />
        <div className="absolute w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(74,124,63,0.3), transparent)', bottom: '-5%', right: '-5%' }} />
        {['✦','✧','✦','✧','✦'].map((s, i) => (
          <span key={i} className="absolute opacity-15 animate-pulse font-bold select-none"
            style={{ top: `${[15,70,30,55,85][i]}%`, left: `${[8,85,50,20,65][i]}%`, fontSize: `${[1.2,0.8,1,0.6,1.4][i]}rem`, animationDelay: `${i*0.4}s`, color: 'var(--gold)' }}>
            {s}
          </span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-5">
        {/* Logo */}
        <div className="text-center">
          <h1 className="lumo-logo text-8xl mb-1">Lumo</h1>
          <p className="font-display text-sm tracking-widest uppercase" style={{ color: '#9a8060' }}>Adivina Quién · Online</p>
          <div className="mt-2 flex justify-center gap-2 opacity-40 text-lg select-none" style={{ color: 'var(--gold)' }}>
            <span>✦</span><span>✧</span><span>✦</span>
          </div>
        </div>

        {/* Main card */}
        <div className="lumo-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="h-px bg-gradient-to-r from-transparent via-lumo-border to-transparent" />

          {/* Name */}
          <div>
            <label className="block text-lumo-text text-xs font-body font-semibold mb-1.5 tracking-wide uppercase opacity-80">Tu nombre</label>
            <input
              className="lumo-input w-full"
              placeholder="¿Cómo te llaman?"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); setMode(null); }}
              maxLength={20}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-body text-center animate-slide-up">{error}</p>}

          {/* ── Category picker (for AI / random modes) ─────────── */}
          {(mode === 'ai' || mode === 'random') && (
            <div className="animate-slide-up space-y-2">
              <p className="text-xs font-body font-semibold text-lumo-muted uppercase tracking-wide">
                Categoría
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {activeCategories.map(cat => {
                  const ring = CATEGORY_RING[cat.id];
                  const sel = selectedCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCat(cat.id)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all"
                      style={{
                        background: sel ? `${ring?.ring}15` : 'transparent',
                        border: `1.5px solid ${sel ? ring?.ring : '#e8e2f8'}`,
                        boxShadow: sel ? `0 0 10px ${ring?.glow}` : 'none',
                      }}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-body text-xs font-bold text-lumo-dark truncate">{cat.name}</span>
                      {sel && <span style={{ color: ring?.ring }} className="ml-auto text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Action buttons ─────────────────────────────────── */}
          {mode === null && (
            <div className="flex flex-col gap-2">
              <button onClick={handleCreatePrivate} className="lumo-btn lumo-btn-primary w-full text-sm">
                🤝 Jugar con Amigo
              </button>
              <button onClick={() => setMode('random')} className="lumo-btn lumo-btn-gold w-full text-sm">
                🎲 Rival Aleatorio
              </button>
              <button onClick={() => setMode('ai')} className="lumo-btn lumo-btn-outline w-full text-sm">
                🤖 Jugar vs IA
              </button>
            </div>
          )}

          {mode === 'ai' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStartAI}
                disabled={isBusy}
                className="lumo-btn lumo-btn-primary w-full text-sm"
              >
                {isBusy ? '✦ Creando partida...' : '🤖 Jugar vs IA'}
              </button>
              <button onClick={() => setMode(null)} className="text-xs text-lumo-muted font-body text-center opacity-60 hover:opacity-100">
                ← Volver
              </button>
            </div>
          )}

          {mode === 'random' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRandom}
                disabled={isBusy}
                className="lumo-btn lumo-btn-gold w-full text-sm"
              >
                🎲 Buscar Rival
              </button>
              <button onClick={() => setMode(null)} className="text-xs text-lumo-muted font-body text-center opacity-60 hover:opacity-100">
                ← Volver
              </button>
            </div>
          )}

          {/* ── Join with code ────────────────────────────────── */}
          {mode === null && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-lumo-border" />
                <span className="text-lumo-muted text-xs font-body">o únete con código</span>
                <div className="flex-1 h-px bg-lumo-border" />
              </div>
              <div className="flex gap-2">
                <input
                  className="lumo-input flex-1 font-body font-bold tracking-widest uppercase text-center"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase().slice(0, 6)); setError(''); }}
                  maxLength={6}
                />
                <button onClick={handleJoin} disabled={isBusy} className="lumo-btn lumo-btn-outline px-4 text-sm">
                  {isBusy ? '...' : 'Unirse'}
                </button>
              </div>
            </>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-lumo-border to-transparent" />
        </div>

        <div className="text-center">
          <a href="/admin" className="text-xs text-lumo-muted opacity-30 hover:opacity-60 transition-opacity font-body">
            Panel Admin
          </a>
        </div>
      </div>
    </main>
  );
}
