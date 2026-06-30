import { NextRequest, NextResponse } from 'next/server';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import type { GuessPayload } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body: GuessPayload = await req.json();
    const { guessCharacterId, guesserId } = body;
    const code = params.code.toUpperCase();

    if (!guessCharacterId || !guesserId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();
      const { data: room } = await supabase.from('rooms').select('id,status,current_turn_player_id').eq('code', code).single();
      if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
      if (room.current_turn_player_id !== guesserId) return NextResponse.json({ error: 'No es tu turno' }, { status: 403 });
      const { data: players } = await supabase.from('room_players').select('player_id,secret_character_id').eq('room_id', room.id);
      const opponent = players?.find(p => p.player_id !== guesserId);
      if (!opponent) return NextResponse.json({ error: 'Oponente no encontrado' }, { status: 400 });
      const isCorrect = opponent.secret_character_id === guessCharacterId;
      const winnerId = isCorrect ? guesserId : opponent.player_id;
      await supabase.from('rooms').update({ status: 'finished', winner_player_id: winnerId }).eq('id', room.id);
      return NextResponse.json({ isCorrect, winnerId, opponentSecretId: opponent.secret_character_id });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
    if (room.current_turn_player_id !== guesserId) return NextResponse.json({ error: 'No es tu turno' }, { status: 403 });

    const players = memDb.players.get(room.id) ?? [];
    const opponent = players.find(p => p.player_id !== guesserId);
    if (!opponent) return NextResponse.json({ error: 'Oponente no encontrado' }, { status: 400 });

    const isCorrect = opponent.secret_character_id === guessCharacterId;
    const winnerId = isCorrect ? guesserId : opponent.player_id;

    memDb.rooms.set(code, { ...room, status: 'finished', winner_player_id: winnerId });

    return NextResponse.json({ isCorrect, winnerId, opponentSecretId: opponent.secret_character_id });
  } catch (err) {
    console.error('Error guessing:', err);
    return NextResponse.json({ error: 'Error al adivinar' }, { status: 500 });
  }
}
