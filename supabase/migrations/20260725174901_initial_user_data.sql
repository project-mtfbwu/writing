-- Writing user-data schema (educational Markdown stays in git; never store books here).

create extension if not exists "pgcrypto";

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Helpers (private schema — not exposed via Data API)
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function private.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  );
$$;

revoke all on function private.is_project_member(uuid) from public;
revoke all on function private.is_project_owner(uuid) from public;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.is_project_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  format text not null default 'feature',
  genre text not null default '',
  tone text not null default '',
  logline text not null default '',
  controlling_idea text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  current_draft_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index projects_owner_id_idx on public.projects (owner_id);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

alter table public.projects enable row level security;

create policy "projects_select_member"
  on public.projects for select
  to authenticated
  using (private.is_project_member(id) or owner_id = auth.uid());

create policy "projects_insert_owner"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "projects_update_owner"
  on public.projects for update
  to authenticated
  using (private.is_project_owner(id) or owner_id = auth.uid())
  with check (private.is_project_owner(id) or owner_id = auth.uid());

create policy "projects_delete_owner"
  on public.projects for delete
  to authenticated
  using (private.is_project_owner(id) or owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);
create index project_members_project_id_idx on public.project_members (project_id);

alter table public.project_members enable row level security;

create policy "project_members_select_member"
  on public.project_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_project_member(project_id)
  );

create policy "project_members_insert_owner"
  on public.project_members for insert
  to authenticated
  with check (
    private.is_project_owner(project_id)
    or (
      role = 'owner'
      and user_id = auth.uid()
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

create policy "project_members_update_owner"
  on public.project_members for update
  to authenticated
  using (private.is_project_owner(project_id))
  with check (private.is_project_owner(project_id));

create policy "project_members_delete_owner"
  on public.project_members for delete
  to authenticated
  using (private.is_project_owner(project_id));

-- Seed owner membership + empty premise when a project is created.
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do nothing;

  insert into public.premises (project_id, title, format, genre, tone)
  values (new.id, new.title, new.format, new.genre, new.tone)
  on conflict (project_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- premises (one per project)
-- ---------------------------------------------------------------------------

create table public.premises (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  title text not null default '',
  format text not null default 'feature',
  genre text not null default '',
  tone text not null default '',
  protagonist text not null default '',
  inciting_incident text not null default '',
  goal text not null default '',
  stakes text not null default '',
  obstacle text not null default '',
  controlling_idea text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger premises_set_updated_at
before update on public.premises
for each row execute function private.set_updated_at();

alter table public.premises enable row level security;

create policy "premises_select_member"
  on public.premises for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "premises_insert_member"
  on public.premises for insert
  to authenticated
  with check (private.is_project_member(project_id));

create policy "premises_update_member"
  on public.premises for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "premises_delete_owner"
  on public.premises for delete
  to authenticated
  using (private.is_project_owner(project_id));

-- Now that premises exists, wire project create trigger.
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- ---------------------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------------------

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  role text not null default '',
  want text not null default '',
  need text not null default '',
  wound text not null default '',
  lie text not null default '',
  arc text not null default '',
  method text not null default '',
  relationship_to_theme text not null default '',
  register text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index characters_project_id_idx on public.characters (project_id);

create trigger characters_set_updated_at
before update on public.characters
for each row execute function private.set_updated_at();

alter table public.characters enable row level security;

create policy "characters_select_member"
  on public.characters for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "characters_insert_member"
  on public.characters for insert
  to authenticated
  with check (private.is_project_member(project_id));

create policy "characters_update_member"
  on public.characters for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "characters_delete_member"
  on public.characters for delete
  to authenticated
  using (private.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- drafts
-- ---------------------------------------------------------------------------

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null default 'Draft 1',
  body text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index drafts_project_id_idx on public.drafts (project_id);

create trigger drafts_set_updated_at
before update on public.drafts
for each row execute function private.set_updated_at();

alter table public.projects
  add constraint projects_current_draft_id_fkey
  foreign key (current_draft_id) references public.drafts (id)
  on delete set null;

alter table public.drafts enable row level security;

create policy "drafts_select_member"
  on public.drafts for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "drafts_insert_member"
  on public.drafts for insert
  to authenticated
  with check (private.is_project_member(project_id));

create policy "drafts_update_member"
  on public.drafts for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "drafts_delete_owner"
  on public.drafts for delete
  to authenticated
  using (private.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- lesson_progress (user progress)
-- ---------------------------------------------------------------------------

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_version text not null,
  course_id text not null,
  lesson_id text not null,
  completed_exercise_ids jsonb not null default '[]'::jsonb,
  completed_step_ids jsonb not null default '[]'::jsonb,
  video_position_seconds double precision not null default 0,
  video_completed boolean not null default false,
  completion_count integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_id, content_version)
);

create index lesson_progress_user_id_idx on public.lesson_progress (user_id);

create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute function private.set_updated_at();

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select_own"
  on public.lesson_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "lesson_progress_insert_own"
  on public.lesson_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "lesson_progress_update_own"
  on public.lesson_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lesson_progress_delete_own"
  on public.lesson_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- bookmarks
-- ---------------------------------------------------------------------------

create table public.bookmarks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  book_title text not null,
  chapter_id text not null,
  chapter_slug text not null,
  chapter_title text not null,
  section_id text,
  section_title text,
  heading_id text,
  href text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index bookmarks_user_id_idx on public.bookmarks (user_id);

alter table public.bookmarks enable row level security;

create policy "bookmarks_select_own"
  on public.bookmarks for select
  to authenticated
  using (user_id = auth.uid());

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bookmarks_update_own"
  on public.bookmarks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reader_notes
-- ---------------------------------------------------------------------------

create table public.reader_notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  book_title text not null,
  chapter_id text not null,
  chapter_slug text not null,
  chapter_title text not null,
  section_id text,
  section_title text,
  heading_id text,
  href text not null,
  body text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index reader_notes_user_id_idx on public.reader_notes (user_id);

create trigger reader_notes_set_updated_at
before update on public.reader_notes
for each row execute function private.set_updated_at();

alter table public.reader_notes enable row level security;

create policy "reader_notes_select_own"
  on public.reader_notes for select
  to authenticated
  using (user_id = auth.uid());

create policy "reader_notes_insert_own"
  on public.reader_notes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "reader_notes_update_own"
  on public.reader_notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reader_notes_delete_own"
  on public.reader_notes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- exercise_attempts
-- ---------------------------------------------------------------------------

create table public.exercise_attempts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  content_version text not null,
  course_id text not null,
  lesson_id text not null,
  exercise_id text not null,
  response jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  feedback text not null default '',
  attempt_number integer not null default 1,
  original_answer jsonb not null default '{}'::jsonb,
  applied_project_id uuid references public.projects (id) on delete set null,
  applied_entity_type text,
  applied_entity_id text,
  applied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index exercise_attempts_user_id_idx on public.exercise_attempts (user_id);
create index exercise_attempts_exercise_id_idx on public.exercise_attempts (exercise_id);

alter table public.exercise_attempts enable row level security;

create policy "exercise_attempts_select_own"
  on public.exercise_attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "exercise_attempts_insert_own"
  on public.exercise_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "exercise_attempts_update_own"
  on public.exercise_attempts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exercise_attempts_delete_own"
  on public.exercise_attempts for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- review_findings (placeholder for later review runs)
-- ---------------------------------------------------------------------------

create table public.review_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  rule_id text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'fixed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index review_findings_user_id_idx on public.review_findings (user_id);
create index review_findings_project_id_idx on public.review_findings (project_id);

create trigger review_findings_set_updated_at
before update on public.review_findings
for each row execute function private.set_updated_at();

alter table public.review_findings enable row level security;

create policy "review_findings_select_own_member"
  on public.review_findings for select
  to authenticated
  using (user_id = auth.uid() and private.is_project_member(project_id));

create policy "review_findings_insert_own_member"
  on public.review_findings for insert
  to authenticated
  with check (user_id = auth.uid() and private.is_project_member(project_id));

create policy "review_findings_update_own"
  on public.review_findings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "review_findings_delete_own"
  on public.review_findings for delete
  to authenticated
  using (user_id = auth.uid());
