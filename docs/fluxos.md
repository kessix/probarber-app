# Fluxos

Legenda: ✅ pronto e testado · 🧪 pronto, falta validar no aparelho/navegador · 🕓 a desenvolver

## 1. Barbeiro (app)

### 1.1 Cadastro e login ✅
1. `entrar`: o barbeiro informa o e-mail e recebe um **código de 8 dígitos** (Supabase Auth, enviado via SMTP do Resend).
2. Digita o código; a sessão fica salva no aparelho (AsyncStorage).
3. **Passo 1 de 4, `onboarding`** (só na primeira vez): nome da barbearia e **endereço do link** (slug). O app confere se o slug está livre
   (3 a 30 caracteres, minúsculas, números e hífen; reservados: admin, api, login, cadastro, app).
4. O banco cria a barbearia e, por gatilho, o **profissional dono** com horário padrão seg–sáb 09:00–18:00, almoço 12:00–13:00.
5. **Passo 2 de 4, `configuracao-inicial`, Seu horário**: ajustar dias, início, almoço e fim, intervalo entre horários e quantos dias a agenda fica aberta.
6. **Passo 3 de 4, Seus serviços**: usar as sugestões (Corte, Barba, Corte + barba) ou adicionar o próprio serviço; dá para pular e fazer depois.
7. **Passo 4 de 4, Tudo pronto**: mostra o link e o botão de compartilhar. Ao concluir o passo 3, o banco marca `barbershops.onboarded_at` e o app não repete o passo a passo.
8. O acesso às telas é decidido pelo estado da conta (sem sessão, sem barbearia, pronta) com `Stack.Protected`; conta pronta com `onboarded_at` vazio é redirecionada ao passo a passo.

Requisito: os templates "Confirm sign up" e "Magic link or OTP" do Supabase usam `{{ .Token }}`.

### 1.2 Agenda (Home) ✅ 🧪
- Cabeçalho com a data em destaque e "Hoje / Amanhã / Dia selecionado".
- Três abas: **Dia** (seletor dos próximos 14 dias, totais do dia), **Pendências (n)** (pagamentos a receber na
  barbearia) e **Cancelados (n)**. Cancelados ficam fora da lista do dia.
- Totais: atendimentos; recebido e a receber (modos com pagamento) ou previsto (modo comum).
- No cartão do agendamento: **concluir**, **cancelar**, **dar baixa no pagamento** (Pix, dinheiro ou cartão) e **bloquear cliente**.
- Puxar para atualizar. Os dados vêm do Supabase (RLS: só a própria barbearia).

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
   - *comum*: confirma direto.
   - *pagamento obrigatório*: gera o Pix e só confirma quando pago.
   - *pagar no app ou na barbearia*: o cliente escolhe Pix agora ou pagar no local (fica pendência para o barbeiro).
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
Apresentação do produto, recursos, destaque para baixar o app nas lojas (botões apontam para `#baixar` até a publicação) e `/admin` reservado.

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
