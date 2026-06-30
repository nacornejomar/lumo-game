import { NextRequest, NextResponse } from 'next/server';
import { generateRoomCode, shuffleArray } from '@/lib/gameUtils';
import { memDb, matchQueue } from '@/lib/memoryStore';
import { getCharactersByCategory } from '@/data/characters';
import type { Room, RoomPlayer } from '@/types';

// POST — join queue or get instantly matched
export async function POST(req: NextRequest) {
  try {
    const { playerId, playerName, categoryId } = await req.json();
    if (!playerId || !playerName || !categoryId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Already in queue and matched?
    const existing = matchQueue.get(playerId);
    if (existing?.matchedRoomCode) {
      matchQueue.delete(playerId);
      return NextResponse.json({ status: 'matched', roomCode: existing.matchedRoomCode });
    }

    // Find another waiting player (anyone except self)
    const waiting = Array.from(matchQueue.values()).find(e => e.playerId !== playerId && !e.matchedRoomCode);

    if (waiting) {
      // Match found — create the room with both players
      const code = generateRoomCode();
      const categoryToUse = waiting.categoryId; // first player's category
      const allChars = getCharactersByCategory(categoryToUse);
      const shuffled = shuffleArray(allChars.map(c => c.id));
      const gameCharIds = shuffled.slice(0, Math.min(24, shuffled.length));
      const [s1, s2] = shuffleArray([...gameCharIds]);

      const room: Room = {
        id: crypto.randomUUID(),
        code,
        status: 'playing',
        category_id: categoryToUse,
        game_character_ids: gameCharIds,
        current_turn_player_id: waiting.playerId,
        winner_player_id: null,
        created_at: new Date().toISOString(),
      };
      memDb.rooms.set(code, room);

      const p1: RoomPlayer = {
        id: crypto.randomUUID(),
        room_id: room.id,
        player_id: waiting.playerId,
        player_name: waiting.playerName,
        secret_character_id: s1,
        dismissed_character_ids: [],
        position: 1,
        is_ready: true,
        created_at: new Date().toISOString(),
      };
      const p2: RoomPlayer = {
        id: crypto.randomUUID(),
        room_id: room.id,
        player_id: playerId,
        player_name: playerName,
        secret_character_id: s2,
        dismissed_character_ids: [],
        position: 2,
        is_ready: true,
        created_at: new Date().toISOString(),
      };
      memDb.players.set(room.id, [p1, p2]);
      memDb.questions.set(room.id, []);

      // Notify the waiting player via their queue entry
      matchQueue.set(waiting.playerId, { ...waiting, matchedRoomCode: code });
      // Remove self from queue (already matched)
      matchQueue.delete(playerId);

      return NextResponse.json({ status: 'matched', roomCode: code });
    }

    // No one waiting — add to queue
    matchQueue.set(playerId, { playerId, playerName, categoryId, enteredAt: new Date().toISOString() });
    return NextResponse.json({ status: 'waiting' });
  } catch (err) {
    console.error('Matchmaking error:', err);
    return NextResponse.json({ error: 'Error en matchmaking' }, { status: 500 });
  }
}

// GET — poll status
export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('playerId');
  if (!playerId) return NextResponse.json({ error: 'Falta playerId' }, { status: 400 });

  const entry = matchQueue.get(playerId);
  if (!entry) return NextResponse.json({ status: 'not_in_queue' });

  if (entry.matchedRoomCode) {
    matchQueue.delete(playerId);
    return NextResponse.json({ status: 'matched', roomCode: entry.matchedRoomCode });
  }

  // Prune stale entries (>90 seconds)
  const age = Date.now() - new Date(entry.enteredAt).getTime();
  if (age > 90_000) {
    matchQueue.delete(playerId);
    return NextResponse.json({ status: 'timeout' });
  }

  return NextResponse.json({ status: 'waiting', waitSeconds: Math.floor(age / 1000) });
}

// DELETE — leave queue
export async function DELETE(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('playerId');
  if (playerId) matchQueue.delete(playerId);
  return NextResponse.json({ ok: true });
}
