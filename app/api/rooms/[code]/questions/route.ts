import { NextRequest, NextResponse } from 'next/server';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import type { AskQuestionPayload, AnswerQuestionPayload, Question } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body: AskQuestionPayload = await req.json();
    const { questionText, askerId } = body;
    const code = params.code.toUpperCase();

    if (!questionText?.trim() || !askerId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();
      const { data: room } = await supabase.from('rooms').select('id,status,current_turn_player_id').eq('code', code).single();
      if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });

      // In vs-AI mode the AI never uses this endpoint, so allow the human to ask
      // as long as there is no pending unanswered question (avoids double-asks).
      const isAiAsker = askerId.startsWith('ai_');
      const isAiTurn = room.current_turn_player_id?.startsWith('ai_');

      if (isAiAsker) {
        return NextResponse.json({ error: 'La IA usa otro endpoint' }, { status: 403 });
      }

      if (!isAiTurn) {
        // Normal multiplayer check: must be the asker's turn
        if (room.current_turn_player_id !== askerId) {
          return NextResponse.json({ error: 'No es tu turno' }, { status: 403 });
        }
      } else {
        // AI has the turn — human should only be answering, not asking.
        // But allow if there is no pending AI question yet (timing gap).
        const { data: pendingQ } = await supabase
          .from('questions')
          .select('id')
          .eq('room_id', room.id)
          .like('asker_player_id', 'ai_%')
          .is('answer', null)
          .limit(1);
        if (pendingQ && pendingQ.length > 0) {
          return NextResponse.json({ error: 'Responde primero la pregunta de la IA' }, { status: 403 });
        }
      }

      const { data: question, error } = await supabase.from('questions').insert({ room_id: room.id, asker_player_id: askerId, question_text: questionText.trim() }).select().single();
      if (error) throw error;
      return NextResponse.json({ question });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
    if (room.current_turn_player_id !== askerId) return NextResponse.json({ error: 'No es tu turno' }, { status: 403 });

    const question: Question = {
      id: crypto.randomUUID(),
      room_id: room.id,
      asker_player_id: askerId,
      question_text: questionText.trim(),
      answer: null,
      asked_at: new Date().toISOString(),
      answered_at: null,
    };
    const qs = memDb.questions.get(room.id) ?? [];
    qs.push(question);
    memDb.questions.set(room.id, qs);

    return NextResponse.json({ question });
  } catch (err) {
    console.error('Error asking question:', err);
    return NextResponse.json({ error: 'Error al hacer la pregunta' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body: AnswerQuestionPayload & { questionId: string } = await req.json();
    const { questionId, answer, answererId } = body;
    const code = params.code.toUpperCase();

    if (!questionId || !answer || !answererId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();
      const { data: room } = await supabase.from('rooms').select('id,status,current_turn_player_id').eq('code', code).single();
      if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
      if (room.current_turn_player_id === answererId) return NextResponse.json({ error: 'No puedes responder tu propia pregunta' }, { status: 403 });
      await supabase.from('questions').update({ answer, answered_at: new Date().toISOString() }).eq('id', questionId).eq('room_id', room.id).is('answer', null);
      const { data: players } = await supabase.from('room_players').select('player_id').eq('room_id', room.id);
      const otherPlayer = players?.find(p => p.player_id !== room.current_turn_player_id);
      if (otherPlayer) await supabase.from('rooms').update({ current_turn_player_id: otherPlayer.player_id }).eq('id', room.id);
      return NextResponse.json({ success: true });
    }

    // ── Modo demo ────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
    if (room.current_turn_player_id === answererId) return NextResponse.json({ error: 'No puedes responder tu propia pregunta' }, { status: 403 });

    const qs = memDb.questions.get(room.id) ?? [];
    const idx = qs.findIndex(q => q.id === questionId);
    if (idx >= 0) {
      qs[idx] = { ...qs[idx], answer, answered_at: new Date().toISOString() };
      memDb.questions.set(room.id, qs);
    }

    // Cambiar turno
    const players = memDb.players.get(room.id) ?? [];
    const otherPlayer = players.find(p => p.player_id !== room.current_turn_player_id);
    if (otherPlayer) {
      memDb.rooms.set(code, { ...room, current_turn_player_id: otherPlayer.player_id });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error answering:', err);
    return NextResponse.json({ error: 'Error al responder' }, { status: 500 });
  }
}
