'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPlayerIdFromStorage, getPlayerNameFromStorage } from '@/lib/gameUtils';

function MatchmakingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const categoryId = params.get('cat') ?? 'cat-hp';
  const nameFromParam = params.get('name') ?? '';

  const [status, setStatus] = useState<'waiting' | 'matched' | 'timeout' | 'error'>('waiting');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef('');
  const joinedRef = useRef(false);

  useEffect(() => {
    const playerId = getPlayerIdFromStorage();
    const playerName = nameFromParam || getPlayerNameFromStorage();
    playerIdRef.current = playerId;

    if (!playerName) { router.push('/'); return; }

    const join = async () => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName, categoryId }),
      });
      const data = await res.json();
      if (data.status === 'matched') {
        setStatus('matched');
        setRoomCode(data.roomCode);
        setTimeout(() => router.push(`/room/${data.roomCode}`), 1200);
        return;
      }
    };

    join();

    // Poll for match
    pollRef.current = setInterval(async () => {
      setWaitSeconds(s => s + 1);
      const res = await fetch(`/api/matchmaking?playerId=${playerId}`);
      const data = await res.json();
      if (data.status === 'matched') {
        clearInterval(pollRef.current!);
        setStatus('matched');
        setRoomCode(data.roomCode);
        setTimeout(() => router.push(`/room/${data.roomCode}`), 1200);
      } else if (data.status === 'timeout') {
        clearInterval(pollRef.current!);
        setStatus('timeout');
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Leave queue on unmount if still waiting
      fetch(`/api/matchmaking?playerId=${playerId}`, { method: 'DELETE' });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayAI = async () => {
    const playerId = getPlayerIdFromStorage();
    const playerName = nameFromParam || getPlayerNameFromStorage();
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, playerId, categoryId, vsAI: true }),
    });
    if (!res.ok) { router.push('/'); return; }
    const { code } = await res.json();
    router.push(`/room/${code}`);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--wood-deep)' }}
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-6 text-center">
        <h1 className="lumo-logo text-5xl">Lumo</h1>

        {status === 'waiting' && (
          <>
            {/* Animated search ring */}
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full border-4 border-lumo-border" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-lumo-primary animate-spin"
                style={{ animationDuration: '1.2s' }}
              />
              <div className="absolute inset-4 rounded-full border-2 border-lumo-light opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">🎲</span>
              </div>
            </div>

            <div>
              <p className="font-body font-bold text-lumo-text text-lg">Buscando rival...</p>
              <p className="font-body text-sm text-lumo-muted mt-1">
                {waitSeconds < 5 ? 'Conectando con otros jugadores' : `${waitSeconds}s esperando`}
              </p>
            </div>

            {waitSeconds >= 15 && (
              <div className="lumo-card rounded-xl p-4 w-full animate-slide-up">
                <p className="text-sm font-body text-lumo-muted mb-3">¿No aparece nadie? Puedes jugar contra la IA mientras esperas.</p>
                <button onClick={handlePlayAI} className="lumo-btn lumo-btn-outline w-full text-sm">
                  🤖 Jugar vs IA ahora
                </button>
              </div>
            )}

            <button
              onClick={() => router.push('/')}
              className="text-xs font-body text-lumo-muted opacity-60 hover:opacity-100 transition-opacity"
            >
              ← Cancelar búsqueda
            </button>
          </>
        )}

        {status === 'matched' && (
          <>
            <div className="text-6xl animate-float">🎉</div>
            <div>
              <p className="font-body font-black text-lumo-primary text-xl">¡Rival encontrado!</p>
              <p className="font-body text-sm text-lumo-muted mt-1">Entrando a la sala {roomCode}...</p>
            </div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-lumo-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="text-5xl">⏱️</div>
            <div>
              <p className="font-body font-bold text-lumo-text text-lg">Sin rivales disponibles</p>
              <p className="font-body text-sm text-lumo-muted mt-1">No se encontró ningún jugador en este momento.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={handlePlayAI} className="lumo-btn lumo-btn-primary w-full text-sm">
                🤖 Jugar vs IA
              </button>
              <button onClick={() => router.push('/')} className="lumo-btn lumo-btn-outline w-full text-sm">
                Volver al inicio
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function MatchmakingPage() {
  return (
    <Suspense fallback={null}>
      <MatchmakingContent />
    </Suspense>
  );
}
