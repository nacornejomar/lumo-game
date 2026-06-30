'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/gameUtils';
import { CATEGORY_RING } from '@/data/characters';
import type { Character, Room, RoomPlayer } from '@/types';

interface VictoryScreenProps {
  room: Room;
  playerId: string;
  myPlayer: RoomPlayer | null;
  opponentPlayer: RoomPlayer | null;
  characters: Character[];
  opponentSecretId?: string | null;
}

export function VictoryScreen({ room, playerId, myPlayer, opponentPlayer, characters, opponentSecretId }: VictoryScreenProps) {
  const router = useRouter();
  const iWon = room.winner_player_id === playerId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,5,2,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--parchment)',
          border: `2px solid ${iWon ? '#e8b84a' : '#6b3f1e'}`,
          boxShadow: iWon
            ? '0 0 50px rgba(232,184,74,0.4), 0 20px 60px rgba(0,0,0,0.7)'
            : '0 0 30px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 text-center"
          style={{
            background: iWon
              ? 'linear-gradient(180deg, #3d2010 0%, #2a1508 100%)'
              : 'linear-gradient(180deg, #2a1508 0%, #1a0d05 100%)',
            borderBottom: `1px solid ${iWon ? '#e8b84a' : '#6b3f1e'}`,
          }}
        >
          <div className="text-5xl mb-2 animate-float">{iWon ? '🏆' : '💜'}</div>
          <h2 className="font-display font-black text-3xl" style={{ color: iWon ? 'var(--gold-bright)' : '#9a8060' }}>
            {iWon ? '¡GANASTE!' : '¡PERDISTE!'}
          </h2>
          <p className="text-sm italic mt-1" style={{ color: iWon ? 'var(--gold)' : '#6b5040', fontFamily: 'var(--font-lora)' }}>
            {iWon
              ? `¡Adivinaste al personaje de ${opponentPlayer?.player_name ?? 'tu rival'}!`
              : `${opponentPlayer?.player_name ?? 'Tu rival'} adivinó tu personaje.`}
          </p>
        </div>

        {/* Revealed character */}
        {opponentSecretId && (
          <div className="px-6 py-4">
            <p className="text-xs text-center mb-3 italic" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>
              El personaje de {opponentPlayer?.player_name ?? 'tu rival'} era...
            </p>
            <RevealedCharacter characterId={opponentSecretId} characters={characters} />
          </div>
        )}

        {/* Buttons */}
        <div className="px-6 py-4 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(200,149,58,0.3)' }}>
          <button onClick={() => router.push('/room/create')} className="lumo-btn lumo-btn-primary w-full text-base py-3">
            ✦ Jugar de Nuevo
          </button>
          <button onClick={() => router.push('/')} className="lumo-btn lumo-btn-outline w-full py-2.5 text-sm">
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

function RevealedCharacter({ characterId, characters }: { characterId: string; characters: Character[] }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const character = characters.find(c => c.id === characterId);
  if (!character) return null;

  const ring = CATEGORY_RING[character.category_id] ?? {
    ring: '#c8953a', glow: 'rgba(200,149,58,0.5)', bg: '#2a1508', label: '#f5d878',
  };
  const initials = getInitials(character.name);

  return (
    <div
      className="flex items-center gap-4 rounded-xl p-3"
      style={{ background: 'rgba(0,0,0,0.08)', border: `1px solid rgba(200,149,58,0.3)` }}
    >
      <div
        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden relative"
        style={{ border: `2px solid ${ring.ring}`, background: ring.bg, boxShadow: `0 0 12px ${ring.glow}` }}
      >
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${imgLoaded ? 'opacity-0' : 'opacity-100'}`}>
          <span className="font-bold text-lg" style={{ color: ring.label }}>{initials}</span>
        </div>
        {character.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.image_url}
            alt={character.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
      </div>
      <div>
        <p className="font-display font-bold text-xl" style={{ color: '#2a1508' }}>{character.name}</p>
        <p className="text-sm" style={{ color: '#6b5040', fontFamily: 'var(--font-lora)' }}>{character.universe_or_country}</p>
        <p className="text-xs italic" style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}>{character.profession_or_role}</p>
      </div>
    </div>
  );
}
