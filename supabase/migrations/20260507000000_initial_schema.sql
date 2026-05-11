-- Habilitar extensiones
create extension if not exists "uuid-ossp";

-- Tabla profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  niche text,
  role text not null default 'user' check (role in ('user', 'admin')),
  scripts_used integer not null default 0,
  queries_used integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabla scripts (historial de guiones generados)
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  platform text,
  niche text,
  content text not null,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.scripts enable row level security;

-- Profiles: users ven el suyo, admins ven todos
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Scripts: users ven los suyos, admins ven todos
create policy "Users can view own scripts" on public.scripts
  for select using (auth.uid() = user_id);

create policy "Admins can view all scripts" on public.scripts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own scripts" on public.scripts
  for insert with check (auth.uid() = user_id);

-- Función que crea profile automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, niche, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'niche', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    niche = coalesce(excluded.niche, profiles.niche),
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Función segura para incrementar contadores
create or replace function public.increment_usage(
  p_user_id uuid,
  p_field text
) returns void language plpgsql security definer as $$
begin
  if p_field = 'scripts' then
    update public.profiles set scripts_used = scripts_used + 1, updated_at = now() where id = p_user_id;
  elsif p_field = 'queries' then
    update public.profiles set queries_used = queries_used + 1, updated_at = now() where id = p_user_id;
  end if;
end;
$$;
