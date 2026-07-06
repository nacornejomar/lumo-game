'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { GameState, Room, Character, Question, RoomPlayer } from '@/types';

const INITIAL_STATE: GameState = {
  room: null,
  characters: [],
  mySecretCharacter: null,
  myPlayer: null,
  opponentPlayer: null,
  questions: [],
  dismissedIds: new Set(),
  isMyTurn: false,
  isLoading: true,
  error: null,
  isGuessMode: false,
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hasSupabase = !!(SUPABASE_URL && SUPABASE_URL !== 'https://xxxx.supabase.co');

export function useGame(roomCode: string, playerId: string) {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const channelRef = useRef<ReturnType<import('@supabase/supabase-js').SupabaseClient['channel']> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secretLoadedRef = useRef(false);
  const lastAiTriggerRef = useRef('');
  const lastLoadTsRef = useRef(0);

  const loadSecret = useCallback(async (code: string, pid: string) => {
    if (secretLoadedRef.current) return;
    const res = await fetch(`/api/rooms/${code}/start?playerId=${pid}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.secretCharacter) {
      secretLoadedRef.current = true;
      setState(prev => ({
        ...prev,
        mySecretCharacter: data.secretCharacter,
        dismissedIds: new Set<string>(data.dismissedIds ?? []),
      }));
    }
  }, []);

  const loadGameData = useCallback(async (silent = false) => {
    if (!roomCode || !playerId) return;
    const startedAt = Date.now();
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Sala no encontrada');
      const data = await res.json();

      const { room, players, questions, characters } = data as {
        room: Room; players: RoomPlayer[]; questions: Question[]; characters: Character[];
      };

      const myPlayer = players.find(p => p.player_id === playerId) ?? null;
      const opponentPlayer = players.find(p => p.player_id !== playerId) ?? null;

      setState(prev => {
        const isFresh = startedAt >= lastLoadTsRef.current;
        if (isFresh) lastLoadTsRef.current = startedAt;

        // Smart merge: for each question prefer whichever version has more info.
        // A stale server response might return q1 without an answer even though
        // Realtime already delivered the answered version — keep the answered one.
        const mergedMap = new Map<string, Question>();
        for (const q of (questions ?? [])) mergedMap.set(q.id, q as Question);
        for (const q of prev.questions) {
          const srv = mergedMap.get(q.id);
          if (!srv) {
            mergedMap.set(q.id, q); // local-only: keep
          } else if (q.answer !== null && srv.answer === null) {
            mergedMap.set(q.id, q); // local answered, server stale: keep local
          }
        }
        const merged = Array.from(mergedMap.values())
          .sort((a, b) => new Date(a.asked_at).getTime() - new Date(b.asked_at).getTime());

        return {
          ...prev,
          ...(isFresh ? {
            room,
            characters: characters.length > 0 ? characters : prev.characters,
            myPlayer,
            opponentPlayer,
            isMyTurn: room.current_turn_player_id === playerId,
          } : {}),
          questions: merged,
          isLoading: false,
          error: null,
        };
      });

      if ((room.status === 'playing' || room.status === 'finished') && !secretLoadedRef.current) {
        loadSecret(roomCode, playerId);
      }
    } catch (err) {
      if (!silent) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        }));
      }
    }
  }, [roomCode, playerId, loadSecret]);

  const subscribeSupabase = useCallback(async () => {
    const { createClientSupabase } = await import('@/lib/supabase');
    const supabase = createClientSupabase(); // singleton — same instance every call

    // Remove any previous channel for this room before subscribing again
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` },
        (payload) => {
          const updatedRoom = payload.new as Room;
          setState(prev => ({ ...prev, room: updatedRoom, isMyTurn: updatedRoom.current_turn_player_id === playerId }));
          if (updatedRoom.status === 'playing' && !secretLoadedRef.current) loadSecret(roomCode, playerId);
          if (updatedRoom.status === 'playing' && updatedRoom.game_character_ids?.length > 0) loadGameData(true);
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' },
        (payload) => {
          const q = payload.new as Question;
          setState(prev => prev.questions.some(x => x.id === q.id) ? prev : { ...prev, questions: [...prev.questions, q] });
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions' },
        (payload) => {
          const updated = payload.new as Question;
          setState(prev => ({ ...prev, questions: prev.questions.map(q => q.id === updated.id ? updated : q) }));
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_players' },
        () => loadGameData(true))
      .subscribe();

    channelRef.current = channel;
  }, [roomCode, playerId, loadGameData, loadSecret]);

  useEffect(() => {
    loadGameData();

    if (hasSupabase) {
      subscribeSupabase();
      // Safety-net poll: catches any state missed by Realtime
      pollRef.current = setInterval(() => loadGameData(true), 4000);
    } else {
      // Modo demo: polling cada 2.5s
      pollRef.current = setInterval(() => loadGameData(true), 2500);
    }

    return () => {
      if (hasSupabase && channelRef.current) {
        const ch = channelRef.current;
        channelRef.current = null;
        import('@/lib/supabase').then(({ createClientSupabase }) => {
          createClientSupabase().removeChannel(ch); // same singleton — actually removes it
        });
      }
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomCode, playerId]);

  const askQuestion = useCallback(async (questionText: string) => {
    const res = await fetch(`/api/rooms/${roomCode}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText, askerId: playerId }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const data = await res.json();
    // Optimistically add the question so the AI trigger fires without waiting for Realtime
    if (data.question) {
      setState(prev => prev.questions.some(q => q.id === data.question.id)
        ? prev
        : { ...prev, questions: [...prev.questions, data.question] });
    }
    return data;
  }, [roomCode, playerId]);

  const answerQuestion = useCallback(async (questionId: string, answer: 'yes' | 'no') => {
    const res = await fetch(`/api/rooms/${roomCode}/questions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answer, answererId: playerId }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    // Always reload to get fresh turn state (don't rely solely on Realtime)
    await loadGameData(true);
    return { success: true };
  }, [roomCode, playerId, loadGameData]);

  const dismissCharacter = useCallback(async (characterId: string) => {
    const willDismiss = !state.dismissedIds.has(characterId);
    setState(prev => {
      const newSet = new Set(prev.dismissedIds);
      willDismiss ? newSet.add(characterId) : newSet.delete(characterId);
      return { ...prev, dismissedIds: newSet };
    });
    await fetch(`/api/rooms/${roomCode}/start`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, characterId, action: willDismiss ? 'dismiss' : 'restore' }),
    });
  }, [roomCode, playerId, state.dismissedIds]);

  const guessCharacter = useCallback(async (characterId: string) => {
    const res = await fetch(`/api/rooms/${roomCode}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessCharacterId: characterId, guesserId: playerId }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    if (!hasSupabase) await loadGameData(true);
    return res.json();
  }, [roomCode, playerId, loadGameData]);

  const setGuessMode = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, isGuessMode: active }));
  }, []);

  // ── AI turn automation ───────────────────────────────────────────────────
  // Keep loadGameData in a ref so the AI effect doesn't depend on its identity
  const loadGameDataRef = useRef(loadGameData);
  useEffect(() => { loadGameDataRef.current = loadGameData; });

  // Derive stable primitives so polling (new array refs) doesn't cancel the timer
  const _aiId = `ai_${roomCode}`;
  const pendingHumanQId =
    state.room?.is_vs_ai && state.room.status === 'playing'
      ? (state.questions.find(q => q.asker_player_id !== _aiId && q.answer === null)?.id ?? null)
      : null;
  const aiTurnActive =
    state.room?.is_vs_ai &&
    state.room.status === 'playing' &&
    state.room.current_turn_player_id === _aiId;

  useEffect(() => {
    if (!pendingHumanQId && !aiTurnActive) return;

    const aiId = `ai_${roomCode}`;
    const triggerKey = pendingHumanQId ?? `turn-${aiId}`;
    if (lastAiTriggerRef.current === triggerKey) return;
    lastAiTriggerRef.current = triggerKey;

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/rooms/${roomCode}/ai-turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiId }),
        });
        await loadGameDataRef.current(true);
      } catch {
        // next poll will retry
      }
    }, 1400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHumanQId, aiTurnActive, roomCode]);

  return { state, askQuestion, answerQuestion, dismissCharacter, guessCharacter, setGuessMode, refetch: loadGameData };
}
