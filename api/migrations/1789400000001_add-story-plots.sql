-- Up Migration

create table story_plots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  title text not null check (title <> ''),
  teaser text not null check (teaser <> ''),
  minutes smallint not null check (minutes between 2 and 6),
  premise text not null check (premise <> ''),
  mood text not null check (mood in ('calm', 'lively')),
  created_at timestamptz not null default current_timestamp
);
create index story_plots_family_id_idx on story_plots (family_id);

alter table stories add column plot_id uuid references story_plots (id) on delete set null;
create unique index stories_family_id_plot_id_key on stories (family_id, plot_id) where plot_id is not null;
create index stories_family_id_created_at_idx on stories (family_id, created_at desc);

-- Down Migration

drop index if exists stories_family_id_created_at_idx;
drop index if exists stories_family_id_plot_id_key;
alter table stories drop column if exists plot_id;
drop table if exists story_plots cascade;