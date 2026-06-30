import { NextRequest, NextResponse } from 'next/server';
import { generateRoomCode, shuffleArray } from '@/lib/gameUtils';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import { getCharactersByCategory } from '@/data/characters';
import type { CreateRoomPayload, Room, RoomPlayer } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomPayload & { vsAI?: boolean } = await req.json();
    const { playerName, playerId, categoryId, vsAI } = body;

    if (!playerName || !playerId || !categoryId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const code = generateRoomCode();

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();

      if (vsAI) {
        const categoryChars = getCharactersByCategory(categoryId);
        const shuffled = shuffleArray(categoryChars.map(c => c.id));
        const gameCharIds = shuffled.slice(0, Math.min(24, shuffled.length));
        const [secret1Id, secret2Id] = shuffleArray([...gameCharIds]);
        const aiId = `ai_${code}`;

        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .insert({
            code,
            category_id: categoryId,
            status: 'playing',
            game_character_ids: gameCharIds,
            current_turn_player_id: playerId,
          })
          .select()
          .single();
        if (roomError) throw roomError;

        await supabase.from('room_players').insert([
          { room_id: room.id, player_id: playerId, player_name: playerName, secret_character_id: secret1Id, position: 1, is_ready: true },
          { room_id: room.id, player_id: aiId, player_name: 'Lumo IA', secret_character_id: secret2Id, position: 2, is_ready: true },
        ]);

        return NextResponse.json({ room: { ...room, is_vs_ai: true }, code });
      }

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ code, category_id: categoryId, status: 'waiting' })
        .select()
        .single();
      if (roomError) throw roomError;

      await supabase.from('room_players').insert({
        room_id: room.id,
        player_id: playerId,
        player_name: playerName,
        position: 1,
      });

      return NextResponse.json({ room, code });
    }

    // ── Modo demo (sin Supabase) ──────────────────────────────────
    if (vsAI) {
      // vs IA: sala lista para jugar de inmediato
      const aiId = `ai_${code}`;
      const categoryChars = getCharactersByCategory(categoryId);
      const shuffled = shuffleArray(categoryChars.map(c => c.id));
      const gameCharIds = shuffled.slice(0, Math.min(24, shuffled.length));
      const [secret1Id, secret2Id] = shuffleArray([...gameCharIds]);

      const room: Room = {
        id: crypto.randomUUID(),
        code,
        status: 'playing',
        category_id: categoryId,
        game_character_ids: gameCharIds,
        current_turn_player_id: playerId,
        winner_player_id: null,
        created_at: new Date().toISOString(),
        is_vs_ai: true,
      };
      memDb.rooms.set(code, room);

      const humanPlayer: RoomPlayer = {
        id: crypto.randomUUID(),
        room_id: room.id,
        player_id: playerId,
        player_name: playerName,
        secret_character_id: secret1Id,
        dismissed_character_ids: [],
        position: 1,
        is_ready: true,
        created_at: new Date().toISOString(),
      };
      const aiPlayer: RoomPlayer = {
        id: crypto.randomUUID(),
        room_id: room.id,
        player_id: aiId,
        player_name: 'Lumo IA',
        secret_character_id: secret2Id,
        dismissed_character_ids: [],
        position: 2,
        is_ready: true,
        created_at: new Date().toISOString(),
      };
      memDb.players.set(room.id, [humanPlayer, aiPlayer]);
      memDb.questions.set(room.id, []);

      return NextResponse.json({ room, code });
    }

    const room: Room = {
      id: crypto.randomUUID(),
      code,
      status: 'waiting',
      category_id: categoryId,
      game_character_ids: [],
      current_turn_player_id: null,
      winner_player_id: null,
      created_at: new Date().toISOString(),
    };
    memDb.rooms.set(code, room);

    const player: RoomPlayer = {
      id: crypto.randomUUID(),
      room_id: room.id,
      player_id: playerId,
      player_name: playerName,
      secret_character_id: null,
      dismissed_character_ids: [],
      position: 1,
      is_ready: false,
      created_at: new Date().toISOString(),
    };
    memDb.players.set(room.id, [player]);
    memDb.questions.set(room.id, []);

    return NextResponse.json({ room, code });
  } catch (err) {
    console.error('Error creating room:', err);
    return NextResponse.json({ error: 'Error al crear la sala' }, { status: 500 });
  }
}
