-- 003: fechar a agenda só em alguns horários do dia (ex.: 14:00 às 16:00), além do dia inteiro.
-- Rode DEPOIS da 002, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.
--
-- time_off ganha start_min/end_min (minutos desde 00:00). Sem os dois = dia inteiro (como era antes).
-- Com horário, vale para um único dia (starts_on = ends_on).

alter table public.time_off
  add column if not exists start_min int check (start_min is null or start_min between 0 and 1439),
  add column if not exists end_min   int check (end_min is null or end_min between 1 and 1440);

alter table public.time_off drop constraint if exists time_off_partial_check;
alter table public.time_off add constraint time_off_partial_check check (
  (start_min is null and end_min is null)
  or (start_min is not null and end_min is not null and end_min > start_min and starts_on = ends_on));

-- Mesma regra da 002, agora também sem os horários bloqueados: um horário só é oferecido se o
-- atendimento inteiro (início até início + duração) não encosta em nenhum bloqueio parcial.
create or replace function public.slot_candidates(p_slug text, p_service_id uuid, p_day date)
returns table (professional_id uuid, starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with shop as (
    select b.id, b.booking_window_days from public.barbershops b where b.slug = p_slug
  ),
  svc as (
    select s.id, s.duration_minutes
    from public.services s join shop on s.barbershop_id = shop.id
    where s.id = p_service_id and s.active
  ),
  today as (select (now() at time zone 'America/Sao_Paulo')::date as d),
  pros as (
    select p.id, p.slot_interval_minutes as step, w.start_min, w.lunch_start_min, w.lunch_end_min, w.end_min
    from public.professionals p
    join shop on p.barbershop_id = shop.id
    join public.service_professionals sp on sp.professional_id = p.id and sp.service_id = p_service_id
    join public.working_hours w on w.professional_id = p.id and w.weekday = extract(dow from p_day)::int
    where p.active
      and not exists (
        select 1 from public.time_off t
        where t.professional_id = p.id and t.start_min is null and p_day between t.starts_on and t.ends_on)
  ),
  cand as (
    select pros.id as pid, g.m,
           (p_day::timestamp + make_interval(mins => g.m)) at time zone 'America/Sao_Paulo' as t,
           svc.duration_minutes as dur
    from pros
    cross join svc
    cross join lateral generate_series(pros.start_min, pros.end_min - svc.duration_minutes, pros.step) as g(m)
    where pros.lunch_start_min is null
       or not (g.m < pros.lunch_end_min and g.m + svc.duration_minutes > pros.lunch_start_min)
  )
  select c.pid, c.t
  from cand c, shop, today
  where p_day >= today.d
    and p_day <= today.d + (shop.booking_window_days - 1)
    and c.t > now() + interval '30 minutes'
    and not exists (
      select 1 from public.time_off t
      where t.professional_id = c.pid and t.start_min is not null and t.starts_on = p_day
        and c.m < t.end_min and c.m + c.dur > t.start_min)
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = c.pid
        and a.status <> 'cancelado'
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(c.t, c.t + c.dur * interval '1 minute'));
$$;

revoke all on function public.slot_candidates(text, uuid, date) from public, anon, authenticated;
