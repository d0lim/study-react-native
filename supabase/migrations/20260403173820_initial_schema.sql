-- Users profile (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);

-- Plants
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  planted_at timestamptz not null default now(),
  boost_seconds integer not null default 0,
  harvested boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.plants enable row level security;
create policy "Users can read own plants" on public.plants
  for select using (auth.uid() = user_id);

-- Harvests
create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  fruit_type text not null,
  grade text not null check (grade in ('common', 'rare', 'legendary')),
  reward_amount integer not null,
  created_at timestamptz not null default now()
);

alter table public.harvests enable row level security;
create policy "Users can read own harvests" on public.harvests
  for select using (auth.uid() = user_id);

-- Items (owned by user)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('pot_skin', 'background_skin')),
  item_key text not null,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;
create policy "Users can read own items" on public.items
  for select using (auth.uid() = user_id);

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.users(id) on delete cascade,
  used_by uuid references public.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
create policy "Users can read own invites" on public.invites
  for select using (auth.uid() = inviter_id);

-- Shop catalog (read-only for clients)
create table public.shop_items (
  id text primary key,
  item_type text not null check (item_type in ('pot_skin', 'background_skin')),
  name text not null,
  price integer not null,
  image_url text
);

alter table public.shop_items enable row level security;
create policy "Anyone can read shop items" on public.shop_items
  for select using (true);

-- Seed shop data
insert into public.shop_items (id, item_type, name, price) values
  ('pot_classic', 'pot_skin', 'Classic Pot', 0),
  ('pot_gold', 'pot_skin', 'Gold Pot', 100),
  ('pot_crystal', 'pot_skin', 'Crystal Pot', 300),
  ('bg_garden', 'background_skin', 'Garden', 0),
  ('bg_night', 'background_skin', 'Night Sky', 150),
  ('bg_beach', 'background_skin', 'Beach', 250);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
