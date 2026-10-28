import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState } from 'react-native';

import { useAccount } from '@/features/account/account-context';
import { addDays, formatTime, startOfToday, toDateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import type {
  AgendaSettings,
  Appointment,
  AppointmentStatus,
  BookingMode,
  Payment,
  PaymentMethod,
} from './types';

type AgendaContextValue = {
  settings: AgendaSettings;
  appointments: Appointment[];
  refresh: () => Promise<void>;
  setBookingMode: (mode: BookingMode) => void;
  completeAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;
  /** Dá baixa em uma pendência: o barbeiro recebeu na barbearia. */
  registerPayment: (id: string, method: PaymentMethod) => void;
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

type Row = {
  id: string;
  starts_at: string;
  client_name: string;
  service_name: string;
  price_cents: number;
  status: AppointmentStatus;
  payment_status: 'nao_aplicavel' | 'pendente' | 'pago';
  payment_method: PaymentMethod | null;
  payment_online: boolean;
};

const COLUMNS =
  'id, starts_at, client_name, service_name, price_cents, status, payment_status, payment_method, payment_online';

// Pendências antigas ainda precisam aparecer, então a agenda carrega os últimos 30 dias.
const HISTORY_DAYS = 30;

function toPayment(row: Row): Payment {
  if (row.payment_status === 'pago') {
    return { status: 'pago', method: row.payment_method ?? 'pix', online: row.payment_online };
  }
  if (row.payment_status === 'pendente') return { status: 'pendente', online: row.payment_online };
  return { status: row.payment_status };
}

function fromRow(row: Row): Appointment {
  const start = new Date(row.starts_at);
  return {
    id: row.id,
    date: toDateKey(start),
    time: formatTime(start),
    clientName: row.client_name,
    service: row.service_name,
    price: row.price_cents / 100,
    status: row.status,
    payment: toPayment(row),
  };
}

/** Busca a agenda da barbearia. Devolve null (e avisa o barbeiro) se falhar. */
async function fetchAppointments(shopId: string): Promise<Appointment[] | null> {
  const since = addDays(startOfToday(), -HISTORY_DAYS).toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .select(COLUMNS)
    .eq('barbershop_id', shopId)
    .gte('starts_at', since)
    .order('starts_at')
    .returns<Row[]>();
  if (error) {
    Alert.alert('Não foi possível carregar a agenda', 'Verifique a internet e puxe a tela para atualizar.');
    return null;
  }
  return data.map(fromRow);
}

/** A agenda é da barbearia do barbeiro logado. Remonte com `key` ao trocar de barbearia. */
export function AgendaProvider({ children }: { children: ReactNode }) {
  const { account, updateBookingMode } = useAccount();
  const shop = account.status === 'ready' ? account.shop : null;
  const shopId = shop?.id ?? null;
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const refresh = useCallback(async () => {
    if (!shopId) return;
    const rows = await fetchAppointments(shopId);
    if (rows) setAppointments(rows);
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    const load = () =>
      fetchAppointments(shopId).then((rows) => {
        if (active && rows) setAppointments(rows);
      });
    void load();
    // Agendamentos novos chegam pelo site: recarrega quando o app volta ao primeiro plano.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [shopId]);

  const mutate = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const { error } = await supabase.from('appointments').update(patch).eq('id', id);
      if (error) {
        Alert.alert('Não foi possível salvar', 'Tente de novo.');
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AgendaContextValue>(
    () => ({
      settings: { bookingMode: shop?.bookingMode ?? 'comum' },
      appointments,
      refresh,
      setBookingMode: (mode) => void updateBookingMode(mode),
      completeAppointment: (id) => void mutate(id, { status: 'concluido' }),
      cancelAppointment: (id) => void mutate(id, { status: 'cancelado' }),
      registerPayment: (id, method) =>
        void mutate(id, { payment_status: 'pago', payment_method: method, payment_online: false }),
    }),
    [shop?.bookingMode, appointments, refresh, updateBookingMode, mutate],
  );

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda() {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda precisa estar dentro de <AgendaProvider>');
  return ctx;
}
