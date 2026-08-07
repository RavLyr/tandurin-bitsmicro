-- Tanduri demo seed (T-406). Idempotent: safe to re-run.
-- Insert a demo user, a land, and tasks across the three Kanban columns with
-- due dates today..today+7 (Asia/Jakarta), including one overdue task.

-- NOTE: demo user password must be set from the Learn page:
--   Supabase Dashboard → Authentication → Users → demo@tanduri.test
--   and reset the password there (supabase-admin cannot bare-hash client-side
--   without the auth service; setting password via Dashboard is simplest).

insert into profiles (id, display_name, notification_email_preference, reminder_hour)
values
  ('00000000-0000-4000-8000-000000000001', 'Demo Tanduri', true, 7)
on conflict (id) do nothing;

-- Demo land (Semarang coords, soil / plenty / full sun).
insert into lands (id, user_id, name, location, latitude, longitude, area_m2, media, water, sunlight, budget_idr, experience, is_active)
values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   'Pekarangan Dempo', 'Semarang', -6.9667, 110.4167, 12, 'soil', 'plenty', 'full', 300000, 'beginner', true)
on conflict (id) do update
  set is_active = true;

-- Due date helpers in Asia/Jakarta (UTC+7). Today = date() of now+7h.
-- Tasks: 2 in Belum Dikerjakan (one overdue), 2 Sedang Dikerjakan, 2 Selesai.
insert into tasks (id, user_id, land_id, conversation_id, title, description, status, due_date, position, phase, crop)
values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Olah Lahan Pekarangan Dempo', 'Menggemburkan tanah dan membersihkan gulma sebelum tanam.', 'belum_dikerjakan',
   (now() at time zone 'Asia/Jakarta' - interval '2 days')::date, 0, 'olah_lahan', 'Kangkung'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Semai Bibit Kangkung', 'Menyemai benih kangkung di tray semai.', 'belum_dikerjakan',
   (now() at time zone 'Asia/Jakarta' + interval '2 days')::date, 1, 'semai', 'Kangkung'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Tanam Bibit Cabai', 'Memindah bibit cabai ke polybag.', 'sedang_dikerjakan',
   (now() at time zone 'Asia/Jakarta' + interval '4 days')::date, 0, 'tanam', 'Cabai'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Penyiraman Kangkung', 'Siram pagi dan sore.', 'sedang_dikerjakan',
   (now() at time zone 'Asia/Jakarta' + interval '6 days')::date, 1, 'penyiraman', 'Kangkung'),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Panen Bayam', 'Panen bayam siap jual.', 'selesai',
   (now() at time zone 'Asia/Jakarta' - interval '3 days')::date, 0, 'panen', 'Bayam'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null,
   'Pemupukan Susulan Selada', 'Berikan pupuk NPK dosis ringan.', 'selesai',
   (now() at time zone 'Asia/Jakarta' - interval '1 day')::date, 1, 'pemupukan', 'Selada')
on conflict (id) do nothing;

-- Notification log for the already-sent overdue task (dedup proof).
insert into notification_logs (user_id, task_id, type, sent_at)
select '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'email_reminder',
       (now() at time zone 'Asia/Jakarta' - interval '1 day')::date
where not exists (
  select 1 from notification_logs
  where user_id = '00000000-0000-4000-8000-000000000001'
    and task_id = '00000000-0000-4000-8000-000000000010'
    and type = 'email_reminder'
);