@AGENTS.md

# ProBarber (app dos barbeiros)

Agendamento e gestão de barbearias. Este repo é o app Expo (Android e iOS). O site público de agendamento do cliente
(`probarberapp.com.br/{slug}`) e a landing ficam no repo irmão `probarber-webapp`. O banco é o Supabase, e o schema
mora aqui, em `supabase/migrations/`. Pendências e decisões em aberto: `docs/pendencias.md`.

## Verificar antes de dar por pronto
`npx tsc --noEmit`, `npm run lint` e, em mudança grande, `npx expo export` (Android e iOS).

## Banco (Supabase)
- As migrações rodam **à mão, em ordem**, no SQL Editor. A `001` nunca roda de novo.
- Mudou o banco: criar a próxima migração (`00N_nome.sql`), idempotente e sem apagar dados. Testar antes num Postgres
  local (PGlite) e **só subir o código depois que o usuário rodar a migração**. Uma função que muda de assinatura
  quebra o site que está no ar.
- Regras de horário vivem **só** em `slot_candidates` (SQL). App e site nunca recalculam disponibilidade.
- Preço e duração do agendamento vêm do banco (`create_appointment`), nunca do cliente.
- Fuso fixo `America/Sao_Paulo`. Horários de expediente em minutos desde 00:00.
- Chave publicável no app; a chave secreta (`NEXT_SUPABASE_SECRET_KEY`) existe só no servidor do site.

## Decisões de produto
- O barbeiro só se cadastra pelo app (login por código de 8 dígitos no e-mail). O site não tem cadastro.
- Pagamento só por Pix (AbacatePay, modo de teste por enquanto). Três modos: comum, pagamento obrigatório,
  pagar no app ou na barbearia.
- Um profissional por barbearia hoje (o dono). O modelo já é por profissional, para a equipe entrar depois.
- Cancelados têm aba própria na Home e ficam fora da lista do dia.
- Imagens (logo, serviços): até 2 MB, bucket `shop-assets`, pasta com o id da barbearia.
- Idioma da interface e das conversas: português do Brasil.

## Armadilhas já encontradas
- Supabase: os templates "Confirm sign up" e "Magic link or OTP" precisam usar `{{ .Token }}`, senão chega link em vez de código.
- Título que "não diminui": `adjustsFontSizeToFit` só age quando estoura; use tamanho explícito.
- Lint `react-hooks/set-state-in-effect`: busque dados fora do componente e faça `setState` no `.then`.

## Trabalho
Só fazer commit e push quando o usuário pedir. Commits um de cada vez, nunca em paralelo. Nunca colocar chaves em arquivo versionado.
