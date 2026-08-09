-- 005_conversations_project_id.sql — link conversations to projects (T-024).
-- Riwayat shows the linked project badge; resuming a conversation passes its
-- project_id into the orchestrator. Column is nullable — old conversations
-- stay unlinked. RLS: conversations_all_own (001_init.sql) already covers the
-- new column, so no new policy is needed.
-- Rollback: drop index conversations_project_id; alter table conversations
-- drop column project_id;
alter table conversations add column project_id uuid references projects(id);
create index conversations_project_id on conversations (project_id);