-- Execute após supabase/schema.sql para aceitar todos os lutadores do jogo 2.5D.
alter table public.family_fighter_profiles
  drop constraint if exists family_fighter_profiles_selected_fighter_check;
alter table public.family_fighter_profiles
  add constraint family_fighter_profiles_selected_fighter_check
  check (selected_fighter in ('juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'));

alter table public.family_fighter_match_events
  drop constraint if exists family_fighter_match_events_selected_fighter_check;
alter table public.family_fighter_match_events
  add constraint family_fighter_match_events_selected_fighter_check
  check (selected_fighter in ('juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'));

create or replace function public.record_family_fighter_match(
  p_match_id uuid,
  p_outcome text,
  p_selected_fighter text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_match_id is null then raise exception 'Match ID is required'; end if;
  if p_outcome is null or p_outcome not in ('win', 'loss', 'draw') then
    raise exception 'Invalid match outcome';
  end if;
  if p_selected_fighter is null or p_selected_fighter not in
    ('juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi') then
    raise exception 'Invalid fighter';
  end if;

  if (
    select count(*) from public.family_fighter_match_events e
    where e.user_id = current_user_id and e.created_at > now() - interval '24 hours'
  ) >= 300 then
    raise exception 'Daily match limit reached';
  end if;

  insert into public.family_fighter_match_events (user_id, match_id, outcome, selected_fighter)
  values (current_user_id, p_match_id, p_outcome, p_selected_fighter)
  on conflict (user_id, match_id) do nothing;
  if not found then return; end if;

  insert into public.family_fighter_profiles (
    user_id, nickname, selected_fighter, matches_played, wins, losses, draws
  ) values (
    current_user_id, 'Jogador', p_selected_fighter, 1,
    case when p_outcome = 'win' then 1 else 0 end,
    case when p_outcome = 'loss' then 1 else 0 end,
    case when p_outcome = 'draw' then 1 else 0 end
  )
  on conflict (user_id) do update
  set selected_fighter = excluded.selected_fighter,
      matches_played = public.family_fighter_profiles.matches_played + 1,
      wins = public.family_fighter_profiles.wins + excluded.wins,
      losses = public.family_fighter_profiles.losses + excluded.losses,
      draws = public.family_fighter_profiles.draws + excluded.draws,
      updated_at = now();
end;
$$;

revoke all on function public.record_family_fighter_match(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_family_fighter_match(uuid, text, text)
  to authenticated;
