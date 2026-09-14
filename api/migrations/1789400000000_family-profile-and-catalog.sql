-- Up Migration

-- The family profile: who is in the family and what they play with. Rows keep
-- the order the parent gave them in `position`, and names stay exactly as typed.
create table kids (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  position smallint not null,
  name text not null check (name <> ''),
  -- Parents give an age in years. Counting from the day they gave it keeps it
  -- current without asking for a birthday.
  age_years smallint check (age_years between 0 and 17),
  age_set_on date,
  created_at timestamptz not null default current_timestamp,
  check ((age_years is null) = (age_set_on is null))
);
create index kids_family_id_idx on kids (family_id);

create table pets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  position smallint not null,
  name text not null check (name <> ''),
  created_at timestamptz not null default current_timestamp
);
create index pets_family_id_idx on pets (family_id);

create table interests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  position smallint not null,
  label text not null check (label <> ''),
  created_at timestamptz not null default current_timestamp
);
create index interests_family_id_idx on interests (family_id);

-- Toys by the family's own name for them. The description for the AI arrives
-- with the toy box in 0.2, as a separate column.
create table toys (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  position smallint not null,
  name text not null check (name <> ''),
  created_at timestamptz not null default current_timestamp
);
create index toys_family_id_idx on toys (family_id);

-- The activity catalog: reviewed templates tagged with the full taxonomy,
-- whose slots ({kid}, {pet}, {toy}, {toy2}, {toy3}, {interest}) code fills for
-- each family. Safety rules are part of the reviewed core.
create table activity_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  minutes smallint not null check (minutes > 0),
  place text not null check (place in ('indoor', 'outdoor')),
  min_age_months smallint not null check (min_age_months >= 0),
  max_age_months smallint not null,
  energy text not null check (energy in ('low', 'medium', 'high')),
  categories text[] not null check (
    cardinality(categories) > 0
    and categories <@ array['move', 'create', 'pretend', 'explore', 'learn', 'low_energy', 'helpers', 'out_and_about']
  ),
  small_space boolean not null,
  materials text[] not null default '{}',
  skills text[] not null default '{}',
  safety text[] not null default '{}',
  why text not null,
  needs text not null,
  steps text[] not null check (cardinality(steps) > 0),
  easier text not null,
  harder text not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  check (max_age_months >= min_age_months)
);

-- Activities suggested to a family, as they were tailored: the text stays what
-- the parent saw, even if the template or the family changes later.
create table activities (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  template_id uuid references activity_templates (id) on delete set null,
  title text not null,
  minutes smallint not null,
  place text not null,
  why text not null,
  needs text not null,
  steps text[] not null,
  easier text not null,
  harder text not null,
  created_at timestamptz not null default current_timestamp
);
create index activities_family_id_created_at_idx on activities (family_id, created_at desc);

create table story_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  teaser text not null,
  minutes smallint not null check (minutes > 0),
  mood text not null check (mood in ('calm', 'lively')),
  min_age_months smallint not null check (min_age_months >= 0),
  max_age_months smallint not null,
  -- Parts, each a list of paragraphs.
  parts jsonb not null check (jsonb_typeof(parts) = 'array'),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  check (max_age_months >= min_age_months)
);

-- Stories written for a family: from a template for now, by an LLM later
-- (`source`). Saved, so a story reads again exactly as it did the first time.
create table stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  template_id uuid references story_templates (id) on delete set null,
  source text not null check (source in ('template', 'generated')),
  title text not null,
  teaser text not null,
  minutes smallint not null,
  parts jsonb not null check (jsonb_typeof(parts) = 'array'),
  created_at timestamptz not null default current_timestamp
);
create unique index stories_family_id_template_id_key on stories (family_id, template_id) where template_id is not null;

-- Down Migration

drop table stories;
drop table story_templates;
drop table activities;
drop table activity_templates;
drop table toys;
drop table interests;
drop table pets;
drop table kids;
