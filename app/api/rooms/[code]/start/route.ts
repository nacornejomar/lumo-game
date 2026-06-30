import { NextRequest, NextResponse } from 'next/server';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import { SEED_CHARACTERS } from '@/data/characters';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const playerId = req.nextUrl.searchParams.get('playerId');
    const code = params.code.toUpperCase();
    if (!playerId) return NextResponse.json({ error: 'Falta playerId' }, { status: 400 });

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();
      const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single();
      if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
      const { data: player } = await supabase.from('room_players').select('secret_character_id,dismissed_character_ids').eq('room_id', room.id).eq('player_id', playerId).single();
      if (!player?.secret_character_id) return NextResponse.json({ secretCharacterId: null });
      const { data: character } = await supabase.from('characters').select('*').eq('id', player.secret_character_id).single();
      return NextResponse.json({ secretCharacterId: player.secret_character_id, secretCharacter: character, dismissedIds: player.dismissed_character_ids ?? [] });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

    const players = memDb.players.get(room.id) ?? [];
    const player = players.find(p => p.player_id === playerId);
    if (!player?.secret_character_id) return NextResponse.json({ secretCharacterId: null });

    const character = SEED_CHARACTERS.find(c => c.id === player.secret_character_id) ?? null;
    return NextResponse.json({
      secretCharacterId: player.secret_character_id,
      secretCharacter: character,
      dismissedIds: player.dismissed_character_ids ?? [],
    });
  } catch (err) {
    console.error('Error fetching secret:', err);
    return NextResponse.json({ error: 'Error al obtener personaje secreto' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { playerId, characterId, action } = await req.json();
    const code = params.code.toUpperCase();

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();
      const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single();
      if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
      const { data: player } = await supabase.from('room_players').select('dismissed_character_ids').eq('room_id', room.id).eq('player_id', playerId).single();
      if (!player) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
      const current: string[] = player.dismissed_character_ids ?? [];
      const updated = action === 'dismiss' ? (current.includes(characterId) ? current : [...current, characterId]) : current.filter((id: string) => id !== characterId);
      await supabase.from('room_players').update({ dismissed_character_ids: updated }).eq('room_id', room.id).eq('player_id', playerId);
      return NextResponse.json({ dismissedIds: updated });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

    const players = memDb.players.get(room.id) ?? [];
    const idx = players.findIndex(p => p.player_id === playerId);
    if (idx < 0) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });

    const current = players[idx].dismissed_character_ids ?? [];
    const updated = action === 'dismiss'
      ? (current.includes(characterId) ? current : [...current, characterId])
      : current.filter((id: string) => id !== characterId);

    players[idx] = { ...players[idx], dismissed_character_ids: updated };
    memDb.players.set(room.id, players);

    return NextResponse.json({ dismissedIds: updated });
  } catch (err) {
    console.error('Error updating dismissed:', err);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
