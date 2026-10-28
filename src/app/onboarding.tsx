import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount } from '@/features/account/account-context';
import { SITE_URL, slugError, slugify } from '@/lib/slug';
import { supabase } from '@/lib/supabase';

// Serviços iniciais; o barbeiro ajusta depois.
const DEFAULT_SERVICES = [
  { name: 'Corte', price_cents: 4500, duration_minutes: 40 },
  { name: 'Barba', price_cents: 3500, duration_minutes: 30 },
  { name: 'Corte + barba', price_cents: 7000, duration_minutes: 70 },
];

type Availability = 'idle' | 'checking' | 'free' | 'taken';

/** Cadastro da barbearia: nome e endereço do link público. */
export default function OnboardingScreen() {
  const { account, reload, signOut } = useAccount();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatError = slug ? slugError(slug) : null;

  // Confere no banco se o endereço está livre, esperando o barbeiro parar de digitar.
  useEffect(() => {
    if (!slug || slugError(slug)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAvailability('checking');
      const { data, error: err } = await supabase.from('barbershops').select('id').eq('slug', slug).maybeSingle();
      if (cancelled) return;
      setAvailability(err ? 'idle' : data ? 'taken' : 'free');
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  function onName(text: string) {
    setName(text);
    if (!slugTouched) setSlug(slugify(text));
  }

  const slugMessage =
    formatError ??
    (availability === 'taken' ? 'Este endereço já está em uso. Escolha outro.' : null);
  const canSubmit =
    name.trim().length >= 2 && !!slug && !formatError && availability === 'free' && !busy && account.status === 'needsShop';

  async function submit() {
    if (account.status !== 'needsShop') return;
    setBusy(true);
    setError(null);

    const { data: shop, error: shopErr } = await supabase
      .from('barbershops')
      .insert({ owner_id: account.userId, slug, name: name.trim() })
      .select('id')
      .single();
    if (shopErr || !shop) {
      setBusy(false);
      if (shopErr?.code === '23505') {
        setAvailability('taken');
        setError('Este endereço acabou de ser usado. Escolha outro.');
      } else {
        setError('Não foi possível criar sua barbearia. Tente de novo.');
      }
      return;
    }

    const { error: servicesErr } = await supabase
      .from('services')
      .insert(DEFAULT_SERVICES.map((s) => ({ ...s, barbershop_id: shop.id })));
    if (servicesErr) console.warn('Serviços iniciais não foram criados', servicesErr.message);

    await reload(); // a conta passa a "pronta" e o app abre a Agenda
    setBusy(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <AppText variant="label">Quase lá</AppText>
            <AppText variant="display">Sua barbearia</AppText>
            <AppText variant="body" muted>
              Esse é o nome que seus clientes veem e o endereço do seu link de agendamento.
            </AppText>
          </View>

          <TextField
            label="Nome da barbearia"
            value={name}
            onChangeText={onName}
            placeholder="Exemplo: Barbearia Dois Irmãos"
            autoCapitalize="words"
            maxLength={80}
          />

          <TextField
            label="Endereço do link"
            value={slug}
            onChangeText={(t) => {
              setSlugTouched(true);
              setSlug(slugify(t));
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Exemplo: doisirmaos"
            error={slugMessage}
            hint={
              availability === 'checking'
                ? 'Verificando…'
                : availability === 'free' && !formatError
                  ? `Disponível: ${SITE_URL.replace('https://', '')}/${slug}`
                  : `${SITE_URL.replace('https://', '')}/${slug || 'seu-endereco'}`
            }
          />

          {error ? (
            <AppText variant="caption" style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <Button label={busy ? 'Criando…' : 'Criar minha barbearia'} disabled={!canSubmit} onPress={submit} />
          <Button variant="ghost" label={`Sair (${account.status === 'needsShop' ? account.email : ''})`} onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingTop: Spacing.five, gap: Spacing.four },
  error: { color: '#e0746b' },
});
