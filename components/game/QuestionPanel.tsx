'use client';

import { useState, useRef, useEffect } from 'react';
import type { Question, RoomPlayer } from '@/types';

interface QuestionPanelProps {
  questions: Question[];
  isMyTurn: boolean;
  playerId: string;
  myPlayer: RoomPlayer | null;
  opponentPlayer: RoomPlayer | null;
  onAskQuestion: (text: string) => Promise<void>;
  onAnswerQuestion: (id: string, answer: 'yes' | 'no') => Promise<void>;
  onStartGuess: () => void;
  isGuessMode: boolean;
  onCancelGuess: () => void;
  roomStatus: string;
  isVsAI?: boolean;
}

export function QuestionPanel({
  questions, isMyTurn, playerId, myPlayer, opponentPlayer,
  onAskQuestion, onAnswerQuestion, onStartGuess, isGuessMode, onCancelGuess, roomStatus, isVsAI,
}: QuestionPanelProps) {
  const [questionText, setQuestionText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const pendingQuestion = questions.findLast(q => q.answer === null);
  const myNeedsToAnswer = pendingQuestion && pendingQuestion.asker_player_id !== playerId;
  const waitingForAnswer = pendingQuestion && pendingQuestion.asker_player_id === playerId;

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [questions]);

  const handleAsk = async () => {
    if (!questionText.trim() || isSending) return;
    setIsSending(true);
    try {
      await onAskQuestion(questionText.trim());
      setQuestionText('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsSending(false);
    }
  };

  const handleAnswer = async (answer: 'yes' | 'no') => {
    if (!pendingQuestion || isAnswering) return;
    setIsAnswering(true);
    try {
      await onAnswerQuestion(pendingQuestion.id, answer);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── History ───────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--parchment)',
          border: '2px solid var(--gold)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="px-3 py-2 flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #3d2010 0%, #2a1508 100%)',
            borderBottom: '1px solid #6b3f1e',
          }}
        >
          <div className="lumo-ornament w-full">Preguntas</div>
        </div>

        <div ref={historyRef} className="max-h-44 overflow-y-auto p-2.5 space-y-1.5">
          {questions.length === 0 ? (
            <p className="text-center py-4 text-xs italic" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>
              Aún no se han hecho preguntas...
            </p>
          ) : (
            questions.map(q => {
              const isMyQ = q.asker_player_id === playerId;
              const askerName = isMyQ
                ? (myPlayer?.player_name ?? 'Tú')
                : (opponentPlayer?.player_name ?? 'Rival');
              return (
                <div
                  key={q.id}
                  className="rounded-lg px-2.5 py-1.5 text-xs"
                  style={{
                    background: isMyQ ? 'rgba(200,149,58,0.08)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isMyQ ? 'rgba(200,149,58,0.3)' : 'rgba(0,0,0,0.12)'}`,
                  }}
                >
                  <div className="flex items-start gap-1.5">
                    <span style={{ color: isMyQ ? '#c8953a' : '#4a7c3f', flexShrink: 0, marginTop: '1px' }}>
                      {isMyQ ? '→' : '←'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ color: '#2a1508', fontFamily: 'var(--font-cinzel)', fontSize: '0.6rem' }}>
                        {askerName}:{' '}
                      </span>
                      <span className="italic" style={{ color: '#3a2010', fontFamily: 'var(--font-lora)' }}>
                        &ldquo;{q.question_text}&rdquo;
                      </span>
                    </div>
                    {q.answer !== null ? (
                      <span
                        className="flex-shrink-0 font-bold px-1.5 py-0.5 rounded text-[0.6rem]"
                        style={{
                          background: q.answer === 'yes' ? 'rgba(74,124,63,0.15)' : 'rgba(184,50,40,0.12)',
                          color: q.answer === 'yes' ? '#2e6020' : '#a02018',
                          border: `1px solid ${q.answer === 'yes' ? '#4a7c3f' : '#b83228'}`,
                          fontFamily: 'var(--font-cinzel)',
                        }}
                      >
                        {q.answer === 'yes' ? 'Sí' : 'No'}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-[0.6rem] italic" style={{ color: '#9a8060', fontFamily: 'var(--font-lora)' }}>...</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Action panel ─────────────────────────────────── */}
      {roomStatus === 'playing' && (
        <div
          className="rounded-xl p-3 flex flex-col gap-2.5"
          style={{
            background: 'var(--parchment)',
            border: '2px solid var(--gold)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          }}
        >
          {myNeedsToAnswer && (
            <div className="space-y-2">
              <p className="text-center text-xs font-bold" style={{ color: '#3a2010', fontFamily: 'var(--font-cinzel)' }}>
                <span style={{ color: '#c8953a' }}>{opponentPlayer?.player_name ?? 'Rival'}</span> pregunta:
              </p>
              <p className="text-center italic text-sm px-2" style={{ color: '#3a2010', fontFamily: 'var(--font-lora)' }}>
                &ldquo;{pendingQuestion?.question_text}&rdquo;
              </p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => handleAnswer('yes')} disabled={isAnswering} className="lumo-btn lumo-btn-green flex-1 py-2.5 text-sm">
                  ✅ SÍ
                </button>
                <button onClick={() => handleAnswer('no')} disabled={isAnswering} className="lumo-btn lumo-btn-red flex-1 py-2.5 text-sm">
                  ❌ NO
                </button>
              </div>
            </div>
          )}

          {waitingForAnswer && (
            <p className="text-center py-1.5 text-sm italic animate-pulse" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>
              ⏳ Esperando que {opponentPlayer?.player_name ?? 'el rival'} responda...
            </p>
          )}

          {isMyTurn && !pendingQuestion && !isGuessMode && (
            <div className="space-y-2">
              <p className="text-center text-xs" style={{ color: '#7a6048', fontFamily: 'var(--font-cinzel)' }}>
                Tu turno — Pregunta o adivina
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAsk()}
                  placeholder="¿Tiene el cabello oscuro?..."
                  maxLength={120}
                  className="lumo-input flex-1 text-sm"
                />
                <button onClick={handleAsk} disabled={!questionText.trim() || isSending} className="lumo-btn lumo-btn-primary px-3 py-2 text-xs">
                  {isSending ? '...' : 'Preguntar'}
                </button>
              </div>
              <button onClick={onStartGuess} className="lumo-btn lumo-btn-green w-full py-2.5 text-sm">
                👁 Adivinar personaje
              </button>
            </div>
          )}

          {isGuessMode && (
            <div className="space-y-2 text-center">
              <p className="font-bold text-sm animate-pulse" style={{ color: '#c8953a', fontFamily: 'var(--font-cinzel)' }}>
                👁 MODO ADIVINAR ACTIVO
              </p>
              <p className="text-xs italic" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>
                Haz clic en el personaje que crees que es el de tu rival
              </p>
              <button onClick={onCancelGuess} className="lumo-btn lumo-btn-outline px-6 py-1.5 text-xs">
                Cancelar
              </button>
            </div>
          )}

          {!isMyTurn && !myNeedsToAnswer && !waitingForAnswer && (
            isVsAI ? (
              <div className="text-center py-1 space-y-1.5">
                <p className="text-sm font-bold animate-pulse" style={{ color: '#c8953a', fontFamily: 'var(--font-cinzel)' }}>
                  🤖 Lumo IA está pensando...
                </p>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#c8953a', opacity: 0.6, animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-1.5 text-sm italic" style={{ color: '#7a6048', fontFamily: 'var(--font-lora)' }}>
                ⏳ Turno de {opponentPlayer?.player_name ?? 'el rival'}...
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
