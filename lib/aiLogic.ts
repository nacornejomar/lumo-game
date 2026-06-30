import type { Character, Question } from '@/types';

// ── Question bank ──────────────────────────────────────────────────────────
// Each entry has the question text and a function to evaluate it against a char.
// Questions are designed to split most category sets ~50/50.

interface AIQItem {
  text: string;
  eval: (c: Character) => boolean;
}

export const AI_QUESTION_BANK: AIQItem[] = [
  {
    text: '¿Es mujer?',
    eval: c => c.gender === 'female',
  },
  {
    text: '¿Es un personaje adulto (no niño ni adolescente)?',
    eval: c => !/student|estudiante|kid|child|niño|teen|adolescent|young/i.test(c.profession_or_role)
            || /professor|profesor|headmaster|director|general|lord|master|king|queen/i.test(c.profession_or_role),
  },
  {
    text: '¿Ocupa un cargo de autoridad o liderazgo?',
    eval: c => /professor|profesor|headmaster|director|chief|master|lord|king|queen|general|captain|jefe|rector|presidente|leader|boss|chancellor/i.test(c.profession_or_role),
  },
  {
    text: '¿Es considerado/a el villano o antagonista principal?',
    eval: c => /villain|villano|dark lord|evil|malvado|antagonist|sith lord|criminal|enemy|nemesis|dark side/i.test(c.profession_or_role),
  },
  {
    text: '¿Tiene poderes, usa magia o maneja tecnología avanzada?',
    eval: c => /wizard|witch|mago|hechicero|jedi|sith|superhero|mutant|power|super|magic|force|sorcerer|tech|robot|android/i.test(c.profession_or_role)
            || ['cat-hp', 'cat-marvel', 'cat-starwars'].includes(c.category_id),
  },
  {
    text: '¿Es conocido/a por hacer reír o tener personalidad cómica?',
    eval: c => /comic|humor|funny|clown|payaso|comedian|buffoon|fool|jester|comic relief|bufón/i.test(c.profession_or_role)
            || c.category_id === 'cat-simpsons',
  },
  {
    text: '¿Tiene una relación muy cercana con el protagonista (amigo, familiar, compañero)?',
    eval: c => /best friend|amigo|friend|compañero|companion|ally|sidekick|brother|sister|hermano|hermana|parent|padre|madre|family/i.test(c.profession_or_role),
  },
  {
    text: '¿Usa armas, combate o tiene habilidades de lucha?',
    eval: c => /warrior|knight|caballero|soldier|fighter|shooter|archer|gunner|mercenary|swordsman|ranger|assassin/i.test(c.profession_or_role)
            || ['cat-starwars', 'cat-marvel'].includes(c.category_id),
  },
  {
    text: '¿Es conocido/a por su inteligencia, sabiduría o habilidades técnicas?',
    eval: c => /wise|wisdom|intelligent|genius|clever|smart|bright|sage|scholar|scientist|inventor|engineer|strategist|tactician/i.test(c.profession_or_role),
  },
  {
    text: '¿Aparece como personaje principal desde el inicio de la historia?',
    eval: c => /protagonist|protagonista|main character|hero|héroe|principal/i.test(c.profession_or_role),
  },
];

// ── Normalise helper ────────────────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── Answer a human question about the AI's secret character ────────────────
export function aiAnswerQuestion(question: string, secret: Character): 'yes' | 'no' {
  const q = norm(question);
  const role = norm(secret.profession_or_role);
  const universe = norm(secret.universe_or_country);
  const name = norm(secret.name);

  // Gender
  if (/(es|eres|el personaje es)\s*(mujer|femenin|chica|nina|hembra|señora|dama)/.test(q)
    || /^.*mujer.*\?$/.test(q)) {
    return secret.gender === 'female' ? 'yes' : 'no';
  }
  if (/(es|eres|el personaje es)\s*(hombre|mascul|chico|nino|varon|señor)/.test(q)
    || /^.*hombre.*\?$/.test(q)) {
    return secret.gender === 'male' ? 'yes' : 'no';
  }

  // Real vs fictional
  if (/person[ao] real|es real|existe en la vida/.test(q) && !/ficticio|no es real/.test(q)) {
    return secret.is_real ? 'yes' : 'no';
  }
  if (/ficticio|imaginario|inventado|ficcion/.test(q)) {
    return !secret.is_real ? 'yes' : 'no';
  }

  // Leadership / authority
  if (/lider|jefe|director|profesor|headmaster|master|rey|reina|general|capitán|capitan|presidente/.test(q)) {
    return /professor|profesor|headmaster|director|master|chief|jefe|lider|president|king|queen|general|captain/i.test(role)
      ? 'yes' : 'no';
  }

  // Villain
  if (/villano|malvado|antagonista|malo de la historia|evil|dark/.test(q)) {
    return /villain|villano|dark lord|evil|malvado|antagonist|sith|criminal/i.test(role) ? 'yes' : 'no';
  }

  // Magic / powers
  if (/magia|magico|hechicero|poderes|super[- ]poder|mago|fuerza|the force|jedi|sith/.test(q)) {
    return /wizard|witch|mago|magic|sith|jedi|mutant|super|sorcerer/i.test(role)
      || ['cat-hp', 'cat-marvel', 'cat-starwars'].includes(secret.category_id)
      ? 'yes' : 'no';
  }

  // Comedy
  if (/comico|gracioso|divertido|humor|payaso/.test(q)) {
    return /comic|funny|clown|comedian|bufón/i.test(role) || secret.category_id === 'cat-simpsons'
      ? 'yes' : 'no';
  }

  // Age — young
  if (/joven|nio|pequeño|adolescente|estudiante|niño/.test(q)) {
    return /student|estudiante|kid|child|niño|teen|adolescent|young/i.test(role) ? 'yes' : 'no';
  }
  // Age — adult
  if (/adulto|mayor|anciano|viejo/.test(q)) {
    return !/student|estudiante|kid|child|niño|teen|adolescent/i.test(role) ? 'yes' : 'no';
  }

  // Protagonist / hero
  if (/protagonista|heroe|héroe|personaje principal|main character/.test(q)) {
    return /protagonist|protagonista|hero|main character/i.test(role) ? 'yes' : 'no';
  }

  // Friendship / ally
  if (/amigo|mejor amigo|compañero|aliado|companion|sidekick/.test(q)) {
    return /friend|amigo|companion|ally|sidekick|compañero/i.test(role) ? 'yes' : 'no';
  }

  // Weapons / fighter
  if (/arma|lucha|combate|espada|pistola|guerrero|soldado/.test(q)) {
    return /warrior|knight|soldier|fighter|shooter|archer|gunner|assassin/i.test(role)
      || ['cat-starwars', 'cat-marvel'].includes(secret.category_id)
      ? 'yes' : 'no';
  }

  // Name mentions
  for (const word of name.split(' ')) {
    if (word.length >= 4 && q.includes(word)) return 'yes';
  }

  // Universe mentions
  for (const word of universe.split(' ')) {
    if (word.length >= 4 && q.includes(word)) return 'yes';
  }

  // Conservative default
  return 'no';
}

// ── Filter characters based on AI's own Q&A history ────────────────────────
export function filterByAiQA(characters: Character[], aiQuestions: Question[]): Character[] {
  let remaining = [...characters];
  for (const q of aiQuestions) {
    if (!q.answer) continue;
    const item = AI_QUESTION_BANK.find(b => b.text === q.question_text);
    if (!item) continue;
    const wantTrue = q.answer === 'yes';
    remaining = remaining.filter(c => item.eval(c) === wantTrue);
  }
  return remaining.length > 0 ? remaining : characters;
}

// ── Pick the most informative question not yet asked ───────────────────────
export function pickBestAiQuestion(remaining: Character[], askedTexts: string[]): AIQItem {
  const available = AI_QUESTION_BANK.filter(q => !askedTexts.includes(q.text));
  if (available.length === 0) return AI_QUESTION_BANK[0];

  let best = available[0];
  let bestScore = Infinity;
  const n = remaining.length;

  for (const q of available) {
    const yesCount = remaining.filter(c => q.eval(c)).length;
    const noCount = n - yesCount;
    const score = Math.abs(yesCount - noCount); // closest to 50/50 = lowest
    if (score < bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

// ── Pick AI's guess from remaining characters ──────────────────────────────
export function pickAiGuess(remaining: Character[]): Character {
  // Slight randomness so every game is different
  const idx = Math.floor(Math.random() * Math.min(remaining.length, 3));
  return remaining[idx] ?? remaining[0];
}
