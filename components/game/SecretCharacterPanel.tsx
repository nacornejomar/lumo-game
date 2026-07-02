'use client';

import { useState } from 'react';
import type { Character, Room } from '@/types';
import { SEED_CATEGORIES } from '@/data/characters';

interface SecretCharacterPanelProps {
  character: Character | null;
  room: Room;
  isMyTurn: boolean;
}

export function SecretCharacterPanel({ character, room, isMyTurn }: SecretCharacterPanelProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const category = SEED_CATEGORIES.find(c => c.id === room.category_id);
  const initials = character
    ? character.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="lumo-ornament">Tu personaje secreto</div>

      {/* Portrait card — tall on desktop, horizontal strip on mobile */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2a1508 0%, #1a0d05 100%)',
          border: '2px solid var(--gold)',
          boxShadow: '0 0 28px rgba(200,149,58,0.25), 0 8px 24px rgba(0,0,0,0.7)',
        }}
      >
        {/* Corner ornaments */}
        <div className="absolute top-1.5 left-1.5 z-10 w-4 h-4 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: 'var(--gold-bright)', opacity: 0.7 }} />
        <div className="absolute top-1.5 right-1.5 z-10 w-4 h-4 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: 'var(--gold-bright)', opacity: 0.7 }} />

        {/* Portrait — hidden on mobile (show horizontal strip instead) */}
        <div className="hidden lg:block" style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
          {!character ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-20" style={{ color: 'var(--gold)' }}>?</span>
            </div>
          ) : (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-bold text-3xl" style={{ color: 'var(--gold)' }}>{initials}</span>
                </div>
              )}
              {character.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.image_url}
                  alt={character.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                />
              )}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(14,8,4,0.85) 100%)' }}
              />
            </>
          )}
        </div>

        {/* Mobile: horizontal layout */}
        <div className="lg:hidden flex items-center gap-3 p-3">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden relative"
            style={{ border: '1px solid var(--gold)', background: 'var(--wood-mid)' }}
          >
            {character?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.image_url}
                alt={character.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {!character && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg opacity-30" style={{ color: 'var(--gold)' }}>?</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--gold-text)' }}>
              {character?.name ?? '???'}
            </p>
            {character && (
              <p className="text-xs italic truncate" style={{ color: 'var(--gold)', fontFamily: 'var(--font-lora)' }}>
                {character.profession_or_role}
              </p>
            )}
          </div>
        </div>

        {/* Name plaque (desktop only) */}
        <div
          className="hidden lg:block px-3 py-3 text-center"
          style={{ background: 'linear-gradient(180deg, #1a0d05 0%, #2a1808 100%)' }}
        >
          <p className="font-display font-bold text-base leading-tight" style={{ color: 'var(--gold-text)' }}>
            {character?.name ?? '???'}
          </p>
          {character && (
            <p className="text-xs italic mt-0.5" style={{ color: 'var(--gold)', fontFamily: 'var(--font-lora)' }}>
              {character.profession_or_role}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-row lg:flex-col gap-2">
        {/* Turn badge */}
        <div
          className="flex-1 lg:flex-none flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: isMyTurn ? 'rgba(74,124,63,0.2)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${isMyTurn ? 'var(--leaf)' : '#3d2010'}`,
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>{isMyTurn ? '🌿' : '⌛'}</span>
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: isMyTurn ? 'var(--leaf-bright)' : '#6b5040', fontFamily: 'var(--font-cinzel)' }}
          >
            {isMyTurn ? 'Tu turno' : 'Esperando'}
          </span>
        </div>

        {/* Category badge */}
        <div
          className="flex-1 lg:flex-none flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #3d2010' }}
        >
          <span style={{ fontSize: '0.9rem' }}>{category?.icon ?? '✦'}</span>
          <span
            className="text-xs font-bold truncate"
            style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}
          >
            {category?.name ?? 'Mix'}
          </span>
        </div>
      </div>
    </div>
  );
}
