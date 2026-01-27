-- Cloud save table
create table if not exists public.saves (
  user_id    uuid primary key references auth.users on delete cascade,
  highest_level  int not null default 0,
  trajectory_ct  int not null default 3,
  remove_ct      int not null default 3,
  widen_ct       int not null default 3,
  total_stars    int not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "Users can read own save"
  on public.saves for select
  using (auth.uid() = user_id);

create policy "Users can upsert own save"
  on public.saves for insert
  with check (auth.uid() = user_id);

create policy "Users can update own save"
  on public.saves for update
  using (auth.uid() = user_id);

-- Leaderboard table
create table if not exists public.leaderboard (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique not null references auth.users on delete cascade,
  display_name   text not null default 'Anonymous',
  highest_level  int not null default 0,
  total_stars    int not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

create policy "Anyone can read leaderboard"
  on public.leaderboard for select
  using (true);

create policy "Users can upsert own entry"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entry"
  on public.leaderboard for update
  using (auth.uid() = user_id);
