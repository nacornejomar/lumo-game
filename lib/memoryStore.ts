import type { Room, RoomPlayer, Question } from '@/types';

export interface QueueEntry {
  playerId: string;
  playerName: string;
  categoryId: string;
  enteredAt: string;
  matchedRoomCode?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __wassRooms: Map<string, Room>;
  // eslint-disable-next-line no-var
  var __wassPlayers: Map<string, RoomPlayer[]>;
  // eslint-disable-next-line no-var
  var __wassQuestions: Map<string, Question[]>;
  // eslint-disable-next-line no-var
  var __lumoMatchQueue: Map<string, QueueEntry>;
}

global.__wassRooms     ??= new Map<string, Room>();
global.__wassPlayers   ??= new Map<string, RoomPlayer[]>();
global.__wassQuestions ??= new Map<string, Question[]>();
global.__lumoMatchQueue ??= new Map<string, QueueEntry>();

export const memDb = {
  rooms: global.__wassRooms,
  players: global.__wassPlayers,
  questions: global.__wassQuestions,
};

export const matchQueue = global.__lumoMatchQueue;

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://xxxx.supabase.co' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
