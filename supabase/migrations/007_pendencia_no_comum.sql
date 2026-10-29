-- 007: no agendamento comum o pagamento também fica "pendente" até o barbeiro dar baixa.
-- Rode DEPOIS da 006, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.
--
-- Antes, no modo comum o pagamento ficava "nao_aplicavel" e o agendamento nunca aparecia em Pendências.
-- Agora todo agendamento nasce "pendente" (payment_online só vale nos modos com Pix) e o barbeiro dá baixa
-- em Pix, dinheiro ou cartão depois do atendimento.
--
-- Agendamentos que já existem: os de hoje em diante (não cancelados) passam a pendentes; os passados ficam como estão.

update public.appointments
   set payment_status = 'pendente'
 where payment_status = 'nao_aplicavel'
   and status <> 'cancelado'
   and starts_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

-- Mesma função da 002, só muda o status de pagamento inicial.
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
     'pendente',
     v_shop.booking_mode <> 'comum' and coalesce(p_pay_online, false))
  returning id into v_id;

  return v_id;
exception when exclusion_violation then
  raise exception 'horario_indisponivel';
end $$;
