import { NextRequest, NextResponse } from 'next/server';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import { SEED_CHARACTERS } from '@/data/characters';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();

      const { data: room, error: roomError } = await supabase
        .from('rooms').select('*').eq('code', code).single();
      if (roomError || !room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

      const { data: players } = await supabase
        .from('room_players')
        .select('id,room_id,player_id,player_name,position,is_ready,dismissed_character_ids,created_at')
        .eq('room_id', room.id).order('position');

      const { data: questions } = await supabase
        .from('questions').select('*').eq('room_id', room.id).order('asked_at');

      let characters: unknown[] = [];
      if (room.game_character_ids?.length > 0) {
        const { data: chars } = await supabase.from('characters').select('*').in('id', room.game_character_ids);
        characters = chars ?? [];
      }

      const isVsAI = (players ?? []).some(p => p.player_id.startsWith('ai_'));
      return NextResponse.json({ room: { ...room, is_vs_ai: isVsAI }, players: players ?? [], questions: questions ?? [], characters });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

    const players = (memDb.players.get(room.id) ?? []).map(p => ({
      ...p, secret_character_id: undefined, // no exponer secretos en lista
    }));
    const questions = memDb.questions.get(room.id) ?? [];

    const characters = room.game_character_ids.length > 0
      ? SEED_CHARACTERS.filter(c => room.game_character_ids.includes(c.id))
      : [];

    return NextResponse.json({ room, players, questions, characters });
  } catch (err) {
    console.error('Error fetching room:', err);
    return NextResponse.json({ error: 'Error al obtener la sala' }, { status: 500 });
  }
}
