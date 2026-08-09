-- 004_recurring_reminder.sql — recurring reminder type for notification_logs
-- T-20: cron sends recurring-task reminders logged as 'recurring_reminder';
-- the 001_init.sql CHECK only allowed email_reminder/email_failed.
-- Drop + re-add keeps the same constraint name so nothing else breaks.
alter table notification_logs drop constraint notification_logs_type_check;
alter table notification_logs add constraint notification_logs_type_check
  check (type in ('email_reminder', 'email_failed', 'recurring_reminder'));

-- T-21: per-profile recurring reminder prefs (defaults mirror notification_email_preference).
alter table profiles add column recurring_reminder_enabled boolean not null default true;
alter table profiles add column recurring_reminder_hour int not null default 7
  check (recurring_reminder_hour between 0 and 23);