import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount } from '@/features/account/account-context';
import { SITE_URL, slugError, slugify } from '@/lib/slug';
import { supabase } from '@/lib/supabase';
import { useSlugAvailability } from '@/lib/use-slug-availability';

/** Primeiro passo: nome e endereço do link público. Depois vem a configuração da agenda e dos serviços. */
export default function OnboardingScreen() {
  const { account, reload, signOut } = useAccount();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatError = slug ? slugError(slug) : null;

  const availability = useSlugAvailability(slug);

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
        setError('Este endereço acabou de ser usado. Escolha outro.');
      } else {
        setError('Não foi possível criar sua barbearia. Tente de novo.');
      }
      return;
    }

    await reload(); // a conta passa a "pronta" e o app abre a configuração inicial
    setBusy(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <AppText variant="label">Passo 1 de 4</AppText>
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

          <Button label={busy ? 'Criando…' : 'Continuar'} disabled={!canSubmit} onPress={submit} />
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
