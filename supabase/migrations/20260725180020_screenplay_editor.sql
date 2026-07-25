-- Structured screenplay elements and draft version history.

alter table public.drafts
  add column if not exists revision integer not null default 1;

create table public.draft_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  revision integer not null,
  label text not null default '',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index draft_versions_draft_id_idx on public.draft_versions (draft_id, revision desc);
create index draft_versions_project_id_idx on public.draft_versions (project_id);

alter table public.draft_versions enable row level security;

create policy "draft_versions_select_member"
  on public.draft_versions for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "draft_versions_insert_member"
  on public.draft_versions for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "draft_versions_delete_owner"
  on public.draft_versions for delete
  to authenticated
  using (private.is_project_owner(project_id));

create table public.screenplay_elements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  element_type text not null
    check (element_type in (
      'scene_heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      'shot',
      'note'
    )),
  content text not null default '',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index screenplay_elements_draft_sort_idx
  on public.screenplay_elements (draft_id, sort_order);
create index screenplay_elements_scene_id_idx
  on public.screenplay_elements (scene_id);
create index screenplay_elements_project_id_idx
  on public.screenplay_elements (project_id);

create trigger screenplay_elements_set_updated_at
before update on public.screenplay_elements
for each row execute function private.set_updated_at();

alter table public.screenplay_elements enable row level security;

create policy "screenplay_elements_select_member"
  on public.screenplay_elements for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "screenplay_elements_insert_member"
  on public.screenplay_elements for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "screenplay_elements_update_member"
  on public.screenplay_elements for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "screenplay_elements_delete_member"
  on public.screenplay_elements for delete
  to authenticated
  using (private.is_project_member(project_id));
