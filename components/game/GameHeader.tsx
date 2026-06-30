'use client';

import type { Room, RoomPlayer } from '@/types';

interface GameHeaderProps {
  room: Room;
  myPlayer: RoomPlayer | null;
  opponentPlayer: RoomPlayer | null;
  playerId: string;
  roomCode: string;
}

export function GameHeader({ room, myPlayer, opponentPlayer, playerId, roomCode }: GameHeaderProps) {
  const isMyTurn = room.current_turn_player_id === playerId;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2.5"
      style={{
        background: 'linear-gradient(180deg, #3d2010 0%, #2a1508 100%)',
        borderBottom: '2px solid #6b3f1e',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <span className="lumo-logo text-2xl">Lumo</span>

      <div className="flex-1" />

      {/* Room code */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigator.clipboard.writeText(roomCode)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-black/20"
          style={{ border: '1px solid #6b3f1e' }}
          title="Copiar código"
        >
          <span className="text-xs" style={{ color: '#9a8060', fontFamily: 'var(--font-cinzel)' }}>Sala</span>
          <span className="font-bold text-sm tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--font-cinzel)' }}>
            {roomCode}
          </span>
          <span className="text-xs opacity-50">📋</span>
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`)}
          className="px-2 py-1.5 rounded-lg transition-colors hover:bg-black/20 text-xs"
          style={{ border: '1px solid #6b3f1e', color: '#9a8060' }}
          title="Copiar enlace"
        >
          🔗
        </button>
      </div>

      {/* Players */}
      <div className="flex items-center gap-2">
        <PlayerBadge name={myPlayer?.player_name ?? 'Tú'} isActive={isMyTurn} isMe />
        <span className="text-xs" style={{ color: '#6b5040', fontFamily: 'var(--font-cinzel)' }}>vs</span>
        {opponentPlayer ? (
          <PlayerBadge
            name={opponentPlayer.player_name}
            isActive={!isMyTurn && room.status === 'playing'}
            isMe={false}
            isAI={room.is_vs_ai}
          />
        ) : (
          <span className="text-xs italic animate-pulse" style={{ color: '#6b5040', fontFamily: 'var(--font-lora)' }}>
            Esperando rival...
          </span>
        )}
      </div>

      <StatusBadge status={room.status} isMyTurn={isMyTurn} />
    </div>
  );
}

function PlayerBadge({ name, isActive, isMe, isAI }: { name: string; isActive: boolean; isMe: boolean; isAI?: boolean }) {
  return (
    <div
      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300"
      style={{
        background: isActive ? 'rgba(74,124,63,0.25)' : 'rgba(0,0,0,0.3)',
        border: `1px solid ${isActive ? '#4a7c3f' : '#3d2010'}`,
        color: isActive ? '#7dc850' : '#6b5040',
        boxShadow: isActive ? '0 0 10px rgba(74,124,63,0.3)' : 'none',
        fontFamily: 'var(--font-cinzel)',
      }}
    >
      {isMe ? '🙋 ' : isAI ? '🤖 ' : '👤 '}{name}
      {isActive && <span className="ml-1 animate-pulse">▶</span>}
    </div>
  );
}

function StatusBadge({ status, isMyTurn }: { status: string; isMyTurn: boolean }) {
  if (status === 'waiting') {
    return (
      <span className="text-xs italic animate-pulse" style={{ color: '#9a8060', fontFamily: 'var(--font-cinzel)' }}>
        Esperando...
      </span>
    );
  }
  if (status === 'playing') {
    return (
      <div
        className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
        style={{
          background: isMyTurn ? 'linear-gradient(135deg, #4a7c3f, #2e5626)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${isMyTurn ? '#7dc850' : '#3d2010'}`,
          color: isMyTurn ? '#e8f8d0' : '#6b5040',
          fontFamily: 'var(--font-cinzel)',
          letterSpacing: '0.08em',
        }}
      >
        {isMyTurn ? '🎯 Tu Turno' : '⌛ Espera'}
      </div>
    );
  }
  return (
    <div
      className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
      style={{
        background: 'linear-gradient(135deg, #c8953a, #8a5c1a)',
        border: '1px solid #e8b84a',
        color: '#1a0800',
        fontFamily: 'var(--font-cinzel)',
      }}
    >
      ✅ Terminado
    </div>
  );
}
