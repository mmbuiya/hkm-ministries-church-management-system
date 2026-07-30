alter table if exists transactions
  add column if not exists is_anonymous boolean default false;
