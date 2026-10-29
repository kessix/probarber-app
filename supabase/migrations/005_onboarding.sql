-- 005: marca quando o barbeiro terminou a configuração inicial no app (horário e serviços).
-- Rode DEPOIS da 004, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.
--
-- Barbearias que já existem contam como configuradas (não passam pelo passo a passo).
-- Barbearias novas nascem com onboarded_at vazio e o app abre a configuração inicial.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'barbershops' and column_name = 'onboarded_at'
  ) then
    alter table public.barbershops add column onboarded_at timestamptz;
    update public.barbershops set onboarded_at = created_at;
  end if;
end $$;
