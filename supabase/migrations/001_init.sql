-- 001_init.sql — Tanduri schema (T-002). Sole schema file.
-- Source of truth: docs/DESIGN.md §6. RLS enabled on every table; on
-- notification_logs + weather_cache there are NO policies (service-role only).

-- 1. Tables ---------------------------------------------------------------

-- F-01/F-10: profiles (trigger inserts row on auth.users insert)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_url text,
  notification_email_preference boolean not null default true,
  reminder_hour int not null default 7 check (reminder_hour between 0 and 23),
  created_at timestamptz not null default now()
);

-- F-07: lands
create table lands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  name text not null check (char_length(name) <= 60),
  location text,
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  area_m2 numeric check (area_m2 between 1 and 100000),
  media text not null default 'soil' check (media in ('soil','hydroponic','pot','other')),
  water text not null default 'plenty' check (water in ('plenty','limited')),
  sunlight text not null default 'full' check (sunlight in ('full','partial','shade')),
  budget_idr numeric check (budget_idr between 0 and 1000000000000),
  experience text not null default 'beginner' check (experience in ('beginner','experienced','professional')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index lands_single_active on lands (user_id) where is_active;

-- F-02/F-08: conversations + messages
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  land_id uuid references lands(id),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_updated on conversations (user_id, updated_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index messages_conv_created on messages (conversation_id, created_at);

-- F-05/F-06: tasks + task_comments
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  land_id uuid references lands(id),
  conversation_id uuid references conversations(id),
  title text not null,
  description text,
  status text not null default 'belum_dikerjakan'
    check (status in ('belum_dikerjakan','sedang_dikerjakan','selesai')),
  due_date date not null,
  position int not null,
  phase text check (phase in ('olah_lahan','semai','tanam','pemupukan','penyiraman','panen','perawatan')),
  crop text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_status_due on tasks (user_id, status, due_date);
create unique index tasks_positions on tasks (user_id, land_id, status, position);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

-- F-09: notification_logs
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  task_id uuid not null references tasks(id) on delete cascade,
  type text not null check (type in ('email_reminder','email_failed')),
  sent_at date not null,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, type, sent_at)
);

-- F-03: weather_cache
create table weather_cache (
  lat numeric not null,
  lon numeric not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (lat, lon)
);

-- 2. Trigger: profile row on user signup --------------------------------
-- security definer, avalanche-safe; search_path pinned to public.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. updated_at bump triggers ---------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lands_updated_at
  before update on lands
  for each row execute function public.set_updated_at();
create trigger conversations_updated_at
  before update on conversations
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at
  before update on tasks
  for each row execute function public.set_updated_at();

-- 4. RPC atomic reorder ---------------------------------------------------
create or replace function public.update_task_positions(p_user uuid, p_land uuid, p_status text, p_ids uuid[])
returns void
language plpgsql
as $$
declare i int;
begin
  for i in 1..array_length(p_ids, 1) loop
    update public.tasks
    set position = i, updated_at = now()
    where id = p_ids[i] and user_id = p_user and land_id = p_land and status = p_status;
  end loop;
end;
$$;

-- 5. RLS -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lands enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.notification_logs enable row level security;
alter table public.weather_cache enable row level security;

-- profiles: select/update own
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- lands: full CRUD own
create policy lands_all_own
  on public.lands for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- conversations: full CRUD own
create policy conversations_all_own
  on public.conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages: full CRUD own (scoped via user_id → conversation owner)
create policy messages_all_own
  on public.messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- tasks: full CRUD own
create policy tasks_all_own
  on public.tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- task_comments: full CRUD own
create policy task_comments_all_own
  on public.task_comments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notification_logs + weather_cache: RLS on, no policies (service-role only).

-- 6. Storage policies -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', false)
on conflict (id) do nothing;

-- plant-images: insert own, select own, delete own
create policy plant_images_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_images_select_own
  on storage.objects for select
  to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy plant_images_delete_own
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: select public, insert/update own, delete own
create policy avatars_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
create policy avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);