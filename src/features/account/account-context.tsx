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

export type Shop = {
  id: string;
  slug: string;
  name: string;
  bookingMode: BookingMode;
  /** Quantos dias à frente o cliente pode agendar (1 a 14), contando hoje. */
  bookingWindowDays: number;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  googleReviewUrl: string | null;
  /** Já terminou a configuração inicial (horário e serviços). */
  onboarded: boolean;
};

/** O que o barbeiro pode alterar na barbearia. */
export type ShopSettings = Omit<Shop, 'id' | 'onboarded'>;

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
  /** Salva campos da barbearia. Devolve false (e avisa o barbeiro) se o banco recusar. */
  updateShop: (patch: Partial<ShopSettings>) => Promise<boolean>;
  /** Marca a configuração inicial como concluída. */
  finishOnboarding: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

type ShopRow = {
  id: string;
  slug: string;
  name: string;
  booking_mode: BookingMode;
  booking_window_days: number;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  google_review_url: string | null;
  onboarded_at: string | null;
};

const SHOP_COLUMNS =
  'id, slug, name, booking_mode, booking_window_days, logo_url, phone, address, instagram, facebook, google_review_url, onboarded_at';

// Campo do app -> coluna do banco
const COLUMN_OF: Record<keyof ShopSettings, string> = {
  slug: 'slug',
  name: 'name',
  bookingMode: 'booking_mode',
  bookingWindowDays: 'booking_window_days',
  logoUrl: 'logo_url',
  phone: 'phone',
  address: 'address',
  instagram: 'instagram',
  facebook: 'facebook',
  googleReviewUrl: 'google_review_url',
};

function toShop(row: ShopRow): Shop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bookingMode: row.booking_mode,
    bookingWindowDays: row.booking_window_days,
    logoUrl: row.logo_url,
    phone: row.phone,
    address: row.address,
    instagram: row.instagram,
    facebook: row.facebook,
    googleReviewUrl: row.google_review_url,
    onboarded: row.onboarded_at !== null,
  };
}

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
      .select(SHOP_COLUMNS)
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
      setAccount({ status: 'ready', userId: session.user.id, email, shop: toShop(data) });
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
      finishOnboarding: async () => {
        if (account.status !== 'ready') return;
        const { error } = await supabase
          .from('barbershops')
          .update({ onboarded_at: new Date().toISOString() })
          .eq('id', account.shop.id);
        if (error) {
          Alert.alert('Não foi possível concluir', 'Tente de novo.');
          return;
        }
        setAccount((current) =>
          current.status === 'ready' ? { ...current, shop: { ...current.shop, onboarded: true } } : current,
        );
      },
      updateShop: async (patch) => {
        if (account.status !== 'ready') return false;
        const before = account.shop;
        // Atualiza a tela na hora e desfaz se o banco recusar.
        setAccount((current) =>
          current.status === 'ready' ? { ...current, shop: { ...current.shop, ...patch } } : current,
        );
        const columns = Object.fromEntries(
          Object.entries(patch).map(([field, value]) => [COLUMN_OF[field as keyof ShopSettings], value]),
        );
        const { error } = await supabase.from('barbershops').update(columns).eq('id', before.id);
        if (!error) return true;

        Alert.alert(
          'Não foi possível salvar',
          error.code === '23505' ? 'Este endereço do link já está em uso. Escolha outro.' : 'Tente de novo.',
        );
        // Volta só os campos que este toque mudou, sem apagar ajustes feitos em seguida.
        const previous = Object.fromEntries(
          Object.keys(patch).map((field) => [field, before[field as keyof ShopSettings]]),
        );
        setAccount((current) =>
          current.status === 'ready' ? { ...current, shop: { ...current.shop, ...previous } } : current,
        );
        return false;
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
