'use client';

import { CharacterTile } from './CharacterTile';
import type { Character } from '@/types';

interface CharacterGridProps {
  characters: Character[];
  dismissedIds: Set<string>;
  isGuessMode: boolean;
  onCharacterClick: (character: Character) => void;
}

export function CharacterGrid({ characters, dismissedIds, isGuessMode, onCharacterClick }: CharacterGridProps) {
  if (characters.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-xl min-h-48"
        style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(107,63,30,0.4)' }}
      >
        <p className="text-sm italic animate-pulse" style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}>
          Cargando personajes...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Grid */}
      <div
        className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,16,6,0.7), rgba(14,8,4,0.9))',
          border: '2px solid rgba(107,63,30,0.5)',
          boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        {characters.map((char, i) => (
          <CharacterTile
            key={char.id}
            character={char}
            index={i}
            isDismissed={dismissedIds.has(char.id)}
            isGuessMode={isGuessMode}
            onClick={onCharacterClick}
          />
        ))}
      </div>

      {/* Hint text */}
      <p
        className="text-center text-xs italic opacity-50"
        style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}
      >
        {isGuessMode
          ? '✦ Haz clic en el personaje de tu rival para adivinar'
          : 'Clic en una carta para descartarla · Solo tú ves tus descartes'}
      </p>
    </div>
  );
}
