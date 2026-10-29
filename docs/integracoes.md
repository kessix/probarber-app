# Integrações e configuração

## Supabase
- **Uso**: Postgres (dados), Auth (login por código), Storage (logo e fotos).
- **Chaves**: *publishable* (`sb_publishable_...`) no app e no site, protegida por RLS. *Secret* (`sb_secret_...`) só no servidor do site (`NEXT_SUPABASE_SECRET_KEY`).
- **Auth**: provedor e-mail com OTP; SMTP do Resend; templates "Confirm sign up" e "Magic link or OTP" com `{{ .Token }}`.
- **Migrações**: rodadas à mão em `supabase/migrations` (ver [banco-de-dados.md](banco-de-dados.md)).

## AbacatePay (Pix)
- **API v2, checkout transparente**, em `src/lib/abacatepay.ts` (site). Chave de teste `abc_dev_...`; produção `abc_prod_...`.
- **Rotas do site**:
  - `POST /api/pix`: recebe só o `appointmentId`, lê o valor no banco e cria a cobrança (`/transparents/create`); guarda `pix_charge_id`. Devolve QR Code, copia-e-cola e expiração. Textos passam por `plainText()` (a API recusa símbolos como "·").
  - `GET /api/pix/{id}`: consulta o pagamento (`/transparents/check`); se `PAID`, marca o agendamento como `pago` (Pix, online) e confirma o horário.
  - `POST /api/pix/{id}/simulate`: simula o pagamento (`/transparents/simulate-payment`), só em modo de teste.
- **Confirmação hoje**: o navegador consulta a cada 3 s com a tela aberta. Não há webhook (pendência).
- **Atenção de negócio**: a conta é de pessoa jurídica e o dinheiro cai na conta da ProBarber. Falta definir repasse e estorno.

## Resend (e-mail)
- **Login (Supabase Auth)**: usado como SMTP personalizado, para enviar o código de 8 dígitos.
- **Confirmação de agendamento**: API do Resend (`src/lib/email.ts`), remetente `EMAIL_FROM` (padrão `ProBarber <no-reply@probarberapp.com.br>`), que precisa estar em **domínio verificado** no Resend. Sem isso o envio falha, mas o agendamento segue normal.
- **Segurança**: textos de usuário passam por `escapeHtml`; envio uma única vez por agendamento (`confirmation_sent_at`); só para quem aceitou notificações.

## Vercel (site)
- Deploy automático a cada push na `main` do repo do site.
- Variáveis de ambiente do projeto:

| Variável | Onde | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | site | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | site | chave pública |
| `NEXT_SUPABASE_SECRET_KEY` | **só servidor** | ignora o RLS; nunca no navegador |
| `ABACATEPAY_API_KEY` | **só servidor** | `abc_dev_` (teste) ou `abc_prod_` |
| `RESEND_API_KEY` | **só servidor** | e-mails do site |
| `EMAIL_FROM` | servidor, opcional | remetente em domínio verificado |
| `NEXT_PUBLIC_SITE_URL` | opcional | base do link no e-mail; padrão `https://probarberapp.com.br` |

No app: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` (modelo em `.env.example`).
Valores reais só em `.env.local` (fora do git) e na Vercel.

## Expo e EAS (app)
- **Expo Go** para testar no aparelho durante o desenvolvimento. Bibliotecas com código nativo novo podem exigir *development build*.
- **EAS**: build e envio às lojas (`eas build`, `eas submit`) e atualizações pelo ar (`eas update`). Projeto já criado (`eas init`).
- **Identificadores**: iOS `br.com.probarberapp`, Android `br.com.probarberapp`, esquema `probarberapp`.
- **Permissões**: só galeria de fotos (logo e serviços), com texto em português; câmera e microfone desligados.
- **Lojas**: ainda não publicado. Ao publicar, trocar `STORE_LINKS` no site (`src/lib/stores.ts`).

## GitHub
Dois repositórios: `kessix/probarber-app` (app + migrações + docs) e o do site (`probarber-webapp`). Commits só quando o responsável pedir.

## Domínio
`probarberapp.com.br` aponta para a Vercel (site). Remetente de e-mail no mesmo domínio, verificado no Resend.

## Pacotes principais
- App: `expo-router`, `@supabase/supabase-js`, `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `@react-native-async-storage/async-storage`.
- Site: `next`, `react`, `@supabase/supabase-js`, `lucide-react`.
