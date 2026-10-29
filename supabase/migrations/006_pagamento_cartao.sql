-- 006: o barbeiro pode dar baixa no pagamento feito na barbearia também com cartão.
-- Rode DEPOIS da 005, no SQL Editor. Pode rodar de novo sem erro e sem apagar dados.

alter table public.appointments drop constraint if exists appointments_payment_method_check;
alter table public.appointments add constraint appointments_payment_method_check
  check (payment_method is null or payment_method in ('pix', 'dinheiro', 'cartao'));
