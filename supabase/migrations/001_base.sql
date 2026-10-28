-- ATENÇÃO: migrações são numeradas e rodam em ORDEM, uma vez cada (001, depois 002...).
-- Não rode esta de novo depois de aplicar as seguintes: ela recria funções antigas.
-- Esta é a base do banco (v1). A agenda por profissional está em 002.

-- ProBarber: esquema inicial do banco (Supabase / Postgres).
-- Rodar no SQL Editor do projeto. Pode ser rodado de novo sem erro, mas NÃO apaga dados.
--
-- Quem acessa o quê:
--   * Barbeiro (logado)  -> lê e altera só a própria barbearia, serviços e agenda
--   * Cliente (anônimo)  -> lê dados públicos da barbearia e agenda pelas funções
--                           public.create_appointment e public.taken_slots
--   * Nunca há leitura pública da tabela appointments (tem nome e telefone de clientes)

-- ---------------------------------------------------------------- tabelas ---

create table if not exists public.barbershops (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null unique references auth.users (id) on delete cascade,
  slug            text not null unique
                    check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
                           and slug not in ('admin', 'api', 'login', 'cadastro', 'app')),
  name            text not null check (char_length(name) between 2 and 80),
  instagram       text,
  brand_color     text not null default '#d4a24c' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  -- comum | pagamento_obrigatorio | pagamento_opcional
  booking_mode    text not null default 'comum'
                    check (booking_mode in ('comum', 'pagamento_obrigatorio', 'pagamento_opcional')),
  opening_hour    int  not null default 9  check (opening_hour between 0 and 23),
  closing_hour    int  not null default 19 check (closing_hour between 1 and 24),
  closed_weekdays int[] not null default '{0}',   -- 0 = domingo
  -- quantos dias à frente o cliente pode agendar, contando hoje (máximo 14)
  booking_window_days int not null default 10 check (booking_window_days between 1 and 14),
  created_at      timestamptz not null default now(),
  check (closing_hour > opening_hour)
);

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 60),
  price_cents      int  not null check (price_cents >= 0),
  duration_minutes int  not null check (duration_minutes between 5 and 480),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists services_barbershop_idx on public.services (barbershop_id);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  service_id       uuid references public.services (id) on delete set null,
  -- cópia do serviço no momento da marcação: mudar o preço depois não altera o histórico
  service_name     text not null,
  price_cents      int  not null check (price_cents >= 0),
  duration_minutes int  not null,
  starts_at        timestamptz not null,
  client_name      text not null check (char_length(client_name) between 2 and 80),
  client_phone     text not null check (client_phone ~ '^[0-9]{10,11}$'),
  status           text not null default 'agendado'
                     check (status in ('agendado', 'concluido', 'cancelado')),
  payment_status   text not null default 'nao_aplicavel'
                     check (payment_status in ('nao_aplicavel', 'pendente', 'pago')),
  payment_method   text check (payment_method in ('pix', 'dinheiro')),
  payment_online   boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists appointments_shop_time_idx on public.appointments (barbershop_id, starts_at);
-- Não deixa duas marcações ativas no mesmo horário da mesma barbearia.
-- (Não trata sobreposição por duração: um serviço longo ainda pode cruzar o próximo horário.)
create unique index if not exists appointments_no_double_booking
  on public.appointments (barbershop_id, starts_at) where status <> 'cancelado';

-- --------------------------------------------------------------------- RLS ---

alter table public.barbershops  enable row level security;
alter table public.services     enable row level security;
alter table public.appointments enable row level security;

-- barbearias: qualquer um lê (é a vitrine pública); só o dono cria e altera
drop policy if exists barbershops_read   on public.barbershops;
drop policy if exists barbershops_insert on public.barbershops;
drop policy if exists barbershops_update on public.barbershops;
drop policy if exists barbershops_delete on public.barbershops;
create policy barbershops_read   on public.barbershops for select using (true);
create policy barbershops_insert on public.barbershops for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy barbershops_update on public.barbershops for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy barbershops_delete on public.barbershops for delete to authenticated
  using (owner_id = (select auth.uid()));

-- serviços: o público vê os ativos; só o dono da barbearia gerencia
drop policy if exists services_read   on public.services;
drop policy if exists services_write  on public.services;
create policy services_read on public.services for select
  using (active or exists (select 1 from public.barbershops b
                           where b.id = barbershop_id and b.owner_id = (select auth.uid())));
create policy services_write on public.services for all to authenticated
  using (exists (select 1 from public.barbershops b
                 where b.id = barbershop_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.barbershops b
                      where b.id = barbershop_id and b.owner_id = (select auth.uid())));

-- agenda: só o dono lê e altera. Cliente NÃO insere direto (usa create_appointment).
drop policy if exists appointments_owner on public.appointments;
create policy appointments_owner on public.appointments for all to authenticated
  using (exists (select 1 from public.barbershops b
                 where b.id = barbershop_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.barbershops b
                      where b.id = barbershop_id and b.owner_id = (select auth.uid())));

-- ----------------------------------------------------- funções para o cliente ---

-- Horários já ocupados de um dia, sem expor nome nem telefone de ninguém.
create or replace function public.taken_slots(p_slug text, p_day date)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  where b.slug = p_slug
    and a.status <> 'cancelado'
    and (a.starts_at at time zone 'America/Sao_Paulo')::date = p_day;
$$;

-- Cria a marcação do cliente. Preço e duração vêm do serviço no banco, nunca do cliente.
-- Pagamento: 'comum' -> nao_aplicavel; nos outros modos fica 'pendente' até a confirmação.
-- A confirmação do Pix de verdade virá do provedor de pagamento (ainda não integrado):
-- por isso o cliente não pode se declarar "pago".
create or replace function public.create_appointment(
  p_slug text, p_service_id uuid, p_starts_at timestamptz,
  p_client_name text, p_client_phone text, p_pay_online boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_shop    public.barbershops%rowtype;
  v_service public.services%rowtype;
  v_id      uuid;
  v_local   timestamp;   -- o horário no fuso de Brasília
  v_minutes int;
begin
  select * into v_shop from public.barbershops where slug = p_slug;
  if not found then raise exception 'barbearia_nao_encontrada'; end if;

  select * into v_service from public.services
   where id = p_service_id and barbershop_id = v_shop.id and active;
  if not found then raise exception 'servico_invalido'; end if;

  if p_starts_at <= now() then raise exception 'horario_no_passado'; end if;

  -- Regras de funcionamento da barbearia, no fuso de Brasília. Valem para qualquer chamada,
  -- não só para o site: quem chamar a função direto também não agenda fora do expediente.
  v_local   := p_starts_at at time zone 'America/Sao_Paulo';
  v_minutes := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  if extract(dow from v_local)::int = any (v_shop.closed_weekdays) then
    raise exception 'dia_fechado';
  end if;
  if v_minutes < v_shop.opening_hour * 60
     or v_minutes + v_service.duration_minutes > v_shop.closing_hour * 60 then
    raise exception 'fora_do_horario';
  end if;
  if v_local::date > (now() at time zone 'America/Sao_Paulo')::date + (v_shop.booking_window_days - 1) then
    raise exception 'fora_da_janela';
  end if;

  insert into public.appointments
    (barbershop_id, service_id, service_name, price_cents, duration_minutes,
     starts_at, client_name, client_phone, payment_status, payment_online)
  values
    (v_shop.id, v_service.id, v_service.name, v_service.price_cents, v_service.duration_minutes,
     p_starts_at, trim(p_client_name), regexp_replace(p_client_phone, '\D', '', 'g'),
     case when v_shop.booking_mode = 'comum' then 'nao_aplicavel' else 'pendente' end,
     v_shop.booking_mode <> 'comum' and p_pay_online)
  returning id into v_id;

  return v_id;
exception when unique_violation then
  raise exception 'horario_indisponivel';
end $$;

revoke all on function public.taken_slots(text, date) from public;
revoke all on function public.create_appointment(text, uuid, timestamptz, text, text, boolean) from public;
grant execute on function public.taken_slots(text, date) to anon, authenticated;
grant execute on function public.create_appointment(text, uuid, timestamptz, text, text, boolean) to anon, authenticated;

-- ------------------------------------------------------------ Pix (migração) ---
-- Liga a cobrança Pix (AbacatePay) ao agendamento, para confirmar o pagamento sozinho.
-- Quem grava aqui é o servidor do site, com a chave secreta. O público não lê esta tabela.
alter table public.appointments add column if not exists pix_charge_id text unique;

-- ------------------------------------- Configuração da agenda (migração) ---
-- Quantos dias à frente o cliente pode agendar. Em bancos que já existem, a coluna é criada aqui.
alter table public.barbershops
  add column if not exists booking_window_days int not null default 10
  check (booking_window_days between 1 and 14);
-- A função create_appointment acima (create or replace) passa a validar dia, horário e prazo.
