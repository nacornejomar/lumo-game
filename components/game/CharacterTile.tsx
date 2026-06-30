'use client';

import { useState } from 'react';
import type { Character } from '@/types';
import clsx from 'clsx';

interface CharacterTileProps {
  character: Character;
  index: number;
  isDismissed: boolean;
  isGuessMode: boolean;
  onClick?: (character: Character) => void;
}

export function CharacterTile({ character, index, isDismissed, isGuessMode, onClick }: CharacterTileProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const initials = character.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleImgError = () => {
    if (retryCount < 3) {
      const delay = (retryCount + 1) * 6000;
      setTimeout(() => { setImgLoaded(false); setRetryCount(r => r + 1); }, delay);
    }
  };

  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-md overflow-hidden select-none transition-all duration-200 group',
        onClick ? 'cursor-pointer' : '',
      )}
      style={{
        background: 'linear-gradient(180deg, #3d2010 0%, #1e0e06 100%)',
        border: isDismissed ? '1.5px solid #3d2010' : '1.5px solid #6b3f1e',
        boxShadow: isGuessMode && !isDismissed
          ? '0 0 0 2px #e8b84a, 0 3px 10px rgba(0,0,0,0.5)'
          : isDismissed
          ? '0 2px 6px rgba(0,0,0,0.4)'
          : '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,149,58,0.2)',
      }}
      onClick={() => onClick?.(character)}
      title={isDismissed ? `${character.name} (descartado)` : character.name}
    >
      {/* Number badge */}
      <div
        className="absolute top-1 left-1 z-20 w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{
          background: isDismissed ? '#3d2010' : 'linear-gradient(135deg, #e8b84a, #a06020)',
          color: isDismissed ? '#6b5040' : '#1a0800',
          fontSize: '0.5rem',
          fontFamily: 'var(--font-cinzel)',
          fontWeight: 700,
          boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }}
      >
        {Number.isFinite(index) ? index + 1 : ''}
      </div>

      {/* Portrait */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {/* Loading shimmer */}
        {!imgLoaded && character.image_url && (
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(90deg, #2a1508 25%, #3d2010 50%, #2a1508 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s infinite',
          }} />
        )}

        {/* Initials fallback (no image_url or all retries exhausted) */}
        {(!character.image_url || retryCount >= 3) && !imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display font-bold" style={{ color: '#6b5040', fontSize: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
              {initials}
            </span>
          </div>
        )}

        {/* Character image */}
        {character.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={retryCount}
            src={character.image_url}
            alt={character.name}
            className={clsx(
              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
              imgLoaded ? 'opacity-100' : 'opacity-0',
              isDismissed ? 'grayscale opacity-40' : '',
            )}
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
            loading="lazy"
          />
        )}

        {/* Guess mode golden glow */}
        {isGuessMode && !isDismissed && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ boxShadow: 'inset 0 0 16px rgba(232,184,74,0.4)', border: '1px solid rgba(232,184,74,0.5)' }}
          />
        )}

        {/* Hover overlay */}
        {onClick && !isDismissed && (
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
        )}

        {/* Dismissed X badge */}
        {isDismissed && (
          <div
            className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(184,50,40,0.85)', color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}
          >
            ✕
          </div>
        )}

        {/* Inner frame accent */}
        <div
          className="absolute inset-0.5 pointer-events-none"
          style={{ border: '1px solid rgba(200,149,58,0.18)', borderRadius: '2px' }}
        />
      </div>

      {/* Name plaque */}
      <div
        className="px-1 py-[3px] text-center"
        style={{ background: 'linear-gradient(180deg, #2a1508 0%, #180c04 100%)' }}
      >
        <p
          className={clsx('leading-tight truncate', isDismissed ? 'opacity-30 line-through' : '')}
          style={{
            color: isDismissed ? '#6b5040' : '#c8953a',
            fontFamily: 'var(--font-cinzel)',
            fontWeight: 600,
            fontSize: 'clamp(0.45rem, 1.5vw, 0.58rem)',
            letterSpacing: '0.03em',
          }}
        >
          {character.name}
        </p>
      </div>

      {/* Corner accents */}
      {!isDismissed && (
        <>
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l pointer-events-none" style={{ borderColor: 'rgba(232,184,74,0.5)' }} />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r pointer-events-none" style={{ borderColor: 'rgba(232,184,74,0.5)' }} />
        </>
      )}
    </div>
  );
}
