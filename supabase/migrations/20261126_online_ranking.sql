-- Família Fighter: modo online casual, histórico e ranking da família (idempotente)
-- Já aplicada no projeto "Jogo-Teste" (dfakyswraikzxrgkbteu).
alter table public.family_fighter_match_events
  add column if not exists mode text not null default 'cpu',
  add column if not exists opponent_fighter text,
  add column if not exists opponent_name text;
alter table public.family_fighter_match_events drop constraint if exists family_fighter_match_events_mode_check;
alter table public.family_fighter_match_events add constraint family_fighter_match_events_mode_check
  check (mode in ('cpu', 'story', 'online'));
alter table public.family_fighter_match_events drop constraint if exists family_fighter_match_events_opponent_fighter_check;
alter table public.family_fighter_match_events add constraint family_fighter_match_events_opponent_fighter_check
  check (opponent_fighter is null or opponent_fighter in ('juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'));
alter table public.family_fighter_match_events drop constraint if exists family_fighter_match_events_opponent_name_check;
alter table public.family_fighter_match_events add constraint family_fighter_match_events_opponent_name_check
  check (opponent_name is null or char_length(opponent_name) <= 32);

alter table public.family_fighter_profiles
  add column if not exists online_wins integer not null default 0 check (online_wins >= 0),
  add column if not exists online_losses integer not null default 0 check (online_losses >= 0),
  add column if not exists online_draws integer not null default 0 check (online_draws >= 0);

-- cada jogador lê o próprio histórico (escrita só pela função)
grant select on public.family_fighter_match_events to authenticated;
drop policy if exists "Players can read their own matches" on public.family_fighter_match_events;
create policy "Players can read their own matches"
  on public.family_fighter_match_events for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.record_family_fighter_match_v2(
  p_match_id uuid,
  p_outcome text,
  p_selected_fighter text,
  p_mode text default 'cpu',
  p_opponent_fighter text default null,
  p_opponent_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  fighters text[] := array['juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi'];
  clean_name text := nullif(left(btrim(coalesce(p_opponent_name, '')), 32), '');
  is_online boolean := p_mode = 'online';
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_match_id is null then raise exception 'Match ID is required'; end if;
  if p_outcome is null or p_outcome not in ('win', 'loss', 'draw') then raise exception 'Invalid match outcome'; end if;
  if p_selected_fighter is null or not (p_selected_fighter = any (fighters)) then raise exception 'Invalid fighter'; end if;
  if p_mode is null or p_mode not in ('cpu', 'story', 'online') then raise exception 'Invalid mode'; end if;
  if p_opponent_fighter is not null and not (p_opponent_fighter = any (fighters)) then raise exception 'Invalid opponent'; end if;
  if clean_name is not null and clean_name ~ '[[:cntrl:]<>]' then clean_name := null; end if;

  if (
    select count(*) from public.family_fighter_match_events e
    where e.user_id = current_user_id and e.created_at > now() - interval '24 hours'
  ) >= 300 then
    raise exception 'Daily match limit reached';
  end if;

  insert into public.family_fighter_match_events (user_id, match_id, outcome, selected_fighter, mode, opponent_fighter, opponent_name)
  values (current_user_id, p_match_id, p_outcome, p_selected_fighter, p_mode, p_opponent_fighter, clean_name)
  on conflict (user_id, match_id) do nothing;
  if not found then return; end if;

  insert into public.family_fighter_profiles (user_id, nickname, selected_fighter, matches_played, wins, losses, draws, online_wins, online_losses, online_draws)
  values (
    current_user_id, 'Jogador', p_selected_fighter, 1,
    (p_outcome = 'win')::int, (p_outcome = 'loss')::int, (p_outcome = 'draw')::int,
    (is_online and p_outcome = 'win')::int, (is_online and p_outcome = 'loss')::int, (is_online and p_outcome = 'draw')::int
  )
  on conflict (user_id) do update
  set selected_fighter = excluded.selected_fighter,
      matches_played = public.family_fighter_profiles.matches_played + 1,
      wins = public.family_fighter_profiles.wins + excluded.wins,
      losses = public.family_fighter_profiles.losses + excluded.losses,
      draws = public.family_fighter_profiles.draws + excluded.draws,
      online_wins = public.family_fighter_profiles.online_wins + excluded.online_wins,
      online_losses = public.family_fighter_profiles.online_losses + excluded.online_losses,
      online_draws = public.family_fighter_profiles.online_draws + excluded.online_draws,
      updated_at = now();
end;
$$;
revoke all on function public.record_family_fighter_match_v2(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_family_fighter_match_v2(uuid, text, text, text, text, text) to authenticated;

-- a versão antiga continua funcionando (clientes em cache)
create or replace function public.record_family_fighter_match(p_match_id uuid, p_outcome text, p_selected_fighter text)
returns void
language sql
security definer
set search_path = ''
as $$ select public.record_family_fighter_match_v2(p_match_id, p_outcome, p_selected_fighter, 'cpu', null, null); $$;
revoke all on function public.record_family_fighter_match(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_family_fighter_match(uuid, text, text) to authenticated;

-- Ranking da família: só apelido e números (nada de e-mail ou id)
create or replace function public.family_fighter_leaderboard(p_limit integer default 20)
returns table (
  nickname text,
  selected_fighter text,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  online_wins integer,
  online_losses integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nickname, p.selected_fighter, p.matches_played, p.wins, p.losses, p.draws, p.online_wins, p.online_losses, p.updated_at
  from public.family_fighter_profiles p
  where p.matches_played > 0
  order by (p.online_wins * 3 + p.wins) desc, p.wins desc, p.matches_played asc, p.updated_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke all on function public.family_fighter_leaderboard(integer) from public, anon, authenticated;
grant execute on function public.family_fighter_leaderboard(integer) to anon, authenticated;
