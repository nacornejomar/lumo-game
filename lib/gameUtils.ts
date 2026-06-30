export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getPlayerIdFromStorage(): string {
  if (typeof window === 'undefined') return '';
  // sessionStorage: cada pestaña tiene su propio ID para jugar roles distintos.
  let id = sessionStorage.getItem('lumo_tab_player_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('lumo_tab_player_id', id);
  }
  return id;
}

export function getPlayerNameFromStorage(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('lumo_player_name') ?? '';
}

export function savePlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lumo_player_name', name);
}
