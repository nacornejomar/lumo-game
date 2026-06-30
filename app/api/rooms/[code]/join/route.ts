import { NextRequest, NextResponse } from 'next/server';
import { shuffleArray } from '@/lib/gameUtils';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import { SEED_CHARACTERS, getCharactersByCategory } from '@/data/characters';
import type { JoinRoomPayload, RoomPlayer } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body: JoinRoomPayload = await req.json();
    const { playerName, playerId } = body;
    const code = params.code.toUpperCase();

    if (!playerName || !playerId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();

      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single();
      if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
      if (room.status !== 'waiting') return NextResponse.json({ error: 'Esta sala ya está en juego' }, { status: 400 });

      const { data: existingPlayers } = await supabase.from('room_players').select('*').eq('room_id', room.id);
      if (!existingPlayers?.length) return NextResponse.json({ error: 'La sala no tiene jugadores' }, { status: 400 });

      const alreadyJoined = existingPlayers.find(p => p.player_id === playerId);
      if (alreadyJoined) return NextResponse.json({ room, alreadyJoined: true });
      if (existingPlayers.length >= 2) return NextResponse.json({ error: 'La sala está llena' }, { status: 400 });

      await supabase.from('room_players').insert({ room_id: room.id, player_id: playerId, player_name: playerName, position: 2 });

      const { data: chars } = await supabase.from('characters').select('id').eq('category_id', room.category_id).eq('active', true);
      if (!chars || chars.length < 4) return NextResponse.json({ error: 'No hay suficientes personajes' }, { status: 400 });

      const shuffled = shuffleArray(chars.map(c => c.id));
      const gameCharIds = shuffled.slice(0, Math.min(24, shuffled.length));
      const secret1Id = shuffleArray([...gameCharIds])[0];
      const secret2Id = shuffleArray(gameCharIds.filter(id => id !== secret1Id))[0];

      await supabase.from('rooms').update({ status: 'playing', game_character_ids: gameCharIds, current_turn_player_id: existingPlayers[0].player_id }).eq('id', room.id);
      await supabase.from('room_players').update({ secret_character_id: secret1Id }).eq('room_id', room.id).eq('player_id', existingPlayers[0].player_id);
      await supabase.from('room_players').update({ secret_character_id: secret2Id }).eq('room_id', room.id).eq('player_id', playerId);

      return NextResponse.json({ room: { ...room, status: 'playing' }, started: true });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Esta sala ya está en juego' }, { status: 400 });

    const existingPlayers = memDb.players.get(room.id) ?? [];
    const alreadyJoined = existingPlayers.find(p => p.player_id === playerId);
    if (alreadyJoined) return NextResponse.json({ room, alreadyJoined: true });
    if (existingPlayers.length >= 2) return NextResponse.json({ error: 'La sala está llena' }, { status: 400 });

    // Obtener personajes de la categoría desde los datos semilla
    const categoryChars = getCharactersByCategory(room.category_id);
    if (categoryChars.length < 4) return NextResponse.json({ error: 'No hay suficientes personajes' }, { status: 400 });

    const shuffled = shuffleArray(categoryChars.map(c => c.id));
    const gameCharIds = shuffled.slice(0, Math.min(24, shuffled.length));
    const secret1Id = shuffleArray([...gameCharIds])[0];
    const secret2Id = shuffleArray(gameCharIds.filter(id => id !== secret1Id))[0];

    // Añadir jugador 2
    const player2: RoomPlayer = {
      id: crypto.randomUUID(),
      room_id: room.id,
      player_id: playerId,
      player_name: playerName,
      secret_character_id: secret2Id,
      dismissed_character_ids: [],
      position: 2,
      is_ready: false,
      created_at: new Date().toISOString(),
    };

    // Asignar secreto a jugador 1
    const updatedPlayers = existingPlayers.map(p =>
      p.position === 1 ? { ...p, secret_character_id: secret1Id } : p
    );
    updatedPlayers.push(player2);
    memDb.players.set(room.id, updatedPlayers);

    // Actualizar sala
    const updatedRoom = {
      ...room,
      status: 'playing' as const,
      game_character_ids: gameCharIds,
      current_turn_player_id: existingPlayers[0].player_id,
    };
    memDb.rooms.set(code, updatedRoom);

    return NextResponse.json({ room: updatedRoom, started: true });
  } catch (err) {
    console.error('Error joining room:', err);
    return NextResponse.json({ error: 'Error al unirse a la sala' }, { status: 500 });
  }
}
