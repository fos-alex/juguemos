-- Up Migration

-- Better Auth's tables, as its schema generator emits them for our naming
-- (api/src/auth/schema.js). A Better Auth upgrade or plugin that needs more
-- columns gets its own migration.
create table users (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null,
  image text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table sessions (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null,
  ip_address text,
  user_agent text,
  user_id text not null references users (id) on delete cascade
);
create index sessions_user_id_idx on sessions (user_id);

create table accounts (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references users (id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null
);
create index accounts_user_id_idx on accounts (user_id);

create table verifications (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);
create index verifications_identifier_idx on verifications (identifier);

create table families (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default current_timestamp
);

-- The adults with an account in each family. One family per adult for now;
-- the second parent joins in 0.6.
create table family_members (
  family_id uuid not null references families (id) on delete cascade,
  user_id text not null unique references users (id) on delete cascade,
  created_at timestamptz not null default current_timestamp,
  primary key (family_id, user_id)
);

-- Down Migration

drop table family_members;
drop table families;
drop table verifications;
drop table accounts;
drop table sessions;
drop table users;
