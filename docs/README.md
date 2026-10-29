# ProBarber: documentação geral

Plataforma de agendamento e gestão para barbearias. O barbeiro usa o **app** (Android e iOS); o cliente agenda por um
**link público** no navegador, sem criar conta. Esta pasta documenta o que existe hoje, como as peças se conectam e o que ainda falta.

| Documento | O que tem |
| --- | --- |
| [fluxos.md](fluxos.md) | Todos os fluxos prontos (barbeiro e cliente) e os que ainda vão ser desenvolvidos |
| [banco-de-dados.md](banco-de-dados.md) | Tabelas, funções, regras de acesso, armazenamento e migrações |
| [integracoes.md](integracoes.md) | Supabase, AbacatePay (Pix), Resend (e-mail), Vercel, Expo/EAS, domínio e variáveis de ambiente |
| [pendencias.md](pendencias.md) | Lista de ação: decisões de negócio, o que construir, segurança e testes no aparelho |

## Peças do sistema

```
 Barbeiro ──► App Expo (probarber-app) ──────────┐
                                                  ▼
 Cliente ───► Site Next.js (probarber-webapp) ─► Supabase (Auth, Postgres, Storage)
                  │   └─ rotas /api (servidor)        ▲
                  ├────► AbacatePay (Pix)             │ chave secreta, só no servidor
                  └────► Resend (e-mail) ─────────────┘
```

| Peça | Onde | Tecnologia | Publicação |
| --- | --- | --- | --- |
| App do barbeiro | repo `probarber-app` | Expo SDK 58, React Native 0.88, Expo Router, TypeScript | EAS (lojas ainda não publicadas); testes pelo Expo Go |
| Site (landing + agendamento do cliente) | repo `probarber-webapp` | Next.js 16 (`cacheComponents`), React, TypeScript | Vercel, deploy automático da branch `main` |
| Banco, login e imagens | Supabase | Postgres, Auth (código por e-mail), Storage | Migrações rodadas à mão no SQL Editor |

- **Domínio**: `probarberapp.com.br`. Landing em `/`, agendamento do cliente em `/{slug}`, lista do cliente em
  `/{slug}/meus-agendamentos`, `/admin` reservado (ainda "em breve").
- **Identificadores do app**: `br.com.probarberapp` (iOS e Android), esquema `probarberapp`.
- **Fuso**: tudo em `America/Sao_Paulo`. Moeda em centavos no banco, reais na tela.
- **Idioma**: português do Brasil.

## Princípios que guiam o código

1. **Uma fonte de verdade para horários**: a função SQL `slot_candidates`. Nem o app nem o site recalculam disponibilidade.
2. **O servidor decide o preço e a duração**: o navegador manda só ids; valor do agendamento e do Pix vêm do banco.
3. **Sem login para o cliente**: o aparelho lembra os dados, e um código secreto por cliente abre "Meus agendamentos".
4. **Cadastro de barbeiro só pelo app**: o site não tem cadastro.
5. **Dados pessoais protegidos por RLS**: o público nunca lê clientes nem agendamentos diretamente.
6. **Migrações em ordem, uma vez cada**, e o código só sobe depois de o banco estar na versão que ele exige.

## Como trabalhar

- App: `npx tsc --noEmit`, `npm run lint`, `npx expo export` (em mudanças grandes). Ver `CLAUDE.md` na raiz do repo.
- Site: `npx tsc --noEmit`, `npm run lint`, `npm run build`. Ver `CLAUDE.md` na raiz do repo.
- Banco: criar `supabase/migrations/00N_nome.sql`, testar num Postgres local (PGlite), pedir para rodar no SQL Editor e só então enviar o código.
- Nada de chaves em arquivos versionados: valores reais ficam em `.env.local` e na Vercel.
