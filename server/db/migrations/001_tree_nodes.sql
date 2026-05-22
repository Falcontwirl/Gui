-- Gui: filesystem-hierarchy drilldown
-- Single consolidated migration. Run against a fresh Supabase project.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  framework text,
  language text,
  file_count integer,
  summary text,
  pipeline_status text default 'pending',
  pipeline_progress jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists projects_user_idx on projects (user_id);

create table if not exists tree_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references tree_nodes(id) on delete cascade,
  kind text not null check (kind in ('folder', 'file')),
  path text not null,
  name text not null,
  depth integer not null,
  sort_order integer not null default 0,
  child_count integer not null default 0,
  raw_functions jsonb,
  function_blocks jsonb,
  function_block_details jsonb default '{}'::jsonb,
  brief_summary text,
  zone1_description text,
  generated_at timestamptz,
  language text,
  byte_size integer,
  created_at timestamptz default now(),
  unique (project_id, path)
);

create index if not exists tree_nodes_project_parent_idx
  on tree_nodes (project_id, parent_id);
create index if not exists tree_nodes_project_kind_idx
  on tree_nodes (project_id, kind);

-- Last-viewed node + lightweight UI state, scoped to a project.
create table if not exists user_state (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  last_node_id uuid references tree_nodes(id) on delete set null,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  node_id uuid references tree_nodes(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists chat_messages_project_idx on chat_messages (project_id);
create index if not exists chat_messages_node_idx on chat_messages (node_id);

-- When sharing a Supabase project with CodebaseExplorer, the existing
-- user_state and chat_messages tables won't have the Gui-specific columns
-- the CREATE TABLE IF NOT EXISTS above introduces. These statements add
-- them in-place when the tables already exist.
alter table user_state add column if not exists last_node_id uuid;
alter table chat_messages add column if not exists node_id uuid;

create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric not null default 0,
  operation text,
  created_at timestamptz default now()
);
create index if not exists api_usage_project_idx on api_usage (project_id, created_at desc);
