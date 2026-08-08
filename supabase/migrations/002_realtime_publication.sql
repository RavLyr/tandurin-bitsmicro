-- Enable the realtime channel for the Kanban board (board.tsx subscribes to
-- postgres_changes on public.tasks). Idempotent: only adds the table when it
-- is not yet a member of the supabase_realtime publication.
begin;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
commit;
