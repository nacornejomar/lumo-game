'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlayerIdFromStorage, getPlayerNameFromStorage } from '@/lib/gameUtils';
import { useGame } from '@/hooks/useGame';
import { CharacterGrid } from '@/components/game/CharacterGrid';
import { QuestionPanel } from '@/components/game/QuestionPanel';
import { GameHeader } from '@/components/game/GameHeader';
import { SecretCharacterPanel } from '@/components/game/SecretCharacterPanel';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import type { Character } from '@/types';

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string).toUpperCase();

  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [guessResult, setGuessResult] = useState<{ opponentSecretId: string } | null>(null);
  const [guessError, setGuessError] = useState('');

  useEffect(() => {
    const id = getPlayerIdFromStorage();
    const name = getPlayerNameFromStorage();
    if (!id || !name) { router.push('/'); return; }
    setPlayerId(id);
    setPlayerName(name);
  }, [router]);

  const { state, askQuestion, answerQuestion, dismissCharacter, guessCharacter, setGuessMode, refetch } =
    useGame(roomCode, playerId);

  const { room, characters, mySecretCharacter, myPlayer, opponentPlayer, questions, dismissedIds, isMyTurn, isLoading, error, isGuessMode } = state;

  const handleCharacterClick = async (character: Character) => {
    if (!room || room.status !== 'playing') return;

    if (isGuessMode && isMyTurn) {
      const confirm = window.confirm(
        `¿Estás seguro de que el personaje del rival es "${character.name}"?\n\n⚠️ Si fallas, ¡perderás!`
      );
      if (!confirm) return;
      try {
        const result = await guessCharacter(character.id);
        setGuessResult({ opponentSecretId: result.opponentSecretId });
        setGuessMode(false);
        refetch();
      } catch (err) {
        setGuessError(err instanceof Error ? err.message : 'Error');
        setGuessMode(false);
      }
      return;
    }

    if (room.status === 'playing') dismissCharacter(character.id);
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (!playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--wood-deep)' }}>
        <p className="animate-pulse font-display text-sm" style={{ color: 'var(--gold)' }}>Cargando...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--wood-deep)' }}>
        <div className="text-4xl animate-spin-slow" style={{ color: 'var(--gold)' }}>✦</div>
        <p className="font-display text-lg animate-pulse" style={{ color: 'var(--gold)' }}>Cargando sala...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" style={{ background: 'var(--wood-deep)' }}>
        <div className="text-5xl">✧</div>
        <p className="font-display text-xl" style={{ color: 'var(--cream)' }}>Sala no encontrada</p>
        <p className="text-sm italic" style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}>{error}</p>
        <button onClick={() => router.push('/')} className="lumo-btn lumo-btn-primary mt-2">
          Volver al inicio
        </button>
      </div>
    );
  }

  // ── Waiting ───────────────────────────────────────────────────────
  if (room.status === 'waiting') {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomCode}`;
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'var(--wood-deep)' }}
      >
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-float select-none" style={{ color: 'var(--gold)' }}>✦</div>
            <h1 className="lumo-logo text-4xl mb-2">Lumo</h1>
            <h2 className="font-display font-bold text-xl" style={{ color: 'var(--cream)' }}>Sala Creada</h2>
            <p className="text-sm italic mt-1" style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}>
              Comparte el código con tu rival
            </p>
          </div>

          <div
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--parchment)', border: '2px solid var(--gold)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#7a6048', fontFamily: 'var(--font-cinzel)' }}>Código de sala</p>
              <div
                className="rounded-xl py-4 px-6 font-display font-black text-4xl tracking-[0.3em] cursor-pointer transition-all hover:opacity-80"
                style={{ background: 'var(--wood-mid)', color: 'var(--gold)', border: '2px solid #6b3f1e', letterSpacing: '0.3em' }}
                onClick={() => navigator.clipboard.writeText(roomCode)}
                title="Clic para copiar"
              >
                {roomCode}
              </div>
              <p className="text-xs mt-1 opacity-50" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>Clic para copiar</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#7a6048', fontFamily: 'var(--font-cinzel)' }}>Enlace directo</p>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                style={{ background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(200,149,58,0.3)' }}
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                <span className="text-xs truncate flex-1" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>{shareUrl}</span>
                <span className="text-sm shrink-0">📋</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--leaf)' }} />
              <p className="text-sm font-display" style={{ color: '#3a2010' }}>
                Esperando a que alguien se una...
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(200,149,58,0.2)' }}>
              <span className="text-sm" style={{ color: 'var(--leaf)' }}>✓</span>
              <span className="text-sm" style={{ color: '#3a2010', fontFamily: 'var(--font-lora)' }}>{myPlayer?.player_name ?? playerName}</span>
              <span className="text-xs ml-auto" style={{ color: '#9a8060', fontFamily: 'var(--font-cinzel)' }}>Creador</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="text-xs text-center opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}
          >
            Cancelar y volver
          </button>
        </div>
      </main>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────
  const isFinished = room.status === 'finished';

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--wood-deep)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30">
        <GameHeader room={room} myPlayer={myPlayer} opponentPlayer={opponentPlayer} playerId={playerId} roomCode={roomCode} />
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-3 p-3 pb-4 max-w-[1400px] mx-auto w-full">

        {/* Left — secret character */}
        <div className="lg:order-1">
          <SecretCharacterPanel character={mySecretCharacter} room={room} isMyTurn={isMyTurn} />
        </div>

        {/* Center — character grid */}
        <div className="lg:order-2">
          <CharacterGrid
            characters={characters}
            dismissedIds={dismissedIds}
            isGuessMode={isGuessMode && isMyTurn}
            onCharacterClick={handleCharacterClick}
          />
          {guessError && (
            <div
              className="mt-2 rounded-lg px-3 py-2 text-center text-sm font-display animate-shake"
              style={{ background: 'rgba(184,50,40,0.15)', border: '1px solid #b83228', color: '#c84030' }}
            >
              {guessError}
            </div>
          )}
        </div>

        {/* Right — questions */}
        <div className="lg:order-3">
          <QuestionPanel
            questions={questions}
            isMyTurn={isMyTurn}
            playerId={playerId}
            myPlayer={myPlayer}
            opponentPlayer={opponentPlayer}
            onAskQuestion={askQuestion}
            onAnswerQuestion={answerQuestion}
            onStartGuess={() => setGuessMode(true)}
            isGuessMode={isGuessMode && isMyTurn}
            onCancelGuess={() => setGuessMode(false)}
            roomStatus={room.status}
            isVsAI={room.is_vs_ai}
          />
        </div>
      </div>

      {isFinished && (
        <VictoryScreen
          room={room}
          playerId={playerId}
          myPlayer={myPlayer}
          opponentPlayer={opponentPlayer}
          characters={characters}
          opponentSecretId={guessResult?.opponentSecretId}
        />
      )}
    </main>
  );
}
