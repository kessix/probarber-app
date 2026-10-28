-- 002: agenda por profissional, serviços completos, clientes e perfil da barbearia.
-- Rode DEPOIS da 001, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.
--
-- O que muda:
--   * Cada barbearia tem profissionais (hoje só o dono; equipe e Barbeiro Chefe entram depois)
--   * Horário por profissional e por dia da semana: início, almoço e fim, com intervalo entre horários
--   * Dias fechados (folga, feriado, férias) por profissional
--   * Serviços com foto, e quais serviços cada profissional atende; preço pode mudar por dia da semana
--   * Clientes (nome, e-mail, notificações) com opção de bloquear
--   * Perfil da barbearia: logo, telefone, endereço, Facebook e avaliação do Google
--   * Horários livres e agendamento calculados no banco (uma única fonte de verdade, sem sobreposição)
--
-- Os campos antigos opening_hour, closing_hour e closed_weekdays de barbershops deixam de ser usados
-- (o horário agora é por profissional). Ficam na tabela por segurança e podem ser removidos depois.

create extension if not exists btree_gist;

-- ------------------------------------------------ bases criadas antes da 001 final ---
alter table public.barbershops add column if not exists booking_window_days int not null default 10
  check (booking_window_days between 1 and 14);
alter table public.appointments add column if not exists pix_charge_id text unique;

-- ------------------------------------------------------------------- perfil da barbearia ---
alter table public.barbershops
  add column if not exists logo_url text,
  add column if not exists phone text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  add column if not exists address text check (address is null or char_length(address) <= 200),
  add column if not exists facebook text check (facebook is null or char_length(facebook) <= 200),
  add column if not exists google_review_url text check (google_review_url is null or char_length(google_review_url) <= 500);

-- ------------------------------------------------------------------------- profissionais ---
create table if not exists public.professionals (
  id                    uuid primary key default gen_random_uuid(),
  barbershop_id         uuid not null references public.barbershops (id) on delete cascade,
  user_id               uuid references auth.users (id) on delete set null,
  name                  text not null check (char_length(name) between 2 and 80),
  photo_url             text,
  is_owner              boolean not null default false,
  active                boolean not null default true,
  -- de quanto em quanto tempo começa um horário (09:00, 09:30...)
  slot_interval_minutes int not null default 30 check (slot_interval_minutes in (10, 15, 20, 30, 45, 60)),
  created_at            timestamptz not null default now()
);
create unique index if not exists professionals_one_owner on public.professionals (barbershop_id) where is_owner;
create index if not exists professionals_shop_idx on public.professionals (barbershop_id);

-- Horário de atendimento por dia da semana (0 = domingo). Sem linha = dia fechado.
-- Tempos em minutos desde 00:00 (540 = 09:00). Almoço é opcional.
create table if not exists public.working_hours (
  professional_id uuid not null references public.professionals (id) on delete cascade,
  weekday         int not null check (weekday between 0 and 6),
  start_min       int not null check (start_min between 0 and 1439),
  lunch_start_min int,
  lunch_end_min   int,
  end_min         int not null check (end_min between 1 and 1440),
  primary key (professional_id, weekday),
  check (end_min > start_min),
  check ((lunch_start_min is null and lunch_end_min is null)
      or (lunch_start_min is not null and lunch_end_min is not null
          and lunch_start_min > start_min and lunch_end_min > lunch_start_min and lunch_end_min < end_min))
);

-- Dias fechados (folga, feriado, férias): de starts_on até ends_on, inclusive.
create table if not exists public.time_off (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  starts_on       date not null,
  ends_on         date not null,
  reason          text check (reason is null or char_length(reason) <= 120),
  created_at      timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists time_off_pro_idx on public.time_off (professional_id, starts_on, ends_on);

-- ---------------------------------------------------------------------------- serviços ---
alter table public.services add column if not exists photo_url text;
alter table public.services add column if not exists sort_order int not null default 0;

-- Preço diferente em certos dias da semana. Sem linha = vale o preço padrão do serviço.
create table if not exists public.service_day_prices (
  service_id  uuid not null references public.services (id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6),
  price_cents int not null check (price_cents >= 0),
  primary key (service_id, weekday)
);

-- Quais serviços cada profissional atende.
create table if not exists public.service_professionals (
  service_id      uuid not null references public.services (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  primary key (service_id, professional_id)
);

-- ------------------------------------------------------------------------------ clientes ---
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 80),
  email          text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and email = lower(email)),
  phone          text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  -- aceitou receber confirmação e lembrete por e-mail
  notifications  boolean not null default false,
  blocked        boolean not null default false,
  blocked_reason text check (blocked_reason is null or char_length(blocked_reason) <= 200),
  created_at     timestamptz not null default now(),
  unique (barbershop_id, email)
);

-- ---------------------------------------------------------------------------- agendamentos ---
alter table public.appointments
  add column if not exists professional_id uuid references public.professionals (id) on delete restrict,
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists client_email text,
  add column if not exists ends_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

-- O telefone passa a ser opcional (o contato principal agora é o e-mail).
alter table public.appointments alter column client_phone drop not null;
alter table public.appointments drop constraint if exists appointments_client_phone_check;
alter table public.appointments add constraint appointments_client_phone_check
  check (client_phone is null or client_phone ~ '^[0-9]{10,11}$');

-- ------------------------------------------------- dados que já existiam (migração) ---
-- Todo dono vira o profissional da própria barbearia.
insert into public.professionals (barbershop_id, user_id, name, is_owner)
select b.id, b.owner_id, b.name, true
from public.barbershops b
where not exists (select 1 from public.professionals p where p.barbershop_id = b.id and p.is_owner);

-- Horário: copia o funcionamento antigo da barbearia (sem almoço) para quem ainda não tem horário.
insert into public.working_hours (professional_id, weekday, start_min, end_min)
select p.id, d, b.opening_hour * 60, b.closing_hour * 60
from public.professionals p
join public.barbershops b on b.id = p.barbershop_id
cross join generate_series(0, 6) d
where p.is_owner
  and not (d = any (b.closed_weekdays))
  and not exists (select 1 from public.working_hours w where w.professional_id = p.id)
on conflict do nothing;

-- Serviços atendidos: quem ainda não escolheu nenhum passa a atender todos.
insert into public.service_professionals (service_id, professional_id)
select s.id, p.id
from public.services s
join public.professionals p on p.barbershop_id = s.barbershop_id
where not exists (select 1 from public.service_professionals sp where sp.professional_id = p.id)
on conflict do nothing;

update public.appointments a
   set professional_id = p.id
  from public.professionals p
 where p.barbershop_id = a.barbershop_id and p.is_owner and a.professional_id is null;
update public.appointments
   set ends_at = starts_at + duration_minutes * interval '1 minute'
 where ends_at is null;
alter table public.appointments alter column professional_id set not null;
alter table public.appointments alter column ends_at set not null;

-- Nunca dois atendimentos ativos se sobrepondo para o mesmo profissional (considera a duração).
-- Substitui o índice antigo, que só impedia o mesmo horário de início.
drop index if exists public.appointments_no_double_booking;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_no_overlap') then
    alter table public.appointments add constraint appointments_no_overlap
      exclude using gist (professional_id with =, tstzrange(starts_at, ends_at) with &&)
      where (status <> 'cancelado');
  end if;
end $$;

-- --------------------------------------------------------------------------- gatilhos ---
-- Barbearia nova: já nasce com o dono como profissional, atendendo de segunda a sábado,
-- das 09:00 às 18:00, com almoço das 12:00 às 13:00. O barbeiro ajusta no app.
create or replace function public.on_barbershop_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pro uuid;
begin
  insert into public.professionals (barbershop_id, user_id, name, is_owner)
  values (new.id, new.owner_id, new.name, true)
  returning id into v_pro;

  insert into public.working_hours (professional_id, weekday, start_min, lunch_start_min, lunch_end_min, end_min)
  select v_pro, d, 540, 720, 780, 1080 from generate_series(1, 6) d;
  return new;
end $$;

drop trigger if exists barbershop_created on public.barbershops;
create trigger barbershop_created after insert on public.barbershops
  for each row execute function public.on_barbershop_created();

-- Serviço novo: por padrão todos os profissionais ativos da barbearia o atendem.
create or replace function public.on_service_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.service_professionals (service_id, professional_id)
  select new.id, p.id from public.professionals p
  where p.barbershop_id = new.barbershop_id and p.active
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists service_created on public.services;
create trigger service_created after insert on public.services
  for each row execute function public.on_service_created();

-- ---------------------------------------------------------------- funções de acesso ---
-- Usadas pelas regras de acesso (RLS). Definer: evitam recursão entre as tabelas.
create or replace function public.owns_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.barbershops b where b.id = p_shop and b.owner_id = (select auth.uid()));
$$;

create or replace function public.owns_professional(p_pro uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.professionals p join public.barbershops b on b.id = p.barbershop_id
    where p.id = p_pro and b.owner_id = (select auth.uid()));
$$;

create or replace function public.owns_service(p_service uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.services s join public.barbershops b on b.id = s.barbershop_id
    where s.id = p_service and b.owner_id = (select auth.uid()));
$$;

-- --------------------------------------------------------------------------------- RLS ---
alter table public.professionals         enable row level security;
alter table public.working_hours         enable row level security;
alter table public.time_off              enable row level security;
alter table public.service_day_prices    enable row level security;
alter table public.service_professionals enable row level security;
alter table public.clients               enable row level security;

drop policy if exists professionals_read  on public.professionals;
drop policy if exists professionals_write on public.professionals;
create policy professionals_read on public.professionals for select
  using (active or public.owns_shop(barbershop_id));
create policy professionals_write on public.professionals for all to authenticated
  using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));

drop policy if exists working_hours_owner on public.working_hours;
create policy working_hours_owner on public.working_hours for all to authenticated
  using (public.owns_professional(professional_id)) with check (public.owns_professional(professional_id));

drop policy if exists time_off_owner on public.time_off;
create policy time_off_owner on public.time_off for all to authenticated
  using (public.owns_professional(professional_id)) with check (public.owns_professional(professional_id));

drop policy if exists service_professionals_owner on public.service_professionals;
create policy service_professionals_owner on public.service_professionals for all to authenticated
  using (public.owns_service(service_id)) with check (public.owns_service(service_id));

-- O site mostra o preço do dia escolhido, então o público lê; só o dono altera.
drop policy if exists service_day_prices_read  on public.service_day_prices;
drop policy if exists service_day_prices_write on public.service_day_prices;
create policy service_day_prices_read on public.service_day_prices for select using (true);
create policy service_day_prices_write on public.service_day_prices for all to authenticated
  using (public.owns_service(service_id)) with check (public.owns_service(service_id));

-- Clientes: dados pessoais. Só o dono lê e altera (o site cria pelo create_appointment).
drop policy if exists clients_owner on public.clients;
create policy clients_owner on public.clients for all to authenticated
  using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));

grant execute on function public.owns_shop(uuid), public.owns_professional(uuid), public.owns_service(uuid)
  to anon, authenticated;

-- ------------------------------------------------------------- horários e agendamento ---
-- Todos os horários de início possíveis de um serviço em um dia, por profissional.
-- É a ÚNICA fonte das regras: dia da semana aberto, início/almoço/fim, intervalo entre horários,
-- dias fechados, prazo da agenda, antecedência mínima de 30 min e conflito com outros atendimentos.
-- Interna: o público usa available_slots e create_appointment.
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
        where t.professional_id = p.id and p_day between t.starts_on and t.ends_on)
  ),
  cand as (
    select pros.id as pid,
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
      select 1 from public.appointments a
      where a.professional_id = c.pid
        and a.status <> 'cancelado'
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(c.t, c.t + c.dur * interval '1 minute'));
$$;

-- Horários livres de um dia (o site usa isto para montar a agenda do cliente).
create or replace function public.available_slots(p_slug text, p_service_id uuid, p_day date)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct c.starts_at from public.slot_candidates(p_slug, p_service_id, p_day) c order by 1;
$$;

-- Dias dos próximos 14 que têm pelo menos um horário livre (o prazo da agenda já é aplicado dentro de
-- slot_candidates). O site mostra só esses dias, sem precisar conhecer o expediente do barbeiro.
create or replace function public.available_days(p_slug text, p_service_id uuid)
returns table (day date)
language sql stable security definer set search_path = public as $$
  select d::date
  from generate_series(
         (now() at time zone 'America/Sao_Paulo')::date::timestamp,
         ((now() at time zone 'America/Sao_Paulo')::date + 13)::timestamp,
         interval '1 day') d
  where exists (select 1 from public.slot_candidates(p_slug, p_service_id, d::date))
  order by 1;
$$;

-- Cria o agendamento do cliente. Preço e duração vêm do banco, nunca do cliente.
-- Preço: o do dia da semana, se houver, senão o padrão do serviço.
-- Pagamento: 'comum' -> nao_aplicavel; nos outros modos fica 'pendente' até a confirmação do Pix.
drop function if exists public.create_appointment(text, uuid, timestamptz, text, text, boolean);
drop function if exists public.taken_slots(text, date);

create or replace function public.create_appointment(
  p_slug text, p_service_id uuid, p_starts_at timestamptz,
  p_client_name text, p_client_email text, p_client_phone text default null,
  p_notifications boolean default false, p_pay_online boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_shop    public.barbershops%rowtype;
  v_service public.services%rowtype;
  v_client  public.clients%rowtype;
  v_local   timestamp;
  v_pro     uuid;
  v_price   int;
  v_email   text;
  v_phone   text;
  v_id      uuid;
begin
  select * into v_shop from public.barbershops where slug = p_slug;
  if not found then raise exception 'barbearia_nao_encontrada'; end if;

  select * into v_service from public.services
   where id = p_service_id and barbershop_id = v_shop.id and active;
  if not found then raise exception 'servico_invalido'; end if;

  v_email := lower(trim(p_client_email));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;
  v_phone := nullif(regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g'), '');

  if exists (select 1 from public.clients c
             where c.barbershop_id = v_shop.id and c.email = v_email and c.blocked) then
    raise exception 'cliente_bloqueado';
  end if;

  -- O horário precisa ser exatamente um dos livres: confere dia, expediente, almoço, prazo e conflito.
  v_local := p_starts_at at time zone 'America/Sao_Paulo';
  select c.professional_id into v_pro
    from public.slot_candidates(p_slug, p_service_id, v_local::date) c
   where c.starts_at = p_starts_at
   order by c.professional_id
   limit 1;
  if v_pro is null then raise exception 'horario_indisponivel'; end if;

  v_price := coalesce(
    (select d.price_cents from public.service_day_prices d
      where d.service_id = v_service.id and d.weekday = extract(dow from v_local)::int),
    v_service.price_cents);

  insert into public.clients (barbershop_id, name, email, phone, notifications)
  values (v_shop.id, trim(p_client_name), v_email, v_phone, coalesce(p_notifications, false))
  on conflict (barbershop_id, email) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, public.clients.phone),
        notifications = excluded.notifications
  returning * into v_client;

  insert into public.appointments
    (barbershop_id, professional_id, client_id, service_id, service_name, price_cents, duration_minutes,
     starts_at, ends_at, client_name, client_email, client_phone, payment_status, payment_online)
  values
    (v_shop.id, v_pro, v_client.id, v_service.id, v_service.name, v_price, v_service.duration_minutes,
     p_starts_at, p_starts_at + v_service.duration_minutes * interval '1 minute',
     v_client.name, v_email, v_phone,
     case when v_shop.booking_mode = 'comum' then 'nao_aplicavel' else 'pendente' end,
     v_shop.booking_mode <> 'comum' and coalesce(p_pay_online, false))
  returning id into v_id;

  return v_id;
exception when exclusion_violation then
  raise exception 'horario_indisponivel';
end $$;

revoke all on function public.slot_candidates(text, uuid, date) from public, anon, authenticated;
revoke all on function public.available_slots(text, uuid, date) from public;
revoke all on function public.available_days(text, uuid) from public;
revoke all on function public.create_appointment(text, uuid, timestamptz, text, text, text, boolean, boolean) from public;
grant execute on function public.available_slots(text, uuid, date) to anon, authenticated;
grant execute on function public.available_days(text, uuid) to anon, authenticated;
grant execute on function public.create_appointment(text, uuid, timestamptz, text, text, text, boolean, boolean)
  to anon, authenticated;

-- ---------------------------------------------------------------- fotos e logo (Storage) ---
-- Bucket público para leitura (as imagens aparecem no site). Só o dono grava, e só na própria pasta:
-- o primeiro nível do caminho é o id da barbearia (ex.: <id-da-barbearia>/logo.webp).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-assets', 'shop-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists shop_assets_insert on storage.objects;
drop policy if exists shop_assets_update on storage.objects;
drop policy if exists shop_assets_delete on storage.objects;
create policy shop_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-assets' and (storage.foldername(name))[1] in (
    select b.id::text from public.barbershops b where b.owner_id = (select auth.uid())));
create policy shop_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'shop-assets' and (storage.foldername(name))[1] in (
    select b.id::text from public.barbershops b where b.owner_id = (select auth.uid())));
create policy shop_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shop-assets' and (storage.foldername(name))[1] in (
    select b.id::text from public.barbershops b where b.owner_id = (select auth.uid())));
