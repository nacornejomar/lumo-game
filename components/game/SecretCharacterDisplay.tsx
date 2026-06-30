'use client';

import { useState } from 'react';
import { getInitials } from '@/lib/gameUtils';
import { CATEGORY_RING } from '@/data/characters';
import type { Character } from '@/types';

interface SecretCharacterDisplayProps {
  character: Character | null;
  playerName: string;
}

export function SecretCharacterDisplay({ character }: SecretCharacterDisplayProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!character) {
    return (
      <div className="flex items-center gap-3 lumo-card rounded-xl p-3 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-lumo-card border border-lumo-border flex items-center justify-center flex-shrink-0">
          <span className="text-lumo-muted text-xl">?</span>
        </div>
        <div>
          <p className="text-lumo-muted text-xs font-body">Tu personaje secreto</p>
          <p className="text-lumo-text text-sm font-display">Cargando...</p>
        </div>
      </div>
    );
  }

  const ring = CATEGORY_RING[character.category_id] ?? {
    ring: '#7854d4', glow: 'rgba(120,84,212,0.5)', bg: '#1e1640', label: '#e8e0ff',
  };
  const initials = getInitials(character.name);

  return (
    <div
      className="flex items-center gap-3 lumo-card rounded-xl p-3 relative overflow-hidden"
      style={{ borderColor: `${ring.ring}50` }}
    >
      {/* Subtle bg glow */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ background: ring.ring }} />

      {/* Label */}
      <div
        className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-xl text-[0.6rem] font-display font-bold tracking-wider"
        style={{ background: ring.ring, color: ring.label }}
      >
        ★ SECRETO
      </div>

      {/* Coin avatar */}
      <div
        className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full"
        style={{
          background: `conic-gradient(${ring.ring}, ${ring.ring}55, ${ring.ring}, ${ring.ring}55, ${ring.ring})`,
          padding: '2px',
          boxShadow: `0 0 14px ${ring.glow}`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden relative" style={{ background: ring.bg }}>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${imgLoaded ? 'opacity-0' : 'opacity-100'}`}>
            <span className="text-base font-bold" style={{ color: ring.label }}>{initials}</span>
          </div>
          {character.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.image_url}
              alt={character.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="relative z-10 flex-1 min-w-0 pr-16">
        <p className="text-lumo-muted text-xs font-body mb-0.5">Tu personaje secreto</p>
        <p className="font-display font-bold text-base leading-tight truncate text-lumo-text">{character.name}</p>
        <p className="text-xs text-lumo-muted truncate">{character.universe_or_country} · {character.profession_or_role}</p>
      </div>
    </div>
  );
}
