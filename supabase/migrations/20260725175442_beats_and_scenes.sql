-- Beats, scenes, and beat templates for screenplay structure.

-- ---------------------------------------------------------------------------
-- beat_templates (system catalog; optional to apply)
-- ---------------------------------------------------------------------------

create table public.beat_templates (
  key text primary key,
  name text not null,
  summary text not null,
  evidence_status text not null default 'E4'
    check (evidence_status in ('E1', 'E2', 'E3', 'E4', 'E5')),
  craft_note text not null default '',
  beats jsonb not null default '[]'::jsonb,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger beat_templates_set_updated_at
before update on public.beat_templates
for each row execute function private.set_updated_at();

alter table public.beat_templates enable row level security;

-- Templates are readable by any signed-in user; only service role mutates seeds.
create policy "beat_templates_select_authenticated"
  on public.beat_templates for select
  to authenticated
  using (true);

insert into public.beat_templates (key, name, summary, evidence_status, craft_note, beats) values
(
  'blank',
  'Blank structure',
  'Start with no predefined story landmarks.',
  'E4',
  'Craft heuristic — choose any structure that serves the story. No template is a law.',
  '[]'::jsonb
),
(
  'three-act',
  'Three-act starter',
  'Additive Act I / Act II / Act III landmarks.',
  'E4',
  'Three-act is a craft heuristic (E4), not a scientific law. Optional starter only.',
  '[
    {"name":"Act I","description":"Setup and irreversible launch","color_key":"setup","target_percentage":25,"template_key":"three-act:act-1"},
    {"name":"Act II","description":"Confrontation and midpoint pressure","color_key":"confrontation","target_percentage":50,"template_key":"three-act:act-2"},
    {"name":"Act III","description":"Climax and resolution","color_key":"resolution","target_percentage":25,"template_key":"three-act:act-3"}
  ]'::jsonb
),
(
  'eight-sequence',
  'Eight-sequence starter',
  'Additive eight-sequence scaffolding.',
  'E4',
  'Sequence maps are craft heuristics (E4). Optional and descriptive, not mandatory.',
  '[
    {"name":"Sequence 1","description":"Status quo and hook","color_key":"setup","target_percentage":12.5,"template_key":"eight-sequence:1"},
    {"name":"Sequence 2","description":"Inciting complication","color_key":"setup","target_percentage":12.5,"template_key":"eight-sequence:2"},
    {"name":"Sequence 3","description":"First major obstacle","color_key":"confrontation","target_percentage":12.5,"template_key":"eight-sequence:3"},
    {"name":"Sequence 4","description":"Midpoint approach","color_key":"confrontation","target_percentage":12.5,"template_key":"eight-sequence:4"},
    {"name":"Sequence 5","description":"Midpoint aftermath","color_key":"confrontation","target_percentage":12.5,"template_key":"eight-sequence:5"},
    {"name":"Sequence 6","description":"Crisis build","color_key":"confrontation","target_percentage":12.5,"template_key":"eight-sequence:6"},
    {"name":"Sequence 7","description":"Climax approach","color_key":"resolution","target_percentage":12.5,"template_key":"eight-sequence:7"},
    {"name":"Sequence 8","description":"Resolution","color_key":"resolution","target_percentage":12.5,"template_key":"eight-sequence:8"}
  ]'::jsonb
),
(
  'save-the-cat',
  'Save the Cat starter',
  'Additive commercial beat labels inspired by Save the Cat.',
  'E5',
  'Save the Cat is folklore/craft lore (E5) — widely repeated, not evidence. Optional labels only; never treat as law.',
  '[
    {"name":"Opening Image","description":"","color_key":"setup","target_percentage":1,"template_key":"save-the-cat:opening-image"},
    {"name":"Theme Stated","description":"","color_key":"setup","target_percentage":5,"template_key":"save-the-cat:theme-stated"},
    {"name":"Set-Up","description":"","color_key":"setup","target_percentage":10,"template_key":"save-the-cat:set-up"},
    {"name":"Catalyst","description":"","color_key":"setup","target_percentage":12,"template_key":"save-the-cat:catalyst"},
    {"name":"Debate","description":"","color_key":"setup","target_percentage":20,"template_key":"save-the-cat:debate"},
    {"name":"Break into Two","description":"","color_key":"confrontation","target_percentage":25,"template_key":"save-the-cat:break-into-two"},
    {"name":"B Story","description":"","color_key":"confrontation","target_percentage":30,"template_key":"save-the-cat:b-story"},
    {"name":"Fun and Games","description":"","color_key":"confrontation","target_percentage":40,"template_key":"save-the-cat:fun-and-games"},
    {"name":"Midpoint","description":"","color_key":"confrontation","target_percentage":50,"template_key":"save-the-cat:midpoint"},
    {"name":"Bad Guys Close In","description":"","color_key":"confrontation","target_percentage":60,"template_key":"save-the-cat:bad-guys-close-in"},
    {"name":"All Is Lost","description":"","color_key":"confrontation","target_percentage":75,"template_key":"save-the-cat:all-is-lost"},
    {"name":"Dark Night of the Soul","description":"","color_key":"confrontation","target_percentage":80,"template_key":"save-the-cat:dark-night"},
    {"name":"Break into Three","description":"","color_key":"resolution","target_percentage":85,"template_key":"save-the-cat:break-into-three"},
    {"name":"Finale","description":"","color_key":"resolution","target_percentage":95,"template_key":"save-the-cat:finale"},
    {"name":"Final Image","description":"","color_key":"resolution","target_percentage":99,"template_key":"save-the-cat:final-image"}
  ]'::jsonb
);

-- ---------------------------------------------------------------------------
-- beats
-- ---------------------------------------------------------------------------

create table public.beats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  color_key text not null default 'neutral'
    check (color_key in ('neutral', 'setup', 'confrontation', 'resolution', 'character', 'theme')),
  sort_order integer not null default 0,
  template_key text,
  target_percentage numeric(6,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Idempotent template application: same template beat key cannot duplicate in a draft.
  unique (draft_id, template_key)
);

create index beats_project_id_idx on public.beats (project_id);
create index beats_draft_id_sort_idx on public.beats (draft_id, sort_order);

create trigger beats_set_updated_at
before update on public.beats
for each row execute function private.set_updated_at();

alter table public.beats enable row level security;

create policy "beats_select_member"
  on public.beats for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "beats_insert_member"
  on public.beats for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "beats_update_member"
  on public.beats for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "beats_delete_member"
  on public.beats for delete
  to authenticated
  using (private.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- scenes
-- ---------------------------------------------------------------------------

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  beat_id uuid references public.beats (id) on delete set null,
  heading text not null default '',
  summary text not null default '',
  location text not null default '',
  time_of_day text not null default '',
  sort_order integer not null default 0,
  status text not null default 'idea'
    check (status in ('idea', 'outlined', 'drafted', 'polished')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index scenes_project_id_idx on public.scenes (project_id);
create index scenes_draft_id_beat_sort_idx on public.scenes (draft_id, beat_id, sort_order);
create index scenes_beat_id_idx on public.scenes (beat_id);

create trigger scenes_set_updated_at
before update on public.scenes
for each row execute function private.set_updated_at();

alter table public.scenes enable row level security;

create policy "scenes_select_member"
  on public.scenes for select
  to authenticated
  using (private.is_project_member(project_id));

create policy "scenes_insert_member"
  on public.scenes for insert
  to authenticated
  with check (
    private.is_project_member(project_id)
    and user_id = auth.uid()
  );

create policy "scenes_update_member"
  on public.scenes for update
  to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy "scenes_delete_member"
  on public.scenes for delete
  to authenticated
  using (private.is_project_member(project_id));

-- Ensure every project has at least one draft so structure routes can attach beats.
create or replace function public.ensure_project_draft(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
  v_owner uuid;
begin
  if not private.is_project_member(p_project_id) then
    raise exception 'not a project member';
  end if;

  select current_draft_id into v_draft_id
  from public.projects
  where id = p_project_id;

  if v_draft_id is not null then
    return v_draft_id;
  end if;

  select owner_id into v_owner from public.projects where id = p_project_id;

  insert into public.drafts (project_id, title, body, version)
  values (p_project_id, 'Draft 1', '', 1)
  returning id into v_draft_id;

  update public.projects
  set current_draft_id = v_draft_id
  where id = p_project_id;

  return v_draft_id;
end;
$$;

revoke all on function public.ensure_project_draft(uuid) from public;
grant execute on function public.ensure_project_draft(uuid) to authenticated;
