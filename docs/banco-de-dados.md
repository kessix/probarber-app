# Banco de dados (Supabase / Postgres)

Schema em `supabase/migrations/`. Rodar **uma vez cada, em ordem**, no SQL Editor. Todas (menos a 001) podem rodar de novo sem erro nem perda de dados.
A 001 **nunca** deve ser rodada de novo depois das seguintes.

| Migração | O que faz |
| --- | --- |
| `001_base.sql` | `barbershops`, `services`, `appointments`, RLS inicial, funções antigas (`create_appointment` e `taken_slots`, depois substituídas) |
| `002_agenda_profissional.sql` | Profissionais, horários, folgas, preços por dia, clientes, perfil da barbearia, exclusão de sobreposição, funções de horário e agendamento, bucket `shop-assets` |
| `003_bloqueio_por_horario.sql` | `time_off` com faixa de horas; `slot_candidates` respeita bloqueios parciais |
| `004_meus_agendamentos.sql` | Código secreto por cliente e funções "Meus agendamentos" e cancelar |
| `005_onboarding.sql` | `barbershops.onboarded_at`: marca que o barbeiro terminou a configuração inicial (lojas existentes já contam como concluídas) |
| `006_pagamento_cartao.sql` | Libera `cartao` como forma de pagamento na baixa feita na barbearia |
| `007_pendencia_no_comum.sql` | No agendamento comum o pagamento também nasce `pendente` (antes `nao_aplicavel`), para o barbeiro controlar em Pendências |

## Tabelas

### `barbershops`
Uma por barbeiro (`owner_id` único, ligado a `auth.users`).
`slug` (único, 3–30, regex `^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$`, reservados bloqueados), `name`, `instagram`, `facebook`, `phone` (10–11 dígitos),
`address`, `logo_url`, `google_review_url`, `brand_color`, `booking_mode` (`comum` | `pagamento_obrigatorio` | `pagamento_opcional`),
`booking_window_days` (1–14, padrão 10), `onboarded_at` (nulo = ainda falta a configuração inicial no app). Colunas **obsoletas**: `opening_hour`, `closing_hour`, `closed_weekdays`.

### `professionals`
Quem atende. Hoje só o dono (`is_owner`, único por barbearia). `slot_interval_minutes` (10, 15, 20, 30, 45, 60), `active`, `photo_url`, `user_id` opcional (para a equipe futura).

### `working_hours`
Chave `(professional_id, weekday)`, `weekday` 0 = domingo. Minutos desde 00:00: `start_min`, `lunch_start_min`, `lunch_end_min`, `end_min`. **Sem linha = dia fechado.** O almoço é opcional e fica dentro do expediente.

### `time_off`
Fechamentos: `starts_on`, `ends_on`, `reason`. Com `start_min` e `end_min` vale só para um dia e uma faixa (ex.: 14:00–16:00); sem eles, é o dia inteiro.

### `services`
`name`, `price_cents`, `duration_minutes` (5–480), `active`, `photo_url`, `sort_order`.

### `service_day_prices`
Chave `(service_id, weekday)`, `price_cents`. Sem linha = vale o preço padrão do serviço.

### `service_professionals`
Quais serviços cada profissional atende. Serviço novo é ligado a todos os profissionais ativos por gatilho.

### `clients`
Por barbearia, único por `(barbershop_id, email)` (e-mail em minúsculas). `name`, `phone` (opcional), `notifications` (aceitou e-mails),
`blocked`, `blocked_reason`, **`access_token`** (uuid secreto que abre "Meus agendamentos"; nunca exposto ao público).

### `appointments`
`barbershop_id`, `professional_id`, `client_id` (nulo em registros antigos), `service_id`, cópia de `service_name`, `price_cents`, `duration_minutes`
(mudar o serviço depois não altera o histórico), `starts_at`, `ends_at`, `client_name`, `client_email`, `client_phone` (opcional),
`status` (`agendado` | `concluido` | `cancelado`), `payment_status` (`nao_aplicavel` | `pendente` | `pago`), `payment_method` (`pix` | `dinheiro` | `cartao`),
`payment_online`, `pix_charge_id` (único), `confirmation_sent_at`, `reminder_sent_at`, `created_at`.
**Restrição `appointments_no_overlap`**: nunca dois agendamentos não cancelados se sobrepondo para o mesmo profissional (considera a duração).

## Funções

Chamáveis pelo público (`anon`) e por logados:

| Função | Uso |
| --- | --- |
| `available_days(slug, service_id)` | Dias dos próximos 14 com pelo menos um horário livre (já dentro do prazo da agenda) |
| `available_slots(slug, service_id, day)` | Horários livres de um dia |
| `create_appointment(slug, service_id, starts_at, nome, email, telefone?, notificações?, pagar_online?)` | Cria o agendamento. Valida e-mail, cliente bloqueado e se o horário está entre os livres; preço do dia da semana; cria/atualiza o cliente; devolve o id. Erros: `barbearia_nao_encontrada`, `servico_invalido`, `email_invalido`, `cliente_bloqueado`, `horario_indisponivel` |
| `client_access_token(appointment_id)` | Devolve o código do cliente, só para agendamento criado nos últimos 15 minutos |
| `my_appointments(slug, token)` | Os 50 agendamentos mais recentes do cliente, com `can_cancel` |
| `cancel_my_appointment(slug, token, appointment_id)` | Cancela com 2 h de antecedência. Erros: `agendamento_nao_encontrado`, `agendamento_nao_cancelavel`, `prazo_cancelamento` |

Internas ou de apoio:
- `slot_candidates(slug, service_id, day)` (sem acesso público): **única fonte das regras de horário**. Considera dia da semana aberto, início/almoço/fim, intervalo, fechamentos (dia e faixa), prazo da agenda, antecedência mínima de 30 min, serviço que o profissional atende, e conflito com outros agendamentos.
- `owns_shop`, `owns_professional`, `owns_service`: usadas nas regras de acesso (definer, evitam recursão).
- Gatilhos `on_barbershop_created` (cria o profissional dono com horário padrão) e `on_service_created` (liga o serviço aos profissionais).

## Regras de acesso (RLS)

| Tabela | Público (anônimo) | Barbeiro logado |
| --- | --- | --- |
| `barbershops` | lê | cria, altera e apaga a própria |
| `services` | lê os ativos | gerencia os da própria barbearia |
| `professionals` | lê os ativos | gerencia os da própria barbearia |
| `service_day_prices` | lê | gerencia os próprios serviços |
| `working_hours`, `time_off`, `service_professionals` | nada | gerencia os do próprio profissional/serviço |
| `clients` | **nada** | lê e altera os da própria barbearia |
| `appointments` | **nada** | lê e altera os da própria barbearia |

Todo acesso do cliente a dados pessoais passa pelas funções acima. O servidor do site usa a **chave secreta**, que ignora o RLS, apenas para criar o Pix, confirmar pagamento e enviar e-mail.

## Armazenamento
Bucket público `shop-assets` (leitura aberta, 2 MB, JPEG/PNG/WebP). Só o dono grava, e só na pasta cujo primeiro nível é o id da própria barbearia:
`shop-assets/<id-da-barbearia>/<nome>-<timestamp>.jpg` (o app redimensiona e comprime antes de enviar).

## Autenticação
Supabase Auth com e-mail e **código (OTP) de 8 dígitos**. Sem senha. SMTP personalizado pelo Resend. Apenas barbeiros têm usuário; clientes não.

## Como testar uma migração
Usamos PGlite (Postgres 18 em WASM) com um "Supabase de mentira" (papéis `anon`/`authenticated`, `auth.uid()`, schema `storage`), com dados do banco antigo para testar a migração de dados. Depois de rodar no real, um teste de ponta a ponta cria e apaga um agendamento de teste.
