-- 004: "Meus agendamentos" para o cliente, sem login.
-- Rode DEPOIS da 003, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.
--
-- Cada cliente (por barbearia) ganha um código secreto aleatório (access_token). O site guarda o código no
-- aparelho do cliente e o envia por link no e-mail de confirmação. Quem tem o código vê e cancela os
-- agendamentos daquele cliente; quem só sabe o e-mail não vê nada. A tabela clients continua fechada
-- para o público (só o dono da barbearia lê), então o código não vaza por consulta direta.

alter table public.clients add column if not exists access_token uuid not null default gen_random_uuid();
create unique index if not exists clients_access_token_key on public.clients (access_token);

-- Entrega o código logo depois de agendar. Só vale para um agendamento criado nos últimos 15 minutos:
-- o id do agendamento (que só o próprio cliente conhece) abre o código, mas não para sempre.
create or replace function public.client_access_token(p_appointment_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.access_token
  from public.appointments a join public.clients c on c.id = a.client_id
  where a.id = p_appointment_id and a.created_at > now() - interval '15 minutes';
$$;

-- Agendamentos do cliente (os 50 mais recentes). can_cancel: ainda agendado e faltando mais de 2 horas.
create or replace function public.my_appointments(p_slug text, p_token uuid)
returns table (
  id uuid, starts_at timestamptz, service_name text, price_cents int,
  status text, payment_status text, can_cancel boolean, client_name text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.service_name, a.price_cents, a.status, a.payment_status,
         (a.status = 'agendado' and a.starts_at > now() + interval '2 hours') as can_cancel,
         c.name
  from public.clients c
  join public.barbershops b on b.id = c.barbershop_id and b.slug = p_slug
  join public.appointments a on a.client_id = c.id
  where c.access_token = p_token
  order by a.starts_at desc
  limit 50;
$$;

-- O cliente cancela o próprio agendamento, com pelo menos 2 horas de antecedência.
-- O horário volta a ficar livre (o conflito só considera agendamentos não cancelados).
-- Pagamento já feito por Pix NÃO é estornado aqui: continua 'pago' para a barbearia resolver.
create or replace function public.cancel_my_appointment(p_slug text, p_token uuid, p_appointment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v public.appointments%rowtype;
begin
  select a.* into v
  from public.appointments a
  join public.clients c on c.id = a.client_id
  join public.barbershops b on b.id = c.barbershop_id and b.slug = p_slug
  where a.id = p_appointment_id and c.access_token = p_token
  for update of a;
  if not found then raise exception 'agendamento_nao_encontrado'; end if;
  if v.status <> 'agendado' then raise exception 'agendamento_nao_cancelavel'; end if;
  if v.starts_at <= now() + interval '2 hours' then raise exception 'prazo_cancelamento'; end if;
  update public.appointments set status = 'cancelado' where id = v.id;
end $$;

revoke all on function public.client_access_token(uuid) from public;
revoke all on function public.my_appointments(text, uuid) from public;
revoke all on function public.cancel_my_appointment(text, uuid, uuid) from public;
grant execute on function public.client_access_token(uuid) to anon, authenticated;
grant execute on function public.my_appointments(text, uuid) to anon, authenticated;
grant execute on function public.cancel_my_appointment(text, uuid, uuid) to anon, authenticated;
