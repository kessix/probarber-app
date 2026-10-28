import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

type Client = { id: string; name: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BloqueadosScreen() {
  const shop = useShop();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('barbershop_id', shop.id)
      .eq('blocked', true)
      .order('name')
      .returns<Client[]>();
    if (error) throw error;
    return data;
  }, [shop.id]);
  const { data: blocked, error, reload } = useRemote(load);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function unblock(client: Client) {
    setBusy(true);
    const { error: err } = await supabase.from('clients').update({ blocked: false }).eq('id', client.id);
    setBusy(false);
    if (err) Alert.alert('Não foi possível desbloquear', 'Tente de novo.');
    else reload();
  }

  async function blockByEmail() {
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) return Alert.alert('E-mail inválido', 'Digite o e-mail do cliente.');
    setBusy(true);
    // Cliente que já agendou: só marca como bloqueado. Quem nunca agendou entra na lista já bloqueado.
    const updated = await supabase
      .from('clients')
      .update({ blocked: true })
      .eq('barbershop_id', shop.id)
      .eq('email', address)
      .select('id');
    let failed = !!updated.error;
    if (!failed && (updated.data ?? []).length === 0) {
      const local = address.split('@')[0];
      const created = await supabase.from('clients').insert({
        barbershop_id: shop.id,
        name: local.length >= 2 ? local.slice(0, 80) : 'Cliente',
        email: address,
        blocked: true,
      });
      failed = !!created.error;
    }
    setBusy(false);
    if (failed) return Alert.alert('Não foi possível bloquear', 'Tente de novo.');
    setEmail('');
    reload();
  }

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <AppText variant="label">Configurações</AppText>
            <AppText variant="display">Clientes bloqueados</AppText>
            <AppText variant="body" muted>
              Clientes bloqueados não conseguem agendar pelo seu link. Para bloquear alguém que já agendou, abra o
              agendamento na Agenda.
            </AppText>
          </View>

          <View style={{ gap: Spacing.two }}>
            <TextField
              label="Bloquear por e-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Exemplo: cliente@email.com"
            />
            <Button label="Bloquear cliente" variant="ghost" disabled={busy || email.length < 5} onPress={blockByEmail} />
          </View>

          {error ? (
            <AppText variant="caption">Não foi possível carregar a lista.</AppText>
          ) : !blocked ? (
            <AppText variant="caption">Carregando…</AppText>
          ) : blocked.length === 0 ? (
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              Nenhum cliente bloqueado.
            </AppText>
          ) : (
            <View style={{ gap: Spacing.two }}>
              {blocked.map((client) => (
                <Card key={client.id} style={{ gap: Spacing.three }}>
                  <View>
                    <AppText variant="title">{client.name}</AppText>
                    <AppText variant="caption">{client.email}</AppText>
                  </View>
                  <Button variant="ghost" label="Desbloquear" disabled={busy} onPress={() => void unblock(client)} />
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
});
