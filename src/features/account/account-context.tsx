import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import type { BookingMode } from '@/features/agenda/types';
import { supabase } from '@/lib/supabase';

export type Shop = { id: string; slug: string; name: string; bookingMode: BookingMode };

/**
 * Onde o barbeiro está no app:
 * - signedOut: sem login -> tela de entrada
 * - needsShop: logado, mas ainda sem barbearia -> cadastro
 * - ready: logado e com barbearia -> app
 */
export type Account =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'needsShop'; userId: string; email: string }
  | { status: 'ready'; userId: string; email: string; shop: Shop };

type AccountContextValue = {
  account: Account;
  /** Recarrega a barbearia (depois do cadastro). */
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  updateBookingMode: (mode: BookingMode) => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

type ShopRow = { id: string; slug: string; name: string; booking_mode: BookingMode };

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account>({ status: 'loading' });
  // Só a carga mais recente pode escrever no estado (entrar e sair em sequência).
  const loadId = useRef(0);

  const load = useCallback(async (session: Session | null) => {
    const id = ++loadId.current;
    if (!session) {
      setAccount({ status: 'signedOut' });
      return;
    }
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, slug, name, booking_mode')
      .eq('owner_id', session.user.id)
      .maybeSingle<ShopRow>();
    if (id !== loadId.current) return;

    const email = session.user.email ?? '';
    if (error) {
      Alert.alert('Não foi possível carregar sua conta', 'Verifique a internet e abra o app de novo.');
      setAccount({ status: 'signedOut' });
    } else if (!data) {
      setAccount({ status: 'needsShop', userId: session.user.id, email });
    } else {
      setAccount({
        status: 'ready',
        userId: session.user.id,
        email,
        shop: { id: data.id, slug: data.slug, name: data.name, bookingMode: data.booking_mode },
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // O supabase-js pede para não chamar o cliente dentro deste callback: adia para o próximo ciclo.
      setTimeout(() => void load(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      reload: async () => {
        const { data } = await supabase.auth.getSession();
        await load(data.session);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      updateBookingMode: async (mode) => {
        if (account.status !== 'ready') return;
        const { error } = await supabase
          .from('barbershops')
          .update({ booking_mode: mode })
          .eq('id', account.shop.id);
        if (error) {
          Alert.alert('Não foi possível salvar', 'Tente de novo.');
          return;
        }
        setAccount({ ...account, shop: { ...account.shop, bookingMode: mode } });
      },
    }),
    [account, load],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount precisa estar dentro de <AccountProvider>');
  return ctx;
}

/** Barbearia do barbeiro logado. Só use em telas que existem com a conta pronta. */
export function useShop() {
  const { account } = useAccount();
  if (account.status !== 'ready') throw new Error('useShop fora de uma conta pronta');
  return account.shop;
}
