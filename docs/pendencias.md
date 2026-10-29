# Pendências do ProBarber

Visão geral em [README.md](README.md) e fluxos em [fluxos.md](fluxos.md).

Cobre o app e o site. Atualizar ao concluir ou decidir algo.

## Decisão de negócio
- **Para onde vai o dinheiro do Pix?** O AbacatePay só atende CNPJ e o repasse cai na conta da ProBarber, não na de cada
  barbeiro. Decidir o modelo (repasse manual, split, outro provedor) antes de ir para produção.

- **Estorno de agendamento cancelado e pago por Pix**: definir as regras (quem pode pedir, prazo, valor devolvido ou
  taxa de cancelamento, quem aprova, como devolver pelo AbacatePay). Hoje o cliente cancela sozinho pelo link
  "Meus agendamentos" até 2 horas antes, mas **nada é estornado**: o agendamento fica cancelado com o pagamento ainda
  "pago", e o site avisa o cliente para combinar o reembolso com a barbearia. O barbeiro precisa ver essa situação
  (cancelado + pago) para resolver na mão até a regra existir.

## Falta construir
- **Avisar o barbeiro quando o cliente cancela** (e-mail ou notificação push) e destacar no app os cancelados já pagos.
- **Publicar nas lojas** (Google Play e App Store) e trocar `STORE_LINKS` no site.
- **Lembrete por e-mail** antes do horário (colunas `reminder_sent_at` já existem). Precisa de tarefa agendada, por exemplo Vercel Cron.
- **Pix abandonado**: o horário fica reservado para sempre. Falta expirar a reserva não paga.
- **Webhook do Pix**: hoje o site confirma consultando o pagamento a cada 3 s enquanto a página está aberta.
- **Equipe e "Barbeiro Chefe"**: vários profissionais por barbearia (o banco já suporta).
- Telas ainda "em breve": Equipe, Estoque, Financeiro, Lembretes, Suporte.
- Remover as colunas antigas `opening_hour`, `closing_hour` e `closed_weekdays` de `barbershops` (não são mais usadas).

## Segurança e operação
- Trocar as chaves que foram coladas na conversa: Resend e AbacatePay (a de teste e, depois, a de produção).
- Verificar o domínio `probarberapp.com.br` no Resend (remetente `no-reply@`). Sem isso o e-mail de confirmação não sai.
- Conferir na Vercel: `NEXT_SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `ABACATEPAY_API_KEY`, `EMAIL_FROM` (opcional) e as variáveis públicas do Supabase.

## Para testar no aparelho (ainda não validado)
- Envio de fotos (logo e serviços) e telas novas de Serviços e Configurações.
- Fechar dias e horários e ver o efeito na agenda do cliente.
- E-mail de confirmação chegando com "quero receber" marcado.
