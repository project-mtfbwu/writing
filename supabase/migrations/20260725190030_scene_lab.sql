-- Scene Lab: extended scene fields, micro-beats, and transparent review runs.

alter table public.scenes
  add column if not exists pov_owner text not null default '',
  add column if not exists scene_objective text not null default '',
  add column if not exists why_now text not null default '',
  add column if not exists obstacle text not null default '',
  add column if not exists tactics text not null default '',
  add column if not exists turn_description text not null default '',
  add column if not exists charge_in text not null default '',
  add column if not exists charge_out text not null default '',
  add column if not exists object text not null default '',
  add column if not exists light_source text not null default '',
  add column if not exists environment text not null default '',
  add column if not exists background_life text not null default '',
  add column if not exists register text not null default '',
  add column if not exists deletion_test_result text not null default '',
  add column if not exists long_draft text not null default '',
  add column if not exists dialogue_notes text not null default '',
  add column if not exists setups_provided text not null default '',
  add column if not exists payoffs_supported text not null default '',
  add column if not exists character_decisions_supported text not null default '';

create table public.micro_beats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sort_order integer not null default 0,
  action_tactic text not null default '',
  reaction_resistance text not null default '',
  adjustment text not null default '',
  load_or_absorb text not null default 'Load'
    check (load_or_absorb in ('Load', 'Absorb')),
  element_range_start integer,
  element_range_end integer,
  duration_estimate_seconds integer,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index micro_beats_scene_id_idx on public.micro_beats (scene_id, sort_order);
create index micro_beats_project_id_idx on public.micro_beats (project_id);

create trigger micro_beats_set_updated_at
before update on public.micro_beats
for each row execute function private.set_updated_at();

alter table public.micro_beats enable row level security;

create policy "micro_beats_select_member"
  on public.micro_beats for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "micro_beats_insert_member"
  on public.micro_beats for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "micro_beats_update_member"
  on public.micro_beats for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "micro_beats_delete_member"
  on public.micro_beats for delete
  to authenticated
  using (private.is_project_member(project_id));

create table public.scene_review_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'guided'
    check (mode in ('guided', 'expert')),
  ruleset_version text not null default 'scene-lab-v1',
  created_at timestamptz not null default timezone('utc', now())
);

create index scene_review_runs_scene_id_idx on public.scene_review_runs (scene_id, created_at desc);
create index scene_review_runs_project_id_idx on public.scene_review_runs (project_id);

alter table public.scene_review_runs enable row level security;

create policy "scene_review_runs_select_member"
  on public.scene_review_runs for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "scene_review_runs_insert_member"
  on public.scene_review_runs for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "scene_review_runs_delete_member"
  on public.scene_review_runs for delete
  to authenticated
  using (private.is_project_member(project_id));

create table public.scene_review_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.scene_review_runs (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_id text not null,
  severity text not null default 'warning'
    check (severity in ('suggestion', 'warning', 'blocker')),
  evidence_location text not null default '',
  explanation text not null,
  atlas_concept_id text not null default '',
  lesson_id text not null default '',
  exercise_id text not null default '',
  book_id text not null default '',
  chapter_slug text not null default '',
  section_id text,
  heading_id text,
  source_label text not null default '',
  eli5_topic text not null default '',
  dialogue_cut_tag text
    check (
      dialogue_cut_tag is null
      or dialogue_cut_tag in (
        'states_emotion',
        'repeats_known_information',
        'answers_directly',
        'replaceable_by_image_object_silence'
      )
    ),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'deferred')),
  user_response text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index scene_review_findings_run_id_idx on public.scene_review_findings (run_id);
create index scene_review_findings_scene_id_idx on public.scene_review_findings (scene_id, status);
create index scene_review_findings_project_id_idx on public.scene_review_findings (project_id);

create trigger scene_review_findings_set_updated_at
before update on public.scene_review_findings
for each row execute function private.set_updated_at();

alter table public.scene_review_findings enable row level security;

create policy "scene_review_findings_select_member"
  on public.scene_review_findings for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "scene_review_findings_insert_member"
  on public.scene_review_findings for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "scene_review_findings_update_member"
  on public.scene_review_findings for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "scene_review_findings_delete_member"
  on public.scene_review_findings for delete
  to authenticated
  using (private.is_project_member(project_id));
