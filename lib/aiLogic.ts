import type { Character, Question } from '@/types';

// Standard attribute keys the AI knows how to use.
// The admin panel uses these to set boolean facts per character.
export const AI_ATTRIBUTES: Record<string, string> = {
  es_villano:         'Villano / Antagonista',
  es_heroe:           'Héroe / Protagonista',
  tiene_poderes:      'Tiene poderes, magia o tecnología',
  es_lider:           'Cargo de autoridad o liderazgo',
  es_gracioso:        'Personaje cómico / gracioso',
  es_guerrero:        'Combatiente / usa armas',
  es_inteligente:     'Destaca por inteligencia o sabiduría',
  es_joven:           'Joven (niño o adolescente)',
  es_amigo_principal: 'Amigo íntimo del protagonista',
  es_animal:          'Animal (no humano ni robot)',
  es_robot:           'Robot / droide / androide',
};

// Returns the attribute value if it is explicitly set, null if not.
function getAttr(c: Character, ...keys: string[]): boolean | null {
  const attrs = (c.attributes ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    if (key in attrs && attrs[key] !== null && attrs[key] !== undefined) {
      return Boolean(attrs[key]);
    }
  }
  return null;
}

// ── Question bank ──────────────────────────────────────────────────────────
// Each entry has the question text and a function to evaluate it against a char.
// eval checks attributes first (reliable) then falls back to regex on profession_or_role.

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
    eval: c => {
      const a = getAttr(c, 'es_joven');
      if (a !== null) return !a; // adult = not young
      return !/student|estudiante|kid|child|niño|teen|adolescent|young/i.test(c.profession_or_role)
          || /professor|profesor|headmaster|director|general|lord|master|king|queen/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Ocupa un cargo de autoridad o liderazgo?',
    eval: c => {
      const a = getAttr(c, 'es_lider');
      if (a !== null) return a;
      return /professor|profesor|headmaster|director|chief|master|lord|king|queen|general|captain|jefe|rector|presidente|leader|boss|chancellor/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Es considerado/a el villano o antagonista principal?',
    eval: c => {
      const a = getAttr(c, 'es_villano');
      if (a !== null) return a;
      return /villain|villano|dark lord|evil|malvado|antagonist|sith lord|criminal|enemy|nemesis|dark side/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Tiene poderes, usa magia o maneja tecnología avanzada?',
    eval: c => {
      const a = getAttr(c, 'tiene_poderes');
      if (a !== null) return a;
      return /wizard|witch|mago|hechicero|jedi|sith|superhero|mutant|power|super|magic|force|sorcerer|tech|robot|android/i.test(c.profession_or_role)
          || ['cat-hp', 'cat-marvel', 'cat-starwars'].includes(c.category_id);
    },
  },
  {
    text: '¿Es conocido/a por hacer reír o tener personalidad cómica?',
    eval: c => {
      const a = getAttr(c, 'es_gracioso');
      if (a !== null) return a;
      return /comic|humor|funny|clown|payaso|comedian|buffoon|fool|jester|comic relief|bufón|travieso|inocente/i.test(c.profession_or_role)
          || c.category_id === 'cat-simpsons';
    },
  },
  {
    text: '¿Tiene una relación muy cercana con el protagonista (amigo, familiar, compañero)?',
    eval: c => {
      const a = getAttr(c, 'es_amigo_principal');
      if (a !== null) return a;
      return /best friend|amigo|friend|compañero|companion|ally|sidekick|brother|sister|hermano|hermana|parent|padre|madre|family/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Usa armas, combate o tiene habilidades de lucha?',
    eval: c => {
      const a = getAttr(c, 'es_guerrero');
      if (a !== null) return a;
      return /warrior|knight|caballero|soldier|fighter|shooter|archer|gunner|mercenary|swordsman|ranger|assassin|guerrero|guerrera/i.test(c.profession_or_role)
          || ['cat-starwars', 'cat-marvel'].includes(c.category_id);
    },
  },
  {
    text: '¿Es conocido/a por su inteligencia, sabiduría o habilidades técnicas?',
    eval: c => {
      const a = getAttr(c, 'es_inteligente');
      if (a !== null) return a;
      return /wise|wisdom|intelligent|genius|clever|smart|bright|sage|scholar|scientist|inventor|engineer|strategist|tactician|inteligente|sabio/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Aparece como personaje principal desde el inicio de la historia?',
    eval: c => {
      const a = getAttr(c, 'es_heroe');
      if (a !== null) return a;
      return /protagonist|protagonista|main character|hero|héroe|principal|ícono/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Es un animal o criatura no humana (sin contar robots)?',
    eval: c => {
      const a = getAttr(c, 'es_animal');
      if (a !== null) return a;
      return /animal|beast|creature|criatura|mascota|lion|wolf|dog|cat|bird|dragon|monster/i.test(c.profession_or_role);
    },
  },
  {
    text: '¿Es un robot, droide o androide?',
    eval: c => {
      const a = getAttr(c, 'es_robot');
      if (a !== null) return a;
      return /robot|droide|android|droid|machine|máquina|protocol/i.test(c.profession_or_role);
    },
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
    || /\bmujer\b/.test(q)) {
    return secret.gender === 'female' ? 'yes' : 'no';
  }
  if (/(es|eres|el personaje es)\s*(hombre|mascul|chico|nino|varon|señor)/.test(q)
    || /\bhombre\b/.test(q)) {
    return secret.gender === 'male' ? 'yes' : 'no';
  }

  // Real vs fictional
  if (/person[ao] real|es real|existe en la vida/.test(q) && !/ficticio|no es real/.test(q)) {
    return secret.is_real ? 'yes' : 'no';
  }
  if (/ficticio|imaginario|inventado|ficcion/.test(q)) {
    return !secret.is_real ? 'yes' : 'no';
  }

  // Villain — check attribute first
  if (/villano|malvado|antagonista|malo de la historia|evil|dark/.test(q)) {
    const a = getAttr(secret, 'es_villano');
    if (a !== null) return a ? 'yes' : 'no';
    return /villain|villano|dark lord|evil|malvado|antagonist|sith|criminal/i.test(role) ? 'yes' : 'no';
  }

  // Hero / protagonist
  if (/protagonista|heroe|héroe|personaje principal|main character/.test(q)) {
    const a = getAttr(secret, 'es_heroe');
    if (a !== null) return a ? 'yes' : 'no';
    return /protagonist|protagonista|hero|main character|icono/i.test(role) ? 'yes' : 'no';
  }

  // Magic / powers
  if (/magia|magico|hechicero|poderes|super[- ]poder|mago|fuerza|the force|jedi|sith|tecnolog/.test(q)) {
    const a = getAttr(secret, 'tiene_poderes');
    if (a !== null) return a ? 'yes' : 'no';
    return /wizard|witch|mago|magic|sith|jedi|mutant|super|sorcerer/i.test(role)
      || ['cat-hp', 'cat-marvel', 'cat-starwars'].includes(secret.category_id)
      ? 'yes' : 'no';
  }

  // Comedy
  if (/comico|gracioso|divertido|humor|payaso|hace reir/.test(q)) {
    const a = getAttr(secret, 'es_gracioso');
    if (a !== null) return a ? 'yes' : 'no';
    return /comic|funny|clown|comedian|bufon|travieso|inocente/i.test(role) || secret.category_id === 'cat-simpsons'
      ? 'yes' : 'no';
  }

  // Leadership
  if (/lider|jefe|director|profesor|headmaster|master|rey|reina|general|capitan|presidente|autoridad/.test(q)) {
    const a = getAttr(secret, 'es_lider');
    if (a !== null) return a ? 'yes' : 'no';
    return /professor|profesor|headmaster|director|master|chief|jefe|lider|president|king|queen|general|captain/i.test(role)
      ? 'yes' : 'no';
  }

  // Combat / weapons
  if (/arma|lucha|combate|espada|pistola|guerrero|soldado|pelea/.test(q)) {
    const a = getAttr(secret, 'es_guerrero');
    if (a !== null) return a ? 'yes' : 'no';
    return /warrior|knight|soldier|fighter|shooter|archer|gunner|assassin|guerrero|guerrera/i.test(role)
      || ['cat-starwars', 'cat-marvel'].includes(secret.category_id)
      ? 'yes' : 'no';
  }

  // Intelligence
  if (/inteligente|sabio|listo|genio|cientifico|ingeniero|estratega/.test(q)) {
    const a = getAttr(secret, 'es_inteligente');
    if (a !== null) return a ? 'yes' : 'no';
    return /wise|wisdom|intelligent|genius|clever|smart|sage|scholar|scientist|inventor|inteligente|sabio/i.test(role)
      ? 'yes' : 'no';
  }

  // Age — young
  if (/joven|niño|pequeño|adolescente|estudiante|infante/.test(q)) {
    const a = getAttr(secret, 'es_joven');
    if (a !== null) return a ? 'yes' : 'no';
    return /student|estudiante|kid|child|niño|teen|adolescent|young/i.test(role) ? 'yes' : 'no';
  }
  // Age — adult
  if (/adulto|mayor|anciano|viejo/.test(q)) {
    const a = getAttr(secret, 'es_joven');
    if (a !== null) return a ? 'no' : 'yes'; // adult = not young
    return !/student|estudiante|kid|child|niño|teen|adolescent/i.test(role) ? 'yes' : 'no';
  }

  // Friendship / ally
  if (/amigo|mejor amigo|compañero|aliado|companion|sidekick|familiar/.test(q)) {
    const a = getAttr(secret, 'es_amigo_principal');
    if (a !== null) return a ? 'yes' : 'no';
    return /friend|amigo|companion|ally|sidekick|compañero/i.test(role) ? 'yes' : 'no';
  }

  // Animal
  if (/animal|criatura|bestia|no humano/.test(q)) {
    const a = getAttr(secret, 'es_animal');
    if (a !== null) return a ? 'yes' : 'no';
    return /animal|beast|lion|wolf|dog|cat|bird|dragon|mascota/i.test(role) ? 'yes' : 'no';
  }

  // Robot
  if (/robot|droide|androide|maquina/.test(q)) {
    const a = getAttr(secret, 'es_robot');
    if (a !== null) return a ? 'yes' : 'no';
    return /robot|droid|android|protocol|machine/i.test(role) ? 'yes' : 'no';
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
    const score = Math.abs(yesCount - noCount); // closest to 50/50 = lowest score
    if (score < bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

// ── Pick AI's guess from remaining characters ──────────────────────────────
export function pickAiGuess(remaining: Character[]): Character {
  const idx = Math.floor(Math.random() * Math.min(remaining.length, 3));
  return remaining[idx] ?? remaining[0];
}
