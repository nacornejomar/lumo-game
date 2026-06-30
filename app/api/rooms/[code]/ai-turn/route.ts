import { NextRequest, NextResponse } from 'next/server';
import { memDb, isSupabaseConfigured } from '@/lib/memoryStore';
import { SEED_CHARACTERS } from '@/data/characters';
import { aiAnswerQuestion, filterByAiQA, pickBestAiQuestion, pickAiGuess } from '@/lib/aiLogic';
import type { Question, Character } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  try {
    const { aiId } = await req.json();
    const code = params.code.toUpperCase();

    if (!aiId?.startsWith('ai_')) {
      return NextResponse.json({ error: 'ID de IA inválido' }, { status: 400 });
    }

    // ── Supabase mode ────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      const { createServerSupabase } = await import('@/lib/supabase');
      const supabase = createServerSupabase();

      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single();
      if (!room || room.status !== 'playing') {
        return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
      }

      const { data: players } = await supabase.from('room_players').select('*').eq('room_id', room.id);
      const aiPlayer = players?.find((p) => p.player_id === aiId);
      const humanPlayer = players?.find((p) => p.player_id !== aiId);

      if (!aiPlayer || !humanPlayer) {
        return NextResponse.json({ error: 'Jugadores no encontrados' }, { status: 400 });
      }

      const { data: questionsData } = await supabase
        .from('questions').select('*').eq('room_id', room.id).order('asked_at');
      const questions: Question[] = questionsData ?? [];

      let characters: Character[] = [];
      if (room.game_character_ids?.length > 0) {
        const { data: chars } = await supabase
          .from('characters').select('*').in('id', room.game_character_ids);
        characters = (chars ?? []) as Character[];
      }

      // Case 1: Human asked an unanswered question → AI answers
      const pendingHumanQ = questions.find(q => q.asker_player_id !== aiId && q.answer === null);
      if (pendingHumanQ) {
        const aiSecret = characters.find(c => c.id === aiPlayer.secret_character_id);
        if (!aiSecret) return NextResponse.json({ error: 'Personaje secreto no encontrado' }, { status: 400 });

        const answer = aiAnswerQuestion(pendingHumanQ.question_text, aiSecret);

        await supabase.from('questions')
          .update({ answer, answered_at: new Date().toISOString() })
          .eq('id', pendingHumanQ.id);

        await supabase.from('rooms')
          .update({ current_turn_player_id: aiId })
          .eq('code', code);

        return NextResponse.json({ action: 'answered', answer, questionText: pendingHumanQ.question_text });
      }

      // Case 2: AI has the turn → ask or guess
      if (room.current_turn_player_id !== aiId) {
        return NextResponse.json({ action: 'none' });
      }

      const aiAsked = questions.filter(q => q.asker_player_id === aiId && q.answer !== null);
      const possible = filterByAiQA(characters, aiAsked);

      if (possible.length <= 2 || aiAsked.length >= 8) {
        const guess = pickAiGuess(possible);
        const isCorrect = guess.id === humanPlayer.secret_character_id;
        const winnerId = isCorrect ? aiId : humanPlayer.player_id;

        await supabase.from('rooms')
          .update({ status: 'finished', winner_player_id: winnerId })
          .eq('code', code);

        return NextResponse.json({
          action: 'guessed',
          guessName: guess.name,
          isCorrect,
          winnerId,
          opponentSecretId: humanPlayer.secret_character_id,
        });
      }

      const askedTexts = questions.filter(q => q.asker_player_id === aiId).map(q => q.question_text);
      const nextQ = pickBestAiQuestion(possible, askedTexts);

      await supabase.from('questions').insert({
        room_id: room.id,
        asker_player_id: aiId,
        question_text: nextQ.text,
      });

      return NextResponse.json({ action: 'asked', questionText: nextQ.text });
    }

    // ── Memory mode ──────────────────────────────────────────────────
    const room = memDb.rooms.get(code);
    if (!room || room.status !== 'playing' || !room.is_vs_ai) {
      return NextResponse.json({ error: 'Sala no disponible' }, { status: 400 });
    }

    const players = memDb.players.get(room.id) ?? [];
    const aiPlayer = players.find(p => p.player_id === aiId);
    const humanPlayer = players.find(p => p.player_id !== aiId);
    if (!aiPlayer || !humanPlayer) {
      return NextResponse.json({ error: 'Jugadores no encontrados' }, { status: 400 });
    }

    const questions = memDb.questions.get(room.id) ?? [];
    const characters = SEED_CHARACTERS.filter(c => room.game_character_ids.includes(c.id));

    const pendingHumanQ = questions.find(q => q.asker_player_id !== aiId && q.answer === null);
    if (pendingHumanQ) {
      const aiSecret = SEED_CHARACTERS.find(c => c.id === aiPlayer.secret_character_id);
      if (!aiSecret) return NextResponse.json({ error: 'Personaje secreto no encontrado' }, { status: 400 });

      const answer = aiAnswerQuestion(pendingHumanQ.question_text, aiSecret);

      const updatedQs = questions.map(q =>
        q.id === pendingHumanQ.id
          ? { ...q, answer, answered_at: new Date().toISOString() }
          : q,
      );
      memDb.questions.set(room.id, updatedQs);
      memDb.rooms.set(code, { ...room, current_turn_player_id: aiId });

      return NextResponse.json({ action: 'answered', answer, questionText: pendingHumanQ.question_text });
    }

    if (room.current_turn_player_id !== aiId) {
      return NextResponse.json({ action: 'none' });
    }

    const aiAsked = questions.filter(q => q.asker_player_id === aiId && q.answer !== null);
    const possible = filterByAiQA(characters, aiAsked);

    if (possible.length <= 2 || aiAsked.length >= 8) {
      const guess = pickAiGuess(possible);
      const humanSecret = SEED_CHARACTERS.find(c => c.id === humanPlayer.secret_character_id);
      const isCorrect = guess.id === humanPlayer.secret_character_id;
      const winnerId = isCorrect ? aiId : humanPlayer.player_id;

      memDb.rooms.set(code, { ...room, status: 'finished', winner_player_id: winnerId });

      return NextResponse.json({
        action: 'guessed',
        guessName: guess.name,
        isCorrect,
        winnerId,
        opponentSecretId: humanSecret?.id,
      });
    }

    const askedTexts = questions.filter(q => q.asker_player_id === aiId).map(q => q.question_text);
    const nextQ = pickBestAiQuestion(possible, askedTexts);

    const newQuestion: Question = {
      id: crypto.randomUUID(),
      room_id: room.id,
      asker_player_id: aiId,
      question_text: nextQ.text,
      answer: null,
      asked_at: new Date().toISOString(),
      answered_at: null,
    };
    questions.push(newQuestion);
    memDb.questions.set(room.id, questions);

    return NextResponse.json({ action: 'asked', questionText: nextQ.text });
  } catch (err) {
    console.error('AI turn error:', err);
    return NextResponse.json({ error: 'Error en turno de IA' }, { status: 500 });
  }
}
