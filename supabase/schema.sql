-- ============================================================
-- WASS? — Schema SQL
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Habilitar extensiones
create extension if not exists "pgcrypto";

-- ============================================================
-- CATEGORÍAS
-- ============================================================
create table if not exists categories (
  id          text primary key,
  name        text not null,
  slug        text unique not null,
  description text,
  icon        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PERSONAJES
-- ============================================================
create table if not exists characters (
  id                   text primary key,
  name                 text not null,
  image_url            text,
  category_id          text not null references categories(id) on delete cascade,
  universe_or_country  text not null,
  profession_or_role   text not null,
  is_real              boolean not null default false,
  gender               text not null check (gender in ('male','female','other','unknown')),
  attributes           jsonb not null default '{}',
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

create index if not exists idx_characters_category on characters(category_id);

-- ============================================================
-- SALAS
-- ============================================================
create table if not exists rooms (
  id                      uuid primary key default gen_random_uuid(),
  code                    text unique not null,
  status                  text not null default 'waiting' check (status in ('waiting','playing','finished')),
  category_id             text not null references categories(id),
  game_character_ids      text[] not null default '{}',
  current_turn_player_id  text,
  winner_player_id        text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_rooms_status on rooms(status);

-- ============================================================
-- JUGADORES EN SALA
-- ============================================================
create table if not exists room_players (
  id                      uuid primary key default gen_random_uuid(),
  room_id                 uuid not null references rooms(id) on delete cascade,
  player_id               text not null,
  player_name             text not null,
  secret_character_id     text,
  dismissed_character_ids text[] not null default '{}',
  position                int not null check (position in (1,2)),
  is_ready                boolean not null default false,
  created_at              timestamptz not null default now(),
  unique(room_id, player_id),
  unique(room_id, position)
);

create index if not exists idx_room_players_room on room_players(room_id);
create index if not exists idx_room_players_player on room_players(player_id);

-- ============================================================
-- PREGUNTAS
-- ============================================================
create table if not exists questions (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references rooms(id) on delete cascade,
  asker_player_id  text not null,
  question_text    text not null,
  answer           text check (answer in ('yes','no')),
  asked_at         timestamptz not null default now(),
  answered_at      timestamptz
);

create index if not exists idx_questions_room on questions(room_id);

-- ============================================================
-- HABILITAR REALTIME
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table room_players;

-- ============================================================
-- DATOS SEMILLA — Categorías
-- ============================================================
insert into categories (id, name, slug, description, icon, active) values
  ('cat-mix-clasico',   'Mix Clásico',             'mix-clasico',   'Harry Potter, GoT, Star Wars y Disney', '🎬', true),
  ('cat-harry-potter',  'Harry Potter',             'harry-potter',  'El universo mágico de Hogwarts',        '⚡', true),
  ('cat-futbol',        'Fútbol',                   'futbol',        'Estrellas del fútbol mundial',          '⚽', false),
  ('cat-famosos-latam', 'Famosos Latinoamérica',    'famosos-latam', 'Celebridades de LATAM',                 '🌎', false)
on conflict (id) do nothing;

-- ============================================================
-- DATOS SEMILLA — Personajes (Mix Clásico)
-- ============================================================
insert into characters (id, name, category_id, universe_or_country, profession_or_role, is_real, gender, attributes) values
  ('char-harry',      'Harry Potter',       'cat-mix-clasico', 'Harry Potter',          'Mago / El Elegido',           false, 'male',   '{"tiene_cicatriz":true,"usa_lentes":true,"cabello_oscuro":true,"es_villano":false}'),
  ('char-hermione',   'Hermione Granger',   'cat-mix-clasico', 'Harry Potter',          'Maga / La más inteligente',   false, 'female', '{"tiene_cicatriz":false,"usa_lentes":false,"cabello_oscuro":true,"es_villano":false}'),
  ('char-ron',        'Ron Weasley',        'cat-mix-clasico', 'Harry Potter',          'Mago / Mejor amigo',          false, 'male',   '{"tiene_cicatriz":false,"usa_lentes":false,"cabello_oscuro":false,"es_villano":false}'),
  ('char-dumbledore', 'Albus Dumbledore',   'cat-mix-clasico', 'Harry Potter',          'Director de Hogwarts',        false, 'male',   '{"tiene_cicatriz":false,"usa_lentes":true,"cabello_oscuro":false,"es_villano":false}'),
  ('char-voldemort',  'Lord Voldemort',     'cat-mix-clasico', 'Harry Potter',          'El Lord Oscuro',              false, 'male',   '{"tiene_cicatriz":false,"usa_lentes":false,"cabello_oscuro":false,"es_villano":true}'),
  ('char-snape',      'Severus Snape',      'cat-mix-clasico', 'Harry Potter',          'Profesor de Pociones',        false, 'male',   '{"tiene_cicatriz":false,"usa_lentes":false,"cabello_oscuro":true,"es_villano":false}'),
  ('char-jon-snow',   'Jon Snow',           'cat-mix-clasico', 'Game of Thrones',       'Rey del Norte',               false, 'male',   '{"tiene_espada":true,"es_rey_reina":true,"cabello_oscuro":true,"es_villano":false}'),
  ('char-daenerys',   'Daenerys Targaryen', 'cat-mix-clasico', 'Game of Thrones',       'Reina / Madre de Dragones',   false, 'female', '{"tiene_espada":false,"es_rey_reina":true,"cabello_oscuro":false,"es_villano":false,"tiene_dragon":true}'),
  ('char-tyrion',     'Tyrion Lannister',   'cat-mix-clasico', 'Game of Thrones',       'Consejero / La Mano del Rey', false, 'male',   '{"tiene_espada":false,"es_rey_reina":false,"cabello_oscuro":false,"es_villano":false}'),
  ('char-arya',       'Arya Stark',         'cat-mix-clasico', 'Game of Thrones',       'Guerrera / Asesina',          false, 'female', '{"tiene_espada":true,"es_rey_reina":false,"cabello_oscuro":true,"es_villano":false}'),
  ('char-cersei',     'Cersei Lannister',   'cat-mix-clasico', 'Game of Thrones',       'Reina de los Siete Reinos',   false, 'female', '{"tiene_espada":false,"es_rey_reina":true,"cabello_oscuro":false,"es_villano":true}'),
  ('char-jaime',      'Jaime Lannister',    'cat-mix-clasico', 'Game of Thrones',       'Caballero / El Matarreyes',   false, 'male',   '{"tiene_espada":true,"es_rey_reina":false,"cabello_oscuro":false,"es_villano":false}'),
  ('char-simba',      'Simba',              'cat-mix-clasico', 'El Rey León (Disney)',  'Rey de las Tierras del Pride', false, 'male',   '{"es_animal":true,"es_rey_reina":true,"es_humano":false,"tiene_poderes":false}'),
  ('char-elsa',       'Elsa',               'cat-mix-clasico', 'Frozen (Disney)',       'Reina de Arendelle',          false, 'female', '{"es_animal":false,"es_rey_reina":true,"es_humano":true,"tiene_poderes":true}'),
  ('char-moana',      'Moana',              'cat-mix-clasico', 'Moana (Disney)',        'Hija del Jefe / Navegante',   false, 'female', '{"es_animal":false,"es_rey_reina":false,"es_humano":true,"tiene_poderes":false}'),
  ('char-buzz',       'Buzz Lightyear',     'cat-mix-clasico', 'Toy Story (Disney)',    'Guardián Espacial',           false, 'male',   '{"es_animal":false,"es_rey_reina":false,"es_humano":false,"tiene_poderes":false}'),
  ('char-mulan',      'Mulan',              'cat-mix-clasico', 'Mulan (Disney)',        'Guerrera / Soldado',          false, 'female', '{"es_animal":false,"es_rey_reina":false,"es_humano":true,"tiene_poderes":false}'),
  ('char-aladdin',    'Aladdin',            'cat-mix-clasico', 'Aladdin (Disney)',      'Príncipe Ali / Ladrón',       false, 'male',   '{"es_animal":false,"es_rey_reina":false,"es_humano":true,"tiene_poderes":false}'),
  ('char-luke',       'Luke Skywalker',     'cat-mix-clasico', 'Star Wars',             'Maestro Jedi',                false, 'male',   '{"usa_sable_laser":true,"es_villano":false,"usa_la_fuerza":true,"es_droide":false}'),
  ('char-vader',      'Darth Vader',        'cat-mix-clasico', 'Star Wars',             'Lord Sith / Padre de Luke',   false, 'male',   '{"usa_sable_laser":true,"es_villano":true,"usa_la_fuerza":true,"es_droide":false}'),
  ('char-yoda',       'Yoda',               'cat-mix-clasico', 'Star Wars',             'Gran Maestro Jedi',           false, 'male',   '{"usa_sable_laser":true,"es_villano":false,"usa_la_fuerza":true,"es_droide":false}'),
  ('char-leia',       'Princesa Leia',      'cat-mix-clasico', 'Star Wars',             'General de la Resistencia',   false, 'female', '{"usa_sable_laser":false,"es_villano":false,"usa_la_fuerza":true,"es_droide":false}'),
  ('char-han',        'Han Solo',           'cat-mix-clasico', 'Star Wars',             'Contrabandista / Rebelde',    false, 'male',   '{"usa_sable_laser":false,"es_villano":false,"usa_la_fuerza":false,"es_droide":false}'),
  ('char-rey',        'Rey',                'cat-mix-clasico', 'Star Wars',             'Jedi / La Última Jedi',       false, 'female', '{"usa_sable_laser":true,"es_villano":false,"usa_la_fuerza":true,"es_droide":false}')
on conflict (id) do nothing;
