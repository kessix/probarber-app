/**
 * Como o cliente agenda e paga:
 * - comum: sem pagamento no app, o barbeiro recebe na barbearia
 * - pagamento_obrigatorio: o horário só fecha com pagamento online
 * - pagamento_opcional: o cliente paga online ou escolhe pagar na barbearia
 *   (vira pendência na agenda até o barbeiro dar baixa depois do corte)
 */
export type BookingMode = 'comum' | 'pagamento_obrigatorio' | 'pagamento_opcional';

export type PaymentMethod = 'pix' | 'dinheiro';

export type Payment =
  | { status: 'nao_aplicavel' }
  /** online: o cliente escolheu pagar por Pix no site e o pagamento ainda não foi confirmado. */
  | { status: 'pendente'; online?: boolean }
  | { status: 'pago'; method: PaymentMethod; online: boolean };

export type AppointmentStatus = 'agendado' | 'concluido' | 'cancelado';

export type Appointment = {
  id: string;
  /** AAAA-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  clientName: string;
  service: string;
  price: number;
  status: AppointmentStatus;
  payment: Payment;
};

export type AgendaSettings = {
  bookingMode: BookingMode;
};

export const BOOKING_MODES: { id: BookingMode; title: string; description: string }[] = [
  {
    id: 'comum',
    title: 'Agendamento comum',
    description: 'O cliente escolhe o horário e confirma, sem pagar pelo app. Você recebe na barbearia.',
  },
  {
    id: 'pagamento_obrigatorio',
    title: 'Pagamento obrigatório',
    description: 'O horário só é confirmado depois que o cliente paga online, com Pix.',
  },
  {
    id: 'pagamento_opcional',
    title: 'Pagar no app ou na barbearia',
    description:
      'O cliente escolhe pagar agora ou no local. Quem paga no local fica como pendência na agenda, e você dá baixa depois do corte.',
  },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
};
