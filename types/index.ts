export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type QuestionAnswer = 'yes' | 'no';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active: boolean;
  created_at: string;
}

export interface Character {
  id: string;
  name: string;
  image_url?: string | null;
  category_id: string;
  universe_or_country: string;
  profession_or_role: string;
  is_real: boolean;
  gender: Gender;
  attributes: Record<string, string | boolean | number>;
  active: boolean;
  created_at?: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  secret_character_id: string | null;
  dismissed_character_ids: string[];
  position: number;
  is_ready: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  room_id: string;
  asker_player_id: string;
  question_text: string;
  answer: QuestionAnswer | null;
  asked_at: string;
  answered_at: string | null;
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  category_id: string;
  game_character_ids: string[];
  current_turn_player_id: string | null;
  winner_player_id: string | null;
  created_at: string;
  is_vs_ai?: boolean;
}

export interface GameState {
  room: Room | null;
  characters: Character[];
  mySecretCharacter: Character | null;
  myPlayer: RoomPlayer | null;
  opponentPlayer: RoomPlayer | null;
  questions: Question[];
  dismissedIds: Set<string>;
  isMyTurn: boolean;
  isLoading: boolean;
  error: string | null;
  isGuessMode: boolean;
}

export interface CreateRoomPayload {
  playerName: string;
  playerId: string;
  categoryId: string;
}

export interface JoinRoomPayload {
  playerName: string;
  playerId: string;
}

export interface AskQuestionPayload {
  questionText: string;
  askerId: string;
}

export interface AnswerQuestionPayload {
  answer: QuestionAnswer;
  answererId: string;
}

export interface GuessPayload {
  guessCharacterId: string;
  guesserId: string;
}
