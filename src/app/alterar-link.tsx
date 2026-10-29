import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount, useShop } from '@/features/account/account-context';
import { SITE_URL, slugError, slugify } from '@/lib/slug';
import { useSlugAvailability } from '@/lib/use-slug-availability';

const host = SITE_URL.replace('https://', '');

/** Troca o endereço do link público da barbearia. */
export default function AlterarLinkScreen() {
  const shop = useShop();
  const { updateShop } = useAccount();
  const [slug, setSlug] = useState(shop.slug);
  const [saving, setSaving] = useState(false);

  const availability = useSlugAvailability(slug, shop.slug);
  const formatError = slug ? slugError(slug) : null;
  const unchanged = slug === shop.slug;
  const message = formatError ?? (availability === 'taken' ? 'Este endereço já está em uso. Escolha outro.' : null);
  const canSave = !unchanged && !!slug && !formatError && availability === 'free' && !saving;

  function confirmAndSave() {
    Alert.alert(
      'Trocar o endereço do link?',
      `O link antigo (${host}/${shop.slug}) deixa de funcionar. Quem salvou ou divulgou o link precisa receber o novo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Trocar',
          onPress: async () => {
            setSaving(true);
            const ok = await updateShop({ slug });
            setSaving(false);
            if (ok) router.back();
          },
        },
      ],
    );
  }

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <AppText variant="label">Meu link</AppText>
            <AppText variant="display">Alterar link</AppText>
            <AppText variant="body" muted>
              Escolha o endereço que seus clientes usam para agendar.
            </AppText>
          </View>

          <TextField
            label="Endereço do link"
            value={slug}
            onChangeText={(t) => setSlug(slugify(t))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Exemplo: doisirmaos"
            error={message}
            hint={
              availability === 'checking'
                ? 'Verificando…'
                : availability === 'free' && !formatError
                  ? `Disponível: ${host}/${slug}`
                  : `${host}/${slug || 'seu-endereco'}`
            }
          />

          <Button label={saving ? 'Salvando…' : 'Salvar novo link'} disabled={!canSave} onPress={confirmAndSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four },
});
