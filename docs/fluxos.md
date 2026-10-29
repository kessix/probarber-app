# Fluxos

Legenda: ✅ pronto e testado · 🧪 pronto, falta validar no aparelho/navegador · 🕓 a desenvolver

## 1. Barbeiro (app)

### 1.1 Cadastro e login ✅
1. `entrar`: o barbeiro informa o e-mail e recebe um **código de 8 dígitos** (Supabase Auth, enviado via SMTP do Resend).
2. Digita o código; a sessão fica salva no aparelho (AsyncStorage).
3. **Passo 1 de 5, `onboarding`** (só na primeira vez): nome da barbearia e **endereço do link** (slug). O app confere se o slug está livre
   (3 a 30 caracteres, minúsculas, números e hífen; reservados: admin, api, login, cadastro, app).
4. O banco cria a barbearia e, por gatilho, o **profissional dono** com horário padrão seg–sáb 09:00–18:00, almoço 12:00–13:00.
5. **Passo 2 de 5, `configuracao-inicial`, Seu horário**: ajustar dias, início, almoço e fim, intervalo entre horários e quantos dias a agenda fica aberta.
6. **Passo 3 de 5, Seus serviços**: usar as sugestões (Corte, Barba, Corte + barba) ou adicionar o próprio serviço; dá para pular e fazer depois.
7. **Passo 4 de 5, Sua marca** (opcional, dá para pular): logo, telefone/WhatsApp e endereço, que aparecem no topo do link do cliente.
8. **Passo 5 de 5, Tudo pronto**: mostra o link e o botão de compartilhar. Ao concluir o passo 3, o banco marca `barbershops.onboarded_at` e o app não repete o passo a passo.
9. O acesso às telas é decidido pelo estado da conta (sem sessão, sem barbearia, pronta) com `Stack.Protected`; conta pronta com `onboarded_at` vazio é redirecionada ao passo a passo.

Requisito: os templates "Confirm sign up" e "Magic link or OTP" do Supabase usam `{{ .Token }}`.

### 1.2 Agenda (Home) ✅ 🧪
- Cabeçalho com a data em destaque e "Hoje / Amanhã / Dia selecionado".
- Três abas, sempre visíveis: **Dia** (seletor dos próximos 14 dias, totais do dia), **Pendências (n)** (pagamentos a receber na
  barbearia, com filtros **Hoje**, **Próximos dias** e **Anteriores**, cada um com contagem; abre em Hoje) e **Cancelados (n)**. Cancelados ficam fora da lista do dia.
- Totais do dia: atendimentos, recebido e a receber. Em **todos** os modos, inclusive o comum, o agendamento nasce como pendência até o barbeiro dar baixa em Pix, dinheiro ou cartão.
- No cartão do agendamento: **concluir**, **cancelar**, **dar baixa no pagamento** (Pix, dinheiro ou cartão) e **bloquear cliente**.
- Puxar para atualizar. Os dados vêm do Supabase (RLS: só a própria barbearia).

### 1.2.1 Pendências de pagamento ✅ 🧪
Controle de quem ainda não pagou, igual em **todos** os modos de agendamento.

1. **Nasce pendente**: todo agendamento novo começa com pagamento `pendente`. A exceção é o Pix pago no site, que vira `pago` na hora. No modo comum nada é cobrado pelo app, mas o agendamento também entra em Pendências, para o barbeiro ter o controle (migração 007).
2. **Onde aparece**: na aba **Pendências (n)** da Home, que mostra o total de pendências e tem três filtros:
   - **Hoje (n)**: atendimentos de hoje (abre por padrão).
   - **Próximos dias (n)**: de amanhã em diante, por data.
   - **Anteriores (n)**: dias passados ainda sem baixa, do mais recente ao mais antigo.
3. **Dar baixa**: ao tocar no atendimento, "Receber como" oferece **Pix**, **Dinheiro** ou **Cartão**. O agendamento passa a `pago` (pago na barbearia) e sai da lista.
4. **Fora da lista**: agendamentos cancelados não contam como pendência e ficam na aba Cancelados.
5. **Pix aguardando**: quem escolheu pagar por Pix e ainda não pagou aparece como "Aguardando Pix"; ao pagar, a baixa é automática.
6. **Totais do dia** (aba Dia): **Recebido** soma os pagos e **A receber** soma os pendentes do dia selecionado.

Limite atual: cancelar um agendamento já pago por Pix não estorna o valor (ver [pendencias.md](pendencias.md)).

### 1.3 Configuração da agenda ✅ 🧪
Acessada pelo ícone na Home e pelo card em destaque em Recursos.
- **Horário de atendimento** por dia da semana: início, almoço (opcional) e fim, de 30 em 30 min; "copiar para os outros dias abertos".
- **Intervalo entre horários**: 10, 15, 20, 30, 45 ou 60 min.
- **Fechar dias ou horários**: dia inteiro ou só uma faixa (ex.: 14:00–16:00) nos próximos 14 dias; "Reabrir" remove.
  Agendamentos já marcados não são cancelados.
- **Agenda aberta para os clientes**: de 1 a 14 dias à frente.
- **Serviços que você atende**: marca os serviços do profissional; se não houver serviços, convida a cadastrar.
- **Como o cliente paga**: comum, pagamento obrigatório, ou pagar no app ou na barbearia (somente Pix).

### 1.4 Serviços ✅ 🧪
Lista e formulário: foto (até 2 MB), nome, preço, duração (5–480 min, de 5 em 5), **preço por dia da semana**, ativo/desativado, excluir.

### 1.5 Meu link ✅
Mostra o endereço público `probarberapp.com.br/{slug}`, com **Compartilhar link** e **Alterar link** (verifica se o novo endereço está livre e avisa que o link antigo deixa de funcionar).

### 1.6 Configurações ✅ 🧪
- **Dados da barbearia**: nome, link (com verificação de disponibilidade e aviso de que o link antigo para de funcionar), telefone, endereço, Instagram, Facebook, link de avaliação do Google, **logo** (envio imediato).
- **Clientes bloqueados**: lista, desbloquear, bloquear por e-mail.
- **Conta**: informações e sair.

### 1.7 Menu Recursos
Ordem: Configuração da agenda (destaque) → Serviços ✅ → Meu link ✅ → Equipe 🕓 → Estoque 🕓 → Financeiro 🕓 → Lembretes 🕓 → Suporte 🕓 → Configurações ✅ → Sair da conta.
Os itens 🕓 abrem uma tela "em breve".

## 2. Cliente (site, sem login)

### 2.1 Agendar em `/{slug}` ✅ 🧪
1. Cabeçalho: logo, nome, endereço, ligar, Instagram, Facebook, avaliações e botão **Meus agendamentos**.
2. **Dados**: nome, e-mail e opção (desmarcada) de receber confirmação e lembrete por e-mail. Se o aparelho já agendou antes, vem preenchido.
3. **Serviço**: catálogo com foto, duração e preço.
4. **Dia e horário**: só aparecem dias com vaga dentro do prazo definido pelo barbeiro; o preço mostrado é o do dia escolhido.
5. **Confirmação** conforme o modo da barbearia:
   - *comum*: confirma direto, sem pagamento no app; o agendamento entra em **Pendências** para o barbeiro receber na barbearia.
   - *pagamento obrigatório*: gera o Pix e só confirma quando pago.
   - *pagar no app ou na barbearia*: o cliente escolhe Pix agora ou pagar no local (neste caso fica em **Pendências** para o barbeiro).
6. **Pix**: QR Code e copia-e-cola; a tela consulta o pagamento a cada 3 s e confirma sozinha. Em modo de teste há o botão "Simular pagamento".
7. Tela final com resumo. Se aceitou notificações, recebe o **e-mail de confirmação** (uma vez).

Erros tratados: horário acabou de ser ocupado, e-mail inválido, cliente bloqueado, Pix expirado (gera novo).

### 2.2 Meus agendamentos em `/{slug}/meus-agendamentos` ✅ 🧪
- Abre com o código guardado no aparelho ou com o link do e-mail (`?t=`), que é salvo e removido da barra de endereço.
- Lista os 50 mais recentes com serviço, data, valor e situação do pagamento.
- **Cancelar** até 2 horas antes; o horário volta a ficar livre e o agendamento aparece em Cancelados no app.
- Pix já pago: o agendamento é cancelado, mas **não há estorno automático**; o site orienta a falar com a barbearia (ver pendências).

### 2.3 E-mail de confirmação ✅ (depende do domínio verificado no Resend)
Enviado por `POST /api/appointments/{id}/notify` após confirmar/pagar, só se o cliente aceitou notificações, uma única vez, com serviço, data, valor, endereço, situação do pagamento e link para "Meus agendamentos".

## 3. Landing `/` ✅
Apresentação do produto com foco no diferencial: agenda com pagamento flexível (Pix na hora ou na barbearia, com baixa em Pix, dinheiro ou cartão).
Seções: principais recursos (4 cards com telas do app), funcionalidades (7 disponíveis e 5 "em breve"), como funciona (3 passos e números reais do produto),
preço (30 dias de teste grátis, R$ 40,00 por mês por profissional), perguntas frequentes e botões de download. Sem depoimentos nem métricas inventadas: só entram quando forem reais.
Os botões das lojas apontam para `#baixar` até a publicação. `/admin` está reservado.

## 4. A desenvolver 🕓
Detalhes e responsáveis em [pendencias.md](pendencias.md).

| Item | Resumo |
| --- | --- |
| Regra de estorno de Pix cancelado | Definir prazo, valor devolvido, aprovação e a devolução pelo AbacatePay |
| Para onde vai o dinheiro do Pix | Hoje cai na conta da ProBarber; decidir repasse ao barbeiro |
| Lembrete por e-mail | Tarefa agendada (ex.: Vercel Cron) usando `reminder_sent_at` |
| Expirar Pix abandonado | Liberar o horário reservado e não pago |
| Webhook do Pix | Trocar a consulta a cada 3 s por notificação do AbacatePay |
| Débito e crédito separados na baixa com cartão | Hoje é só "Cartão" |
| Aviso ao barbeiro quando o cliente cancela | E-mail ou notificação push |
| Equipe e "Barbeiro Chefe" | Vários profissionais por barbearia (o banco já suporta) |
| Estoque, Financeiro, Lembretes, Suporte | Telas hoje "em breve" |
| Painel web `/admin` | Rota reservada |
| Publicação nas lojas | Google Play e App Store; trocar `STORE_LINKS` no site |
| Limpeza do banco | Remover `opening_hour`, `closing_hour`, `closed_weekdays` de `barbershops` |
