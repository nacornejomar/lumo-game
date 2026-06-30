'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayerIdFromStorage, getPlayerNameFromStorage } from '@/lib/gameUtils';
import { SEED_CATEGORIES, CATEGORY_RING } from '@/data/characters';

export default function CreateRoomPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('cat-hp');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const activeCategories = SEED_CATEGORIES.filter(c => c.active);

  const handleCreate = async () => {
    const playerName = getPlayerNameFromStorage();
    const playerId = getPlayerIdFromStorage();
    if (!playerName) { router.push('/'); return; }
    setIsCreating(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, playerId, categoryId: selectedCategory }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al crear sala');
      }
      const { code } = await res.json();
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la sala');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #faf8f5 0%, #f5f0ff 50%, #fff5f0 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-lumo-muted hover:text-lumo-primary text-sm font-body mb-3 opacity-70 hover:opacity-100 transition-opacity"
          >
            ← Volver
          </button>
          <h1 className="font-display font-black text-3xl text-lumo-primary">Crear Sala</h1>
          <p className="text-lumo-muted text-sm font-body mt-1">Elige la categoría de personajes</p>
        </div>

        {/* Card */}
        <div className="lumo-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="h-px bg-gradient-to-r from-transparent via-lumo-border to-transparent" />

          <div className="space-y-2">
            <label className="block text-lumo-text text-xs font-display font-semibold tracking-wide uppercase opacity-80">
              Categoría
            </label>
            {activeCategories.map(cat => {
              const ring = CATEGORY_RING[cat.id];
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200"
                  style={{
                    background: isSelected ? `${ring?.ring}12` : 'transparent',
                    border: `1.5px solid ${isSelected ? ring?.ring : '#e8e2f8'}`,
                    boxShadow: isSelected ? `0 0 12px ${ring?.glow}` : 'none',
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm text-lumo-text">{cat.name}</p>
                    <p className="font-body text-xs text-lumo-muted">{cat.description}</p>
                  </div>
                  {isSelected && (
                    <span style={{ color: ring?.ring }} className="text-lg font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-xs text-center font-body">{error}</p>}

          <div className="h-px bg-gradient-to-r from-transparent via-lumo-border to-transparent" />

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="lumo-btn lumo-btn-primary w-full text-base"
          >
            {isCreating ? '✨ Creando sala...' : '✨ Crear Sala'}
          </button>
        </div>

        <p className="text-center text-lumo-muted text-xs font-body">
          20 personajes · Turnos alternados · ¡Adivina al rival!
        </p>
      </div>
    </main>
  );
}
