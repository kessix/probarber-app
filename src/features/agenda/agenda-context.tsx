import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { addDays, startOfToday, toDateKey } from '@/lib/format';

import type { AgendaSettings, Appointment, BookingMode, PaymentMethod } from './types';

type AgendaContextValue = {
  settings: AgendaSettings;
  appointments: Appointment[];
  setBookingMode: (mode: BookingMode) => void;
  completeAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;
  /** Dá baixa em uma pendência: o barbeiro recebeu na barbearia. */
  registerPayment: (id: string, method: PaymentMethod) => void;
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

/** Dados de exemplo até existir backend. Cobrem os três tipos de pagamento. */
function buildMockAppointments(): Appointment[] {
  const today = startOfToday();
  const day = (offset: number) => toDateKey(addDays(today, offset));
  return [
    { id: 'a1', date: day(0), time: '09:00', clientName: 'Davi', service: 'Corte + barba', price: 70, status: 'concluido', payment: { status: 'pago', method: 'pix', online: true } },
    { id: 'a2', date: day(0), time: '10:00', clientName: 'Lucas', service: 'Degradê', price: 45, status: 'agendado', payment: { status: 'pago', method: 'pix', online: true } },
    { id: 'a3', date: day(0), time: '10:30', clientName: 'Caio', service: 'Barba', price: 35, status: 'agendado', payment: { status: 'pendente' } },
    { id: 'a4', date: day(0), time: '14:00', clientName: 'Rafa', service: 'Corte', price: 45, status: 'agendado', payment: { status: 'pendente' } },
    { id: 'a5', date: day(0), time: '16:00', clientName: 'Bruno', service: 'Corte', price: 45, status: 'agendado', payment: { status: 'nao_aplicavel' } },
    { id: 'a6', date: day(1), time: '09:30', clientName: 'Matheus', service: 'Corte + barba', price: 70, status: 'agendado', payment: { status: 'pago', method: 'pix', online: true } },
    { id: 'a7', date: day(1), time: '11:00', clientName: 'Felipe', service: 'Degradê', price: 45, status: 'agendado', payment: { status: 'pendente' } },
    { id: 'a8', date: day(2), time: '15:00', clientName: 'Anderson', service: 'Barba', price: 35, status: 'agendado', payment: { status: 'nao_aplicavel' } },
  ];
}

export function AgendaProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AgendaSettings>({
    bookingMode: 'pagamento_opcional',
  });
  const [appointments, setAppointments] = useState<Appointment[]>(buildMockAppointments);

  const update = useCallback((id: string, patch: (a: Appointment) => Appointment) => {
    setAppointments((list) => list.map((a) => (a.id === id ? patch(a) : a)));
  }, []);

  const value = useMemo<AgendaContextValue>(
    () => ({
      settings,
      appointments,
      setBookingMode: (bookingMode) => setSettings((s) => ({ ...s, bookingMode })),
      completeAppointment: (id) => update(id, (a) => ({ ...a, status: 'concluido' })),
      cancelAppointment: (id) => update(id, (a) => ({ ...a, status: 'cancelado' })),
      registerPayment: (id, method) =>
        update(id, (a) => ({ ...a, payment: { status: 'pago', method, online: false } })),
    }),
    [settings, appointments, update],
  );

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda() {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda precisa estar dentro de <AgendaProvider>');
  return ctx;
}
